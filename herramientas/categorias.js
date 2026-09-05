/**
 * Separa la lámina de categorías en los ocho iconos del álbum.
 *
 *   node herramientas/categorias.js
 *
 * Entra `assets/categorias.png` —cuatro filas de dos— y salen a
 * `assets/album/`, en orden de lectura:
 *
 *   dormir  nadar
 *   comer   cantar
 *   buscar  estrella
 *   construir  volar
 *
 * Son siluetas negras planas. Se guardan tal cual, en negro: el gris con que se
 * las ve en una carta que falta lo pone la pantalla con opacidad, no el
 * archivo. Así el mismo icono sirve apagado en la carta vacía y a full donde
 * haga falta, sin dos versiones del mismo dibujo.
 *
 * ## Las filas se detectan, las columnas se cuentan
 *
 * Las filas salen de mirar dónde hay dibujo, porque entre una y otra hay aire
 * limpio. Las columnas **no**: el `zzz` son tres zetas separadas entre sí, y
 * buscarlas por huecos verticales parte ese icono en tres. Como la lámina es
 * una grilla regular, se corta el ancho en partes iguales y cada mitad se
 * ajusta al ras de lo que tenga adentro.
 *
 * Si las filas no dan cuatro, el script se planta: seguir escribiría cada icono
 * con el nombre de otro y eso no se ve hasta el teléfono.
 */

const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const RAIZ = path.join(__dirname, '..');
const ENTRADA = path.join(RAIZ, 'assets', 'categorias.png');
const DESTINO = path.join(RAIZ, 'assets', 'album');

/** Qué hay en cada fila, de arriba abajo y de izquierda a derecha. */
const FILAS = [
  ['dormir', 'nadar'],
  ['comer', 'cantar'],
  ['buscar', 'estrella'],
  ['construir', 'volar'],
];

/** Lado del cuadrado de cada icono. */
const LADO = 128;

/** Desde qué opacidad un píxel cuenta como dibujo. */
const OPACO = 40;

/** Cuánto se achica la lámina para encontrar los cortes. */
const ESCALA = 4;

/** Los tramos con contenido de una proyección: `[desde, hasta]`. */
function tramos(largo, hayAlgo) {
  const out = [];
  let inicio = -1;
  for (let i = 0; i < largo; i++) {
    if (hayAlgo(i)) {
      if (inicio < 0) inicio = i;
    } else if (inicio >= 0) {
      out.push([inicio, i - 1]);
      inicio = -1;
    }
  }
  if (inicio >= 0) out.push([inicio, largo - 1]);
  return out;
}

async function main() {
  if (!fs.existsSync(ENTRADA)) {
    console.error(`Falta ${ENTRADA}`);
    process.exit(1);
  }
  fs.mkdirSync(DESTINO, { recursive: true });

  const meta = await sharp(ENTRADA).metadata();
  const { data, info } = await sharp(ENTRADA)
    .ensureAlpha()
    .resize({ width: Math.round(meta.width / ESCALA) })
    .raw()
    .toBuffer({ resolveWithObject: true });
  const { width, height, channels } = info;
  const alfa = (x, y) => data[(y * width + x) * channels + 3];

  const bandas = tramos(height, (y) => {
    for (let x = 0; x < width; x++) if (alfa(x, y) >= OPACO) return true;
    return false;
  });
  if (bandas.length !== FILAS.length) {
    console.error(`Se esperaban ${FILAS.length} filas y salieron ${bandas.length}`);
    process.exit(1);
  }

  for (let f = 0; f < bandas.length; f++) {
    const [y0, y1] = bandas[f];
    const columnas = FILAS[f].length;
    const ancho = Math.floor(meta.width / columnas);

    for (let i = 0; i < columnas; i++) {
      const nombre = FILAS[f][i];
      const izquierda = i * ancho;
      const arriba = Math.max(0, y0 * ESCALA - ESCALA);
      const caja = {
        left: izquierda,
        top: arriba,
        width: Math.min(ancho, meta.width - izquierda),
        height: Math.min(meta.height - arriba, (y1 - y0 + 3) * ESCALA),
      };

      const recorte = await sharp(ENTRADA).ensureAlpha().extract(caja).toBuffer();
      const pieza = await sharp(recorte).trim({ threshold: 1 }).toBuffer();

      const ajustada = await sharp(pieza)
        .resize(LADO, LADO, { fit: 'inside', background: { r: 0, g: 0, b: 0, alpha: 0 } })
        .toBuffer();

      await sharp({
        create: {
          width: LADO,
          height: LADO,
          channels: 4,
          background: { r: 0, g: 0, b: 0, alpha: 0 },
        },
      })
        .composite([{ input: ajustada, gravity: 'center' }])
        .webp({ quality: 92 })
        .toFile(path.join(DESTINO, `${nombre}.webp`));

      const m = await sharp(ajustada).metadata();
      console.log(`  ${nombre}: ${m.width}×${m.height} en ${LADO}`);
    }
  }
}

main().catch((e) => {
  console.error(e.message);
  process.exit(1);
});
