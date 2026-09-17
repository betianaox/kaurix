"""
Junta las fotos candidatas de cada clase, de tres fuentes.

    .venv/Scripts/python.exe fotos.py                 # todas las clases
    .venv/Scripts/python.exe fotos.py --solo kiwi     # una

Quedan en `candidatas/<clase>/`, con `fuentes.jsonl` al lado: de dónde salió
cada foto y con qué licencia. **Candidatas, no elegidas**: se junta de más a
propósito y después `filtrar.py` se queda con las que de verdad muestran la
cosa. Por eso acá no se descarta casi nada.

## Las tres fuentes, en orden de confianza

1. **Open Images, verificada por personas** (`oi` en `clases.json`). Con
   recuadro, se recorta a la caja; sin recuadro, va entera.
2. **Open Images, etiquetada por máquina** (`oi_maquina`), solo con confianza de
   0,9 o más. Son muchas más, y traen errores: una "manzanilla" puede ser una
   margarita. El filtro es lo que las vuelve usables.
3. **iNaturalist** (`inat`), solo fotos con licencia CC0 o CC-BY. Son plantas
   fotografiadas donde crecen: sirven para hierbas y flores, que el juego busca
   justamente en plantas, y como relleno para frutas que casi no están en Open
   Images.

## Por qué no fiftyone

fiftyone solo conoce las 601 clases de Open Images con recuadro, y cuando se le
pide otra no falla: avisa "Ignoring invalid classes" y baja fotos cualquiera.
Con el `clases.json` original, 33 de las 55 clases habrían entrenado con fotos
al azar sin que nada lo dijera.
"""

import argparse
import csv
import io
import json
import random
import sys
import time
import urllib.parse
import urllib.request
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

from PIL import Image

sys.stdout.reconfigure(encoding="utf-8")

AQUI = Path(__file__).resolve().parent
OI = AQUI / "cache" / "oi"
CANDIDATAS = AQUI / "candidatas"

# Cuántas candidatas por clase como mucho. Se eligen 500, y el filtro necesita
# margen para descartar.
TOPE = 1200

# Confianza mínima de las etiquetas por máquina. Por debajo de 0,9 el ruido crece
# más rápido que la cantidad.
CONFIANZA_MAQUINA = 0.9

# Una foto con un frutero lleno da diez recortes de manzana, y diez recortes del
# mismo frutero enseñan ese frutero. Dos por foto como mucho.
RECORTES_POR_FOTO = 2

# Lado mayor con que se guarda. Alcanza para CLIP y para entrenar a 224, y deja
# margen para recortar.
LADO_GUARDADO = 320

LISTAS = {
    "cajas": [
        ("train", "v6/oidv6-train-annotations-bbox.csv", "oidv6-train-annotations-bbox.csv"),
        ("validation", "v5/validation-annotations-bbox.csv", "oidv6-validation-annotations-bbox.csv"),
        ("test", "v5/test-annotations-bbox.csv", "oidv6-test-annotations-bbox.csv"),
    ],
    "enteras": [
        ("train", "v7/oidv7-train-annotations-human-imagelabels.csv", "oidv7-train-annotations-human-imagelabels.csv"),
        ("validation", "v7/oidv7-val-annotations-human-imagelabels.csv", "oidv7-val-annotations-human-imagelabels.csv"),
        ("test", "v7/oidv7-test-annotations-human-imagelabels.csv", "oidv7-test-annotations-human-imagelabels.csv"),
    ],
    "maquina": [
        ("train", "v7/oidv7-train-annotations-machine-imagelabels.csv", "oidv7-train-annotations-machine-imagelabels.csv"),
    ],
}

AGENTE = {"User-Agent": "kaurix-entrenamiento/1.0"}


def lista(url, archivo):
    destino = OI / archivo
    if not destino.exists():
        OI.mkdir(parents=True, exist_ok=True)
        print("bajando", url, flush=True)
        parcial = destino.with_suffix(".parcial")
        urllib.request.urlretrieve("https://storage.googleapis.com/openimages/" + url, parcial)
        parcial.rename(destino)
    return destino


# ─── Open Images ─────────────────────────────────────────────────────────────


