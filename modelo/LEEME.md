# El modelo del reconocedor

Acá vive lo que hace falta para entrenar el modelo propio de Kaurix: qué tiene
que aprender, de dónde salen las fotos y cómo se arma el archivo que va adentro
de la app. Todo corre en esta computadora, sin Colab.

## Qué hay

| | |
|---|---|
| `clases.json` | Las clases: de qué fuentes sale cada una, cómo se la describe para filtrar y qué ingredientes del juego cubre. |
| `fotos.py` | Junta fotos candidatas de Open Images y de iNaturalist. |
| `filtrar.py` | Se queda, de las candidatas, con las que de verdad muestran la cosa. |
| `entrenar.py` | Entrena, exporta el `.tflite` y lo mide con fotos propias. |

El resultado es un `modelo.tflite` que va a
`modules/reconocedor/android/src/main/assets/`. El módulo nativo lo detecta
solo: si el archivo está, usa ese; si no, cae en el modelo base de ML Kit. Ver
`ReconocedorModule.kt`.

## Cómo se corre

Dos entornos, a propósito. El de entrenar necesita Python 3.9, porque
`tflite-support` —lo que escribe los metadatos que ML Kit lee— no tiene versión
para Windows después de la 0.4.3. El de filtrar usa PyTorch, que sí usa la placa
de video en Windows; TensorFlow dejó de usarla en Windows después de la 2.10.

```sh
# una vez
uv venv --python 3.9 .venv
uv pip install --python .venv/Scripts/python.exe tensorflow==2.15.1 tflite-support==0.4.3 pillow
uv venv --python 3.11 .venv-clip
uv pip install --python .venv-clip/Scripts/python.exe torch torchvision --index-url https://download.pytorch.org/whl/cu124
uv pip install --python .venv-clip/Scripts/python.exe open_clip_torch pillow

# cada vez
.venv/Scripts/python.exe fotos.py               # horas la primera vez; retoma si se corta
.venv-clip/Scripts/python.exe filtrar.py        # minutos
.venv/Scripts/python.exe entrenar.py entrenar   # unos 12 minutos en el procesador
.venv/Scripts/python.exe entrenar.py exportar
.venv/Scripts/python.exe entrenar.py propias    # con fotos en propias/<clase>/
```

Nada de lo que producen va al repo: `cache/` (las listas de Open Images, unos
10 GB), `candidatas/`, `datos/`, `salida/` y `propias/` están en el
`.gitignore`.

## Qué aprende, y qué no

El modelo aprende **lo que se puede ver**. Los ingredientes sin clase propia no
son los que no llegamos a entrenar: son los que no se distinguen mirando, o los
que no tienen fotos en ningún lado.

- **Despensa (12).** Harina, azúcar y sal son polvo blanco en un frasco.
  Entrenar tres clases que se pisan ensucia el clasificador entero.
- **Gemas (9).** Ningún modelo distingue amatista de citrino en la cámara de un
  teléfono. Se resuelven por escena —`piedras`, `ladrillo`, `arena`— y color.
- **Tofu.** Un cubo blanco en un envase: sale por `alacena` y color.
- **Varias en una clase**, donde la foto no alcanza para separarlas. Lo dice el
  campo `cubre` de `clases.json`, y el juego rota entre ellas:
  - `carne-roja`: bife, picada y desmenuzada. El color desempata.
  - `hoja-verde`: espinaca, kale, lechuga y apio. Casi no hay fotos de cada una
    por separado, y juntas son la clase general "Leaf vegetable".
  - `hibisco`: rojo y violeta. Es la misma flor; el color desempata.
- **Sin fotos suficientes.** Jengibre: menos de treinta usables entre todas las
  fuentes. Se resuelve por escena y color, como las gemas.

## De dónde salen las fotos

Tres fuentes, en orden de confianza:

