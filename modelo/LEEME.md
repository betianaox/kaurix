# El modelo del reconocedor

Acá vive lo que hace falta para entrenar el modelo propio de Kaurix: qué tiene
que aprender, de dónde salen las fotos y cómo se arma el archivo que va adentro
de la app.

## Qué hay

| | |
|---|---|
| `clases.json` | Las 55 clases y de qué etiqueta de Open Images sale cada una. |
| `entrenar.ipynb` | El cuaderno de Colab: baja, entrena y exporta. |

El resultado final es un `modelo.tflite` que va a
`modules/reconocedor/android/src/main/assets/`. El módulo nativo lo detecta
solo y no hay que tocar código: si el archivo está, usa ese; si no, cae en el
modelo base de ML Kit. Ver `ReconocedorModule.kt`.

## Por qué 55 clases y no 74

Porque el modelo aprende **lo que se puede ver**. Los veinticinco ingredientes
que no tienen clase propia no son los que no llegamos a entrenar: son los que no
se distinguen mirando.

- **Despensa (12).** Harina, azúcar y sal son polvo blanco en un frasco. No hay
  forma de separarlas con una cámara, y entrenar tres clases que se pisan no
  falla solo en esas tres: ensucia el clasificador entero.
- **Gemas (9).** Ningún modelo distingue amatista de citrino en la cámara de un
  teléfono. Se resuelven por escena —`piedras`, `ladrillo`, `arena`— y color.
- **Carne (3 de 7).** El corte, la luz y el envase cambian más que el tipo de
  carne: una bandeja de picada y una de desmenuzada se parecen más entre sí que
  dos fotos de la misma picada. Bife, picada y desmenuzada comparten
  `carne-roja` y el color desempata.
- **Tofu.** Es un cubo blanco en un envase: sale por `alacena` y color.

El razonamiento largo, ingrediente por ingrediente, está en
`docs/kaurix-clases-del-modelo.md`, fuera del repo.

## De dónde salen las fotos

De **Open Images v7**, que son fotos de gente en escenas reales y no productos
sobre fondo blanco. Eso importa: un dataset de catálogo entrena un modelo que
anda en el catálogo y falla en una cocina, que es exactamente donde se juega.

Las 55 clases están verificadas contra el listado real de Open Images: ninguna
quedó sin correspondencia. Algunas necesitan más de una búsqueda —`carne-roja`
sale de *Steak* y *Beef*, `alacena` de *Pantry* y *Cupboard*—.

**22 de las 55 tienen recuadro** y ahí la foto se recorta a la caja, así el
objeto llena el cuadro como lo ve la cámara cuando le apuntás. Las otras 33 van
enteras y se apoyan en los recortes al azar del entrenamiento. Es una asimetría
real y conviene tenerla presente al leer los resultados: esas 22 parten con
ventaja.

## Lo que el cuaderno no mide, y hay que medir aparte

El acierto que reporta sale de fotos de Open Images, o sea del mismo pozo del
que salió el entrenamiento. Dice que aprendió lo que se le mostró, **no** que
ande apuntando un teléfono a una mesada.

Para saber eso hacen falta unas pocas fotos propias —veinte por clase de las que
más importan— sacadas con el teléfono, en una cocina, con la luz de siempre. La
última celda del cuaderno las evalúa. Si el número cae mucho, esa caída **es** la
brecha entre la foto descargada y la foto real, y ahí se decide: más aumentos,
más fotos propias, o sacar las clases que no se sostienen y resolverlas por
escena y color, como ya se hace con las gemas.

Medirlo es la parte que no se puede saltear. Un modelo del que solo se sabe el
número contra su propio dataset es un modelo del que no se sabe nada.

## Cuando el modelo esté

1. El `.tflite` va a `modules/reconocedor/android/src/main/assets/modelo.tflite`.
2. Se recompila: `npx expo run:android`.
3. Al arrancar, `mirar.ts` escribe en la consola de Metro cuál quedó:
   `[mirar] etiquetador: sí · modelo: propio · color: sí`.
4. Se enciende `RECONOCEDOR_MANDA` en `src/flags.ts`, que hasta entonces está
   apagado justamente porque con el modelo base no hay nada que probar.
5. Se reescribe `src/buscar/objetivos.ts`: las 74 entradas pasan a pedir clases
   por nombre en vez de escena y color. `etiquetas.ts` queda como red de
   seguridad para cuando el modelo devuelve algo genérico.

Los pasos 4 y 5 son los que convierten esto en el juego que se quería hacer.
