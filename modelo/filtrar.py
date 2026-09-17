"""
Elige, de las candidatas, las fotos que de verdad muestran la cosa.

    .venv-clip/Scripts/python.exe filtrar.py            # todas las clases
    .venv-clip/Scripts/python.exe filtrar.py --solo pollo

Corre en `.venv-clip` y no en `.venv`: usa PyTorch, que sí usa la placa en
Windows, y Python 3.11. El entrenamiento necesita 3.9 por `tflite-support`, así
que son dos entornos a propósito.

## Qué hace

Las fuentes traen ruido que no se puede revisar a mano en miles de fotos:
"Chicken" en Open Images es la gallina viva, "Onion" trae ensaladas y hasta
capturas de páginas web, y las etiquetas por máquina confunden manzanilla con
margarita. CLIP es un modelo que compara una imagen con un texto, y con eso se
le pregunta a cada foto a cuál de las clases se parece más.

Una foto queda si:

1. **Su clase es la que gana** entre todas las clases y un puñado de
   descartes explícitos —dibujos, capturas, la gallina viva—. Compitiendo
   contra las otras clases, una foto de ensalada etiquetada "cebolla" se va
   sola a `hoja-verde` y deja de contar.
2. **No es casi igual a otra que ya quedó.** El mismo frutero recortado dos
   veces, o la misma planta subida dos veces a iNaturalist, enseña esa foto y no
   la clase.

De las que pasan se toman las más seguras, hasta `POR_CLASE`.

CLIP se usa solo para elegir fotos: no va en la app ni en el modelo.

## Lo que deja para mirar

`salida/revision/<clase>.jpg`: arriba, las últimas que entraron —las más
dudosas de las elegidas—; abajo, las primeras que quedaron afuera. Si arriba hay
basura, el corte está flojo; si abajo hay fotos buenas, está duro.
"""

import argparse
import json
import shutil
import sys
from pathlib import Path

import numpy as np
import open_clip
import torch
from PIL import Image, ImageDraw

sys.stdout.reconfigure(encoding="utf-8")

AQUI = Path(__file__).resolve().parent
CANDIDATAS = AQUI / "candidatas"
DATOS = AQUI / "datos"
REVISION = AQUI / "salida" / "revision"

POR_CLASE = 500

# Con menos que esto la clase no se entrena: se resuelve por escena y color.
# El desbalance con las de 500 lo compensa el entrenamiento con pesos por clase.
MINIMO = 45

# Cuánta de la probabilidad tiene que quedar en los textos de la propia clase.
# Con cincuenta clases compitiendo, ganar con 0,2 es ganar por descarte.
SEGURIDAD = 0.5
# Una clase puede pedir más con `seguridad` en clases.json: las flores de
# iNaturalist, donde muchas fotos son la planta sin flor.

# Dos fotos con embeddings más parecidos que esto son la misma foto.
CASI_IGUAL = 0.95

LADO = 224

MODELO, PESOS = "ViT-L-14", "datacomp_xl_s13b_b90k"

# Lo que no es ninguna clase y aparece seguido en las fuentes.
DESCARTES = [
    "a photo of a live bird with feathers, like a hen or a rooster",
    "a photo of green foliage of a shrub or tree, with no flowers and no fruit",
    "a screenshot of a website or a document",
    "a drawing, cartoon or illustration",
    "a logo or text",
    "a photo of a group of people",
    "a photo of a landscape",
]


def cargar_clip(dispositivo):
    modelo, _, prepro = open_clip.create_model_and_transforms(MODELO, pretrained=PESOS, device=dispositivo)
    modelo.eval()
    return modelo, prepro, open_clip.get_tokenizer(MODELO)


@torch.no_grad()
def textos(modelo, tok, frases, dispositivo):
    t = modelo.encode_text(tok(frases).to(dispositivo))
    return torch.nn.functional.normalize(t.float(), dim=-1)


@torch.no_grad()
def imagenes(modelo, prepro, archivos, dispositivo, lote=64):
    salida = []
    for i in range(0, len(archivos), lote):
        x = torch.stack([prepro(Image.open(a).convert("RGB")) for a in archivos[i:i + lote]]).to(dispositivo)
        with torch.autocast("cuda", enabled=dispositivo == "cuda"):
            e = modelo.encode_image(x)
        salida.append(torch.nn.functional.normalize(e.float(), dim=-1).cpu())
    return torch.cat(salida) if salida else torch.zeros((0, 768))