1. **Open Images v7, verificada por personas.** Fotos de gente en escenas
   reales, no productos sobre fondo blanco: un dataset de catálogo anda en el
   catálogo y falla en una cocina, que es donde se juega. Con recuadro, la foto
   se recorta a la caja —dos recortes por foto como mucho— y se descartan los
   dibujos.
2. **Open Images, etiquetada por máquina**, solo con confianza de 0,9 o más.
   Muchas más fotos y con errores.
3. **iNaturalist**, solo fotos CC0 o CC-BY. Plantas donde crecen: sirven para
   hierbas y flores, que el juego busca justamente en plantas, y de relleno
   para frutas que casi no están en Open Images.

Cada foto elegida queda anotada en `datos/<clase>/fuentes.jsonl` con su origen,
licencia y autor.

### Lo que salió mal antes, para no repetirlo

- **fiftyone no sirve para esto.** Solo conoce las 601 clases de Open Images con
  recuadro, y cuando se le pide otra no falla: avisa "Ignoring invalid classes"
  y baja fotos cualquiera. El cuaderno de Colab que había acá lo usaba, y 33 de
  las 55 clases originales habrían entrenado con fotos al azar. Por eso se
  borró.
- **Que una etiqueta exista no quiere decir que tenga fotos.** Kiwi, apio o
  salvia estaban en la lista de Open Images con cero, cinco o siete fotos.
- **Las etiquetas mienten.** "Chicken" es la gallina viva, "Kiwi" es el pájaro,
  "Rock" trae montañas y "Onion" trae mercados enteros.

## El filtro

`filtrar.py` usa CLIP, un modelo que compara una imagen con un texto, para
preguntarle a cada candidata a cuál clase se parece más. Solo elige fotos: no va
en la app ni en el modelo.

- Cada clase se describe con **varios textos** (`clip` en `clases.json`). Uno
  solo es frágil: para CLIP, "chicken" es el animal.
- Todas las clases compiten a la vez, más unos **descartes** —dibujos,
  capturas, follaje sin flor— y los propios de cada clase (`clip_no`): la
  gallina viva para el pollo, el limón para la lima.
- Una foto entra si su clase gana y se lleva al menos la mitad de la
  probabilidad (`seguridad`, más alta donde las fuentes traen más ruido), y si no
  es casi igual a otra que ya entró.
- De cada clase deja `salida/revision/<clase>.jpg`: las últimas que entraron y
  las primeras que quedaron afuera. **Hay que mirarlas**: si arriba hay basura,
  el corte está flojo.

## Lo que el acierto no mide, y hay que medir aparte

El acierto que da `entrenar` sale de las mismas fuentes que el entrenamiento.
Dice que aprendió lo que se le mostró, **no** que ande apuntando un teléfono a
una mesada.

Para eso hacen falta fotos propias —veinte por clase de las que más importan—
sacadas con el teléfono, en una cocina, con la luz de siempre, en
`propias/<clase>/`. `entrenar.py propias` las evalúa. Si el número cae mucho,
esa caída **es** la brecha entre la foto descargada y la real, y ahí se decide:
más aumentos, más fotos propias, o resolver por escena y color las clases que no
se sostienen.

Un modelo del que solo se sabe el número contra su propio dataset es un modelo
del que no se sabe nada.

## Cuando el modelo esté

1. El `.tflite` va a `modules/reconocedor/android/src/main/assets/modelo.tflite`.
2. Se recompila: `npx expo run:android`.
3. Al arrancar, `mirar.ts` escribe en la consola de Metro cuál quedó:
   `[mirar] etiquetador: sí · modelo: propio · color: sí`.
4. Se enciende `RECONOCEDOR_MANDA` en `src/flags.ts`.
5. Se reescribe `src/buscar/objetivos.ts` para que cada ingrediente pida su
   clase por nombre, usando `cubre` para los que comparten clase.
   `etiquetas.ts` queda como red para cuando el modelo no está seguro.