def indice_oi(clases):
    """
    Qué fotos de Open Images tiene cada clase, por vía. Leer los CSV —casi diez
    GB— lleva unos minutos, así que queda guardado y solo se rehace si cambian
    los ids.
    """
    humanos, maquina = {}, {}
    for c in clases:
        for o in c["oi"]:
            humanos.setdefault(o["id"], []).append(c["clase"])
        for o in c["oi_maquina"]:
            maquina.setdefault(o["id"], []).append(c["clase"])

    firma = {"humanos": sorted(humanos), "maquina": sorted(maquina), "confianza": CONFIANZA_MAQUINA}
    guardado = OI / "indice-v1.json"
    if guardado.exists():
        previo = json.loads(guardado.read_text(encoding="utf-8"))
        if previo["firma"] == firma:
            return previo["clases"]

    indice = {c["clase"]: {"cajas": {}, "enteras": set(), "maquina": set()} for c in clases}

    for split, url, archivo in LISTAS["cajas"]:
        with open(lista(url, archivo), encoding="utf-8") as f:
            r = csv.reader(f)
            col = {n: i for i, n in enumerate(next(r))}
            for row in r:
                if row[2] not in humanos or row[col["IsDepiction"]] == "1":
                    continue  # un dibujo o un cartel con forma de banana no es una banana
                x0, x1 = float(row[col["XMin"]]), float(row[col["XMax"]])
                y0, y1 = float(row[col["YMin"]]), float(row[col["YMax"]])
                if x1 - x0 < 0.10 or y1 - y0 < 0.10:
                    continue  # cajas muy chicas dan recortes borrosos
                for clase in humanos[row[2]]:
                    indice[clase]["cajas"].setdefault(f"{split}/{row[0]}", []).append([x0, y0, x1, y1])

    for split, url, archivo in LISTAS["enteras"]:
        with open(lista(url, archivo), encoding="utf-8") as f:
            r = csv.reader(f)
            next(r)
            for row in r:
                if row[2] in humanos and row[3] == "1":  # 0 es "verificado que NO está"
                    for clase in humanos[row[2]]:
                        indice[clase]["enteras"].add(f"{split}/{row[0]}")

    for split, url, archivo in LISTAS["maquina"]:
        with open(lista(url, archivo), encoding="utf-8") as f:
            r = csv.reader(f)
            next(r)
            for row in r:
                if row[2] in maquina and float(row[3]) >= CONFIANZA_MAQUINA:
                    for clase in maquina[row[2]]:
                        indice[clase]["maquina"].add(f"{split}/{row[0]}")

    salida = {}
    for clase, v in indice.items():
        enteras = v["enteras"] - set(v["cajas"])
        salida[clase] = {
            "cajas": v["cajas"],
            "enteras": sorted(enteras),
            "maquina": sorted(v["maquina"] - enteras - set(v["cajas"])),
        }
    guardado.write_text(json.dumps({"firma": firma, "clases": salida}), encoding="utf-8")
    return salida


def traer(url):
    for intento in range(3):
        try:
            req = urllib.request.Request(url, headers=AGENTE)
            with urllib.request.urlopen(req, timeout=30) as r:
                return Image.open(io.BytesIO(r.read())).convert("RGB")
        except Exception:
            time.sleep(1 + intento)
    return None


def achicar(img):
    img = img.copy()
    img.thumbnail((LADO_GUARDADO, LADO_GUARDADO))
    return img


def recortes(img, cajas):
    W, H = img.size
    # Las más grandes primero: son las que mejor se ven.
    cajas = sorted(cajas, key=lambda b: (b[2] - b[0]) * (b[3] - b[1]), reverse=True)
    piezas = []
    for x0, y0, x1, y1 in cajas[:RECORTES_POR_FOTO]:
        # Un poco de aire: un recorte al ras no se parece a lo que se ve por la
        # cámara.
        ax, ay = (x1 - x0) * 0.12, (y1 - y0) * 0.12
        caja = (
            max(0, int((x0 - ax) * W)), max(0, int((y0 - ay) * H)),
            min(W, int((x1 + ax) * W)), min(H, int((y1 + ay) * H)),
        )
        if caja[2] - caja[0] > 40 and caja[3] - caja[1] > 40:
            piezas.append(img.crop(caja))
    return piezas


# ─── iNaturalist ─────────────────────────────────────────────────────────────


