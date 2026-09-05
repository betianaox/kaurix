/**
 * Saca del huevo animado un cuadro suelto, para mostrarlo quieto.
 *
 *   node herramientas/huevo-quieto.js
 *
 * Lee cada `assets/criaturas/NN-huevo.webp` —que son WebP animados de 48
 * cuadros— y escribe `NN-huevo-quieto.webp` con el mejor de todos.
 *
 * ## Por qué hace falta
 *
 * El huevo animado vuela, y eso es lo que tiene que hacer donde se lo
 * encuentra y en su ficha. Pero en **la evolución** —huevo, bebé, crecido, una
 * al lado de la otra— es una etapa de un camino terminado: aleteando al lado de
 * dos imágenes fijas se lleva toda la mirada, y lo que hay que mirar ahí es en
 * qué se convirtió la criatura.
 *
 * ## Cuál cuadro
 *
 * **El de las alas más abiertas**, no el primero.
 *
 * El primero es el huevo en reposo, con las alas plegadas contra el cascarón:
 * quieto se lee como un huevo cualquiera y se pierde lo único que lo hace
 * distinto. Con las alas abiertas se entiende de qué criatura es el huevo
 * incluso sin verla.
 *
 * Se elige midiendo y no a ojo: el ancho del recorte con alfa dice cuánto están
 * abiertas, así que gana el más ancho. Entre los que quedan a menos de `EMPATE`
 * del mejor, gana el más simétrico —los dos márgenes parecidos—, porque a mismo
 * ancho una pose torcida parece un cuadro agarrado a mitad de camino.
 *
 * ## Por qué del WebP y no del video
 *
 * El animado ya pasó por `procesar.js`: fondo recortado, borde desvanecido y
 * encuadre seguido cuadro a cuadro. Sacándole un cuadro se hereda todo eso
 * exacto. Volviendo al `.mp4` habría que repetir el recorte, y dos recortes del
 * mismo huevo no dan el mismo borde: al lado del animado se notaría.
 */

const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const CARPETA = path.join(__dirname, '..', 'assets', 'criaturas');

/** El sufijo con que se guarda. Es el mismo que espera `src/art/index.ts`. */
const SUFIJO = '-quieto';

/**
 * Alta, porque es una sola imagen y no cuarenta y ocho.
 *
 * El animado se comprime fuerte porque paga cada cuadro; este pesa unos pocos
 * kB y se muestra grande en la ficha, así que no hay nada que ahorrar acá.
 */
const CALIDAD = 90;

/**
 * Cuánto más angosto puede ser un cuadro y seguir compitiendo, en tanto por uno.
 *
 * Los dos o tres cuadros de máxima apertura son casi idénticos en ancho y bien
 * distintos en pose. Sin esta franja ganaba siempre el más ancho por dos
 * píxeles, que muchas veces era el más torcido.
 */
const EMPATE = 0.02;

/** Alfa mínimo para considerar que en ese píxel hay huevo. */
const OPACO = 40;

/** Los márgenes vacíos a izquierda y derecha del cuadro. */
async function margenes(imagen) {
  const { data, info } = await imagen.ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const { width: W, height: H, channels: C } = info;

  let min = W;
  let max = -1;
  // De a dos filas: es una silueta de setecientos píxeles de ancho y el borde
  // no cambia entre una fila y la siguiente. Mirarlas todas duplica el tiempo
  // por ocho huevos de cuarenta y ocho cuadros y no mueve el resultado.
  for (let y = 0; y < H; y += 2) {
    for (let x = 0; x < W; x++) {
      if (data[(y * W + x) * C + 3] > OPACO) {
        if (x < min) min = x;
        if (x > max) max = x;
      }
    }
  }

  return { ancho: max - min, izquierda: min, derecha: W - 1 - max };
}

/** El cuadro de alas más abiertas, y de esos el más derecho. */
async function mejorCuadro(original, cuadros) {
  const medidas = [];
  for (let i = 0; i < cuadros; i++) {
    const m = await margenes(sharp(original, { page: i }));
    medidas.push({ cuadro: i, ...m, torcido: Math.abs(m.izquierda - m.derecha) });
  }

  const masAncho = Math.max(...medidas.map((m) => m.ancho));
  const finalistas = medidas.filter((m) => m.ancho >= masAncho * (1 - EMPATE));

  return finalistas.sort((a, b) => a.torcido - b.torcido)[0];
}

async function main() {
  const archivos = fs
    .readdirSync(CARPETA)
    .filter((f) => /^\d\d-huevo\.webp$/.test(f))
    .sort();

  if (!archivos.length) {
    console.error(`No hay huevos en ${CARPETA}`);
    process.exit(1);
  }

  for (const archivo of archivos) {
    const origen = path.join(CARPETA, archivo);
    const destino = path.join(CARPETA, archivo.replace('.webp', `${SUFIJO}.webp`));

    // Se lee el buffer y no la ruta: sharp deja el archivo abierto si se lo
    // pasa por ruta, y acá se escribe en la misma carpeta. Es la misma razón
    // que está explicada en `cards.js`.
    const original = fs.readFileSync(origen);
    const { pages } = await sharp(original, { pages: -1 }).metadata();

    const elegido = await mejorCuadro(original, pages);

    // `page` es lo que pide un cuadro suelto. Sin esto —o con `pages: -1`—
    // sharp trae la tira entera apilada en una imagen larguísima.
    const salida = await sharp(original, { page: elegido.cuadro })
      .webp({ quality: CALIDAD })
      .toBuffer();

    fs.writeFileSync(destino, salida);

    console.log(
      `  ${path.basename(destino)}: cuadro ${elegido.cuadro} de ${pages}` +
        ` — alas de ${elegido.ancho} px, torcido ${elegido.torcido}` +
        ` — ${(salida.length / 1024).toFixed(0)} kB`
    );
  }
}

main().catch((e) => {
  console.error(e.message);
  process.exit(1);
});
