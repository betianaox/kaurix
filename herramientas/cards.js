/**
 * Deja las cartas del álbum todas del mismo tamaño y peso.
 *
 *   node herramientas/cards.js
 *
 * Trabaja sobre `assets/cards/` en el lugar: lee cada `SS-NN.webp` —serie y
 * número—, la lleva a la medida común y la vuelve a escribir.
 *
 * ## Por qué hace falta
 *
 * Las cartas llegan como salen del generador, y ahí cada una viene con la
 * resolución que quiso: en la primera serie ocho eran de 480×865 y una de
 * 1270×2289, que pesaba tres veces más que las otras ocho juntas. En una hoja
 * las nueve se dibujan del mismo tamaño, así que la grande no se ve mejor: solo
 * ocupa más en el APK y más memoria al decodificar.
 *
 * ## Recomprimir
 *
 * Con `--recomprimir` vuelve a pasar por el compresor incluso las que ya están
 * en medida. Las cartas se exportan desde Photoshop con su perfil de calidad,
 * que es el de una imagen para imprimir: la primera serie completa pesaba tres
 * veces lo que necesita una pantalla de teléfono. A calidad 78 la diferencia no
 * se ve y el APK adelgaza varios megas.
 *
 * **Es destructivo**: pisa el archivo. El original vive en Photoshop, así que
 * volver a exportar es siempre la salida si algo quedó feo.
 *
 * ## La medida
 *
 * `ANCHO × ALTO` es el naipe a la resolución que necesita la carta **abierta en
 * grande**, que es donde más grande se la ve. En la hoja se dibuja mucho más
 * chica y le sobra.
 *
 * No se recorta ni se rellena: las cartas ya vienen con la proporción del
 * naipe, así que solo se escalan. Si alguna viniera con otra forma, el `fit`
 * la mete adentro sin deformarla y se va a notar como un borde: eso es una
 * carta mal exportada, no algo para arreglar acá.
 */

const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const CARPETA = path.join(__dirname, '..', 'assets', 'cards');

/** Pasa por el compresor también las que ya están en medida. */
const RECOMPRIMIR = process.argv.includes('--recomprimir');

/** La medida común. Es la proporción del naipe: ver `RATIO` en `cards.ts`. */
const ANCHO = 500;
const ALTO = 762;

/**
 * Las cartas son ilustraciones, no siluetas: la calidad se nota y el peso
 * también. 78 es donde deja de notarse a ojo en una pantalla de teléfono.
 */
const CALIDAD = 78;

async function main() {
  if (!fs.existsSync(CARPETA)) {
    console.error(`Falta ${CARPETA}`);
    process.exit(1);
  }

  const archivos = fs
    .readdirSync(CARPETA)
    .filter((f) => /^\d\d-\d\d\.webp$/.test(f))
    .sort();

  if (!archivos.length) {
    console.error('No hay cartas con la forma SS-NN.webp');
    process.exit(1);
  }

  for (const archivo of archivos) {
    const ruta = path.join(CARPETA, archivo);

    /**
     * El archivo entra **desde memoria**, nunca por su ruta.
     *
     * Con `sharp(ruta)` la librería se queda con el archivo abierto —incluso
     * solo para leerle los datos— y escribir encima falla con un error de
     * sistema que no dice cuál es el problema. Leyendo el buffer primero, el
     * archivo queda libre y se puede pisar.
     */
    const original = fs.readFileSync(ruta);
    const antes = await sharp(original).metadata();

    if (!RECOMPRIMIR && antes.width === ANCHO && antes.height === ALTO) {
      console.log(`  ${archivo}: ya estaba`);
      continue;
    }

    const salida = await sharp(original)
      .resize(ANCHO, ALTO, { fit: 'inside', withoutEnlargement: false })
      .webp({ quality: CALIDAD })
      .toBuffer();

    fs.writeFileSync(ruta, salida);

    console.log(
      `  ${archivo}: ${antes.width}×${antes.height} ${(original.length / 1024).toFixed(0)} kB` +
        ` → ${ANCHO}×${ALTO} ${(salida.length / 1024).toFixed(0)} kB`
    );
  }
}

main().catch((e) => {
  console.error(e.message);
  process.exit(1);
});