def hoja(filas, titulo, destino):
    lado, cols = 112, 10
    alto = sum((len(f) + cols - 1) // cols for _, f in filas) * lado + 24 * len(filas)
    h = Image.new("RGB", (lado * cols, max(alto, 1)), (20, 20, 20))
    d = ImageDraw.Draw(h)
    y = 0
    for rotulo, archivos in filas:
        d.text((4, y + 4), rotulo, fill=(230, 230, 230))
        y += 24
        for k, a in enumerate(archivos):
            h.paste(Image.open(a).convert("RGB").resize((lado, lado)), ((k % cols) * lado, y + (k // cols) * lado))
        y += ((len(archivos) + cols - 1) // cols) * lado
    destino.parent.mkdir(parents=True, exist_ok=True)
    h.save(destino, quality=85)


def main():
    p = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    p.add_argument("--solo", nargs="*")
    p.add_argument("--por-clase", type=int, default=POR_CLASE)
    args = p.parse_args()

    clases = json.loads((AQUI / "clases.json").read_text(encoding="utf-8"))["clases"]
    nombres = [c["clase"] for c in clases]
    dispositivo = "cuda" if torch.cuda.is_available() else "cpu"
    modelo, prepro, tok = cargar_clip(dispositivo)
    # Cada clase tiene varios textos: uno solo es frágil. Para CLIP, "chicken" se
    # parece más al animal que a la comida, y con tres maneras de decirlo el
    # promedio se acomoda. Todos los textos de todas las clases compiten juntos.
    frases_de = []
    for k, c in enumerate(clases):
        frases_de += [(k, f) for f in c["clip"]]
    comunes = [(-1, f) for f in DESCARTES]

    resumen = {}
    for c in clases:
        nombre = c["clase"]
        if args.solo and nombre not in args.solo:
            continue
        origen = CANDIDATAS / nombre
        if not (origen / "listo").exists():
            print(f"  {nombre:<16} sin candidatas todavía", flush=True)
            continue
        registros = [json.loads(l) for l in open(origen / "fuentes.jsonl", encoding="utf-8")]
        archivos = [origen / r["archivo"] for r in registros]

        # Los embeddings se guardan: rehacer el corte no vuelve a pasar las fotos.
        cache = origen / f"clip-{MODELO}.npy"
        if cache.exists() and len(np.load(cache)) == len(archivos):
            emb = torch.from_numpy(np.load(cache))
        else:
            emb = imagenes(modelo, prepro, archivos, dispositivo)
            np.save(cache, emb.numpy())

        # Además de los descartes de siempre, los de esta clase: la gallina viva
        # para el pollo, el limón para la lima.
        propia = nombres.index(nombre)
        todas = frases_de + comunes + [(-2, f) for f in c.get("clip_no", [])]
        vec = textos(modelo, tok, [f for _, f in todas], dispositivo).cpu()
        dueno = torch.tensor([k for k, _ in todas])
        crudas = (100 * emb @ vec.T).softmax(dim=-1)
        # La probabilidad de cada clase es la suma de la de sus textos; los
        # descartes quedan como una clase más que nunca se elige.
        probs = torch.stack([crudas[:, dueno == k].sum(-1) for k in range(len(nombres))], dim=-1)
        otros = crudas[:, dueno < 0].sum(-1)
        gana = (probs.argmax(dim=-1) == propia) & (probs[:, propia] > otros)
        orden = torch.argsort(probs[:, propia], descending=True).tolist()

        elegidas, fuera = [], []
        for i in orden:
            if not gana[i] or probs[i, propia] < c.get("seguridad", SEGURIDAD):
                fuera.append(i)
                continue
            if elegidas and float((emb[elegidas] @ emb[i]).max()) > CASI_IGUAL:
                continue  # casi igual a una que ya está
            if len(elegidas) < c.get("por_clase", args.por_clase):
                elegidas.append(i)

        destino = DATOS / nombre
        destino.mkdir(parents=True, exist_ok=True)
        for f in destino.glob("*.jpg"):
            f.unlink()

        if len(elegidas) < MINIMO:
            print(f"  {nombre:<16} {len(elegidas):>4} de {len(archivos)}  QUEDA AFUERA (menos de {MINIMO})", flush=True)
            # Una carpeta vacía igual cuenta como clase para Keras: se borra entera.
            shutil.rmtree(destino)
            resumen[nombre] = {"elegidas": len(elegidas), "candidatas": len(archivos), "afuera": True}
        else:
            with open(destino / "fuentes.jsonl", "w", encoding="utf-8") as f:
                for k, i in enumerate(elegidas):
                    archivo = f"{k:04d}.jpg"
                    Image.open(archivos[i]).convert("RGB").resize((LADO, LADO)).save(destino / archivo, quality=90)
                    r = dict(registros[i], archivo=archivo, clip=round(float(probs[i, propia]), 3))
                    f.write(json.dumps(r, ensure_ascii=False) + "\n")
            por_fuente = {}
            for i in elegidas:
                por_fuente[registros[i]["fuente"]] = por_fuente.get(registros[i]["fuente"], 0) + 1
            print(f"  {nombre:<16} {len(elegidas):>4} de {len(archivos)}  {por_fuente}", flush=True)
            resumen[nombre] = {"elegidas": len(elegidas), "candidatas": len(archivos), "fuentes": por_fuente}

        # A dónde se fueron las que quedaron afuera: dice qué clase le roba fotos.
        ladrones = {}
        for i in fuera:
            j = int(crudas[i].argmax())
            quien = nombres[todas[j][0]] if todas[j][0] >= 0 else todas[j][1]
            ladrones[quien] = ladrones.get(quien, 0) + 1
        resumen[nombre]["se_van_a"] = dict(sorted(ladrones.items(), key=lambda x: -x[1])[:5])

        hoja(
            [
                (f"{nombre}: las ultimas 30 elegidas", [archivos[i] for i in elegidas[-30:]]),
                (f"{nombre}: las primeras 30 descartadas", [archivos[i] for i in fuera[:30]]),
            ],
            nombre,
            REVISION / f"{nombre}.jpg",
        )

    previo = AQUI / "salida" / "filtro.json"
    todo = json.loads(previo.read_text(encoding="utf-8")) if previo.exists() else {}
    todo.update(resumen)
    previo.write_text(json.dumps(todo, ensure_ascii=False, indent=2), encoding="utf-8")


if __name__ == "__main__":
    main()