def pedidos_inat(taxon, cuantas):
    """
    Observaciones con foto CC0 o CC-BY. `verifiable` y no `research`: research
    deja afuera lo cultivado, y la albahaca o la palta casi siempre lo son.

    La API pide no pasar de un pedido por segundo.
    """
    pedidos, pagina = [], 1
    while len(pedidos) < cuantas and pagina <= 10:
        params = {
            "taxon_name": taxon, "photo_license": "cc0,cc-by", "verifiable": "true",
            "photos": "true", "per_page": 200, "page": pagina, "order_by": "votes",
        }
        url = "https://api.inaturalist.org/v1/observations?" + urllib.parse.urlencode(params)
        try:
            with urllib.request.urlopen(urllib.request.Request(url, headers=AGENTE), timeout=60) as r:
                resultados = json.load(r)["results"]
        except Exception as e:
            print(f"    inat {taxon} página {pagina}: {e}", flush=True)
            break
        time.sleep(1.1)
        if not resultados:
            break
        for obs in resultados:
            for foto in obs.get("photos", []):
                if foto.get("license_code") in ("cc0", "cc-by"):
                    pedidos.append({
                        "fuente": "inat",
                        "id": f"inat/{foto['id']}",
                        "url": foto["url"].replace("/square.", "/medium."),
                        "licencia": foto["license_code"],
                        "autor": foto.get("attribution", ""),
                        "pagina": f"https://www.inaturalist.org/observations/{obs['id']}",
                    })
                    break  # una por observación: fotos distintas, no la misma planta cinco veces
        pagina += 1
    return pedidos[:cuantas]


# ─── juntar ──────────────────────────────────────────────────────────────────


def juntar(c, indice):
    nombre = c["clase"]
    destino = CANDIDATAS / nombre
    listo = destino / "listo"
    if listo.exists():
        n = sum(1 for _ in open(destino / "fuentes.jsonl", encoding="utf-8"))
        print(f"  {nombre:<16} {n} (ya estaba)", flush=True)
        return n
    destino.mkdir(parents=True, exist_ok=True)
    for f in destino.glob("*.jpg"):
        f.unlink()

    azar = random.Random(nombre)
    pedidos = []

    oi = indice[nombre]
    con_caja = list(oi["cajas"].items())
    azar.shuffle(con_caja)
    for clave, cajas in con_caja:
        pedidos.append({"fuente": "oi", "id": f"oi/{clave}", "cajas": cajas})
    for via in ("enteras", "maquina"):
        claves = list(oi[via])
        azar.shuffle(claves)
        pedidos += [{"fuente": "oi" if via == "enteras" else "oi-maquina", "id": f"oi/{k}"} for k in claves]
    for p in pedidos:
        p["url"] = f"https://open-images-dataset.s3.amazonaws.com/{p['id'][3:]}.jpg"
        p["licencia"] = "cc-by-2.0"  # la licencia declarada de las imágenes de Open Images

    # iNaturalist llena lo que falte, y al menos un tercio si la clase lo tiene:
    # las plantas en su lugar son justo lo que Open Images no trae.
    if c["inat"]:
        lugar = max(TOPE - len(pedidos), TOPE // 3)
        por_taxon = lugar // len(c["inat"]) + 1
        for taxon in c["inat"]:
            pedidos += pedidos_inat(taxon, por_taxon)

    guardadas = []
    with ThreadPoolExecutor(16) as pool:
        while pedidos and len(guardadas) < TOPE:
            tanda, pedidos = pedidos[:64], pedidos[64:]
            for p, img in zip(tanda, pool.map(lambda p: traer(p["url"]), tanda)):
                if img is None or len(guardadas) >= TOPE:
                    continue
                piezas = recortes(img, p["cajas"]) if p.get("cajas") else [img]
                for k, pieza in enumerate(piezas):
                    archivo = f"{len(guardadas):05d}.jpg"
                    achicar(pieza).save(destino / archivo, quality=90)
                    registro = {kk: vv for kk, vv in p.items() if kk != "cajas"}
                    registro.update(archivo=archivo, recorte=k if p.get("cajas") else None)
                    guardadas.append(registro)

    with open(destino / "fuentes.jsonl", "w", encoding="utf-8") as f:
        for g in guardadas:
            f.write(json.dumps(g, ensure_ascii=False) + "\n")
    listo.write_text("")

    por_fuente = {}
    for g in guardadas:
        por_fuente[g["fuente"]] = por_fuente.get(g["fuente"], 0) + 1
    print(f"  {nombre:<16} {len(guardadas):>5}  {por_fuente}", flush=True)
    return len(guardadas)


def main():
    p = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    p.add_argument("--solo", nargs="*")
    args = p.parse_args()

    clases = json.loads((AQUI / "clases.json").read_text(encoding="utf-8"))["clases"]
    print("leyendo las listas de Open Images...", flush=True)
    indice = indice_oi(clases)
    if args.solo:
        clases = [c for c in clases if c["clase"] in args.solo]
    for c in clases:
        juntar(c, indice)


if __name__ == "__main__":
    main()
