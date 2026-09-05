/**
 * Separa la lámina de los botones en sus fichas sueltas.
 *
 *   node herramientas/botones.js
 *
 * Entra `assets/boton central.png` y salen a `assets/ui/` las ocho fichas que
 * usan el header y la barra de abajo:
 *
 *   coleccion  inventario  buscar  cocina  album      (la barra, en su orden)
 *   avisos     cerrar      ayuda                      (el header)
 *
 * El nombre de cada una sale de **dónde está en la lámina**: se leen las filas
 * de arriba abajo y, dentro de cada fila, las fichas de izquierda a derecha.
 * Si la lámina se redibuja con las fichas en otro orden, se cambia `FILAS` y
 * nada más.
 *
 * La ficha de buscar sale en un cuadrado más grande porque se dibuja al doble
 * de tamaño que las demás, y una imagen que se agranda en pantalla se ve
 * blanda.
 *
 * **No se normalizan entre sí.** Acá no hay que emparejar nada: cada botón se
 * dibuja con la medida que le da su barra, y las fichas ya vienen dibujadas con
 * la proporción que tienen que tener —la de buscar más grande que el resto—.
 *
 * Si el corte no da la cuenta, el script se planta: seguir escribiría las
 * fichas con el nombre de otra, y eso no se ve hasta el teléfono.
 */

const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const RAIZ = path.join(__dirname, '..');
const ENTRADA = path.join(RAIZ, 'assets', 'boton central.png');
const DESTINO = path.join(RAIZ, 'assets', 'ui');

/** Qué hay en cada fila de la lámina, de arriba abajo y de izquierda a derecha. */
const FILAS = [
  ['coleccion', 'inventario', 'buscar', 'cocina', 'album'],
  ['avisos', 'cerrar', 'ayuda'],
];

/** Lado del cuadrado de cada pieza. */
const LADO = 192;
const LADO_BUSCAR = 256;

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

  // Primero las filas y después, dentro de cada una, las columnas. Cortar solo
  // por columnas no sirve con dos filas: las de abajo caen entre las de arriba
  // y cada corte agarraría media ficha de cada fila.
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
    const columnas = tramos(width, (x) => {
      for (let y = y0; y <= y1; y++) if (alfa(x, y) >= OPACO) return true;
      return false;
    });
    if (columnas.length !== FILAS[f].length) {
      console.error(
        `En la fila ${f + 1} se esperaban ${FILAS[f].length} fichas y salieron ${columnas.length}`
      );
      process.exit(1);
    }

    for (let i = 0; i < columnas.length; i++) {
      const nombre = FILAS[f][i];
      const [x0, x1] = columnas[i];
      const izquierda = Math.max(0, x0 * ESCALA - ESCALA);
      const arriba = Math.max(0, y0 * ESCALA - ESCALA);
      const caja = {
        left: izquierda,
        top: arriba,
        width: Math.min(meta.width - izquierda, (x1 - x0 + 3) * ESCALA),
        height: Math.min(meta.height - arriba, (y1 - y0 + 3) * ESCALA),
      };

      // Al ras: la caja de la proyección viene con un margen de redondeo.
      const recorte = await sharp(ENTRADA).ensureAlpha().extract(caja).toBuffer();
      const pieza = await sharp(recorte).trim({ threshold: 1 }).toBuffer();

      const lado = nombre === 'buscar' ? LADO_BUSCAR : LADO;
      const ajustada = await sharp(pieza)
        .resize(lado, lado, { fit: 'inside', background: { r: 0, g: 0, b: 0, alpha: 0 } })
        .toBuffer();

      await sharp({
        create: {
          width: lado,
          height: lado,
          channels: 4,
          background: { r: 0, g: 0, b: 0, alpha: 0 },
        },
      })
        .composite([{ input: ajustada, gravity: 'center' }])
        .webp({ quality: 92 })
        .toFile(path.join(DESTINO, `${nombre}.webp`));

      const m = await sharp(ajustada).metadata();
      console.log(`  ${nombre}: ${m.width}×${m.height} en ${lado}`);
    }
  }
}

main().catch((e) => {
  console.error(e.message);
  process.exit(1);
});
