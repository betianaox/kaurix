/**
 * Separa las láminas de criaturas en las piezas fijas que usa el juego.
 *
 *   node herramientas/bichos.js
 *
 * Son dos láminas, ocho criaturas cada una. **El orden de la lámina no es el
 * del juego**: las láminas se dibujaron cuando cada bicho tenía el número con
 * que entró, y después las vueltas se reordenaron. `VUELTA_DE_PIEZA` traduce
 * de uno al otro, así que el archivo que sale ya lleva el número de su vuelta.
 *
 * Si algún día se redibuja una lámina en el orden del juego, esa tabla pasa a
 * ser `[1,2,3,4,5,6,7,8]` y se puede borrar.
 *
 *   assets/bichos.png    los bebés   → NN-quieto.webp y NN-sombra.webp
 *   assets/bichos2.png   los crecidos → NN-crecido.webp
 *
 * ## Por qué esto y no `poses.js`
 *
 * `poses.js` saca la pose fija de un cuadro del video, y por eso la sombra
 * calza exacto con la animación. Pero el cuadro de un video comprimido tiene el
 * borde sucio y la resolución del video, y en la ficha grande se nota. Estas
 * láminas son el mismo personaje dibujado aparte y con alfa limpio, así que la
 * pieza fija sale de acá y la animación sigue saliendo del video.
 *
 * La sombra sigue saliendo del **mismo recorte** que la pose a color, que es lo
 * que hace que al encontrar la criatura el color entre sin que se mueva un
 * pixel.
 *
 * ## La normalización
 *
 * Igual que en `poses.js`: las ocho se llevan al mismo cuadrado y se igualan
 * por *tamaño visual*, no por caja ni por mancha. Ver `tamanoVisual` allá para
 * el porqué; acá está la misma cuenta.
 *
 * Cada lámina se normaliza contra su propia mediana, así que los bebés quedan
 * parejos entre sí y los crecidos entre sí. Que el crecido se vea más grande
 * que el bebé es cosa de quien los dibuja juntos —la ficha—, no de los
 * archivos: en la grilla de la colección un crecido más grande rompería la
 * cuadrícula.
 */

const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const RAIZ = path.join(__dirname, '..');
const DESTINO = path.join(RAIZ, 'assets', 'criaturas');

/**
 * A qué vuelta va cada pieza de la lámina, en orden de lectura.
 *
 * La lámina trae: dragón, cocodrilo, capibara, lobo, gato, pájaro, oso, perro.
 * El juego los reparte: dragón 1, gato 2, pájaro 3, perro 4, oso 5, lobo 6,
 * capibara 7, cocodrilo 8.
 */
const VUELTA_DE_PIEZA = [1, 8, 7, 6, 2, 3, 5, 4];

/** Cuántas criaturas y cómo están puestas en la lámina. */
const COLUMNAS = 4;
const FILAS = 2;
const PIEZAS = COLUMNAS * FILAS;

/** Lado del cuadrado al que se normaliza cada pieza. Igual que en `poses.js`. */
const LADO = 512;

/** Cuánto del cuadrado puede llegar a ocupar la más grande. */
const TOPE = 0.94;

/**
 * Qué tan grandes quedan respecto de la mediana.
 *
 * Alto: las criaturas casi llenan su ficha. Estuvo un tiempo en 0,86 —para que
 * respiraran— y con las fichas de la colección al tamaño de ahora sobraba
 * demasiado aire adentro de cada una. El grueso del aire que necesitan para no
 * chocarse entre sí ya lo pone el hueco de la grilla; acá queda solo el poco
 * que las despega del borde de su ficha.
 */
const ACHICA = 0.92;

/**
 * Desde qué opacidad un píxel cuenta como dibujo.
 *
 * 40 y no 1: el borde suave deja un halo casi transparente que, si contara,
 * haría que cada recorte abarcara medio cuadro.
 */
const OPACO = 40;

/** Cuánto se achica la lámina para buscar dónde está cada pieza. */
const ESCALA = 6;

/**
 * Las láminas, con qué se escribe de cada una.
 *
 * `sombra: true` agrega la silueta negra. Solo el bebé la necesita: es el que
 * se muestra tapado en la colección hasta que lo encontrás.
 */
const LAMINAS = [
  { archivo: 'assets/bichos.png', sufijo: 'quieto', sombra: true },
  { archivo: 'assets/bichos2.png', sufijo: 'crecido', sombra: false },
];

/**
 * Dónde está cada pieza, por proyección.
 *
 * Las láminas vienen en grilla con aire entre pieza y pieza, así que alcanza
 * con mirar qué columnas y qué filas tienen algo dibujado y cortar por los
 * huecos. No hace falta buscar manchas conectadas como en `recortar.js`, que
 * existe para láminas apretadas y de piezas desalineadas.
 *
 * Si el corte no da las ocho, el script se planta: seguir con siete piezas
 * escribiría los archivos corridos de criatura y eso no se ve hasta el
 * teléfono.
 */
async function cajas(archivo) {
  const chica = sharp(archivo).ensureAlpha().resize({
    width: Math.round((await sharp(archivo).metadata()).width / ESCALA),
  });
  const { data, info } = await chica.raw().toBuffer({ resolveWithObject: true });
  const { width, height, channels } = info;

  const alfa = (x, y) => data[(y * width + x) * channels + 3];

  /** Los tramos con contenido de una proyección: `[desde, hasta]` en píxeles. */
  const tramos = (largo, hayAlgo) => {
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
  };

  const bandas = tramos(height, (y) => {
    for (let x = 0; x < width; x++) if (alfa(x, y) >= OPACO) return true;
    return false;
  });
  if (bandas.length !== FILAS) {
    throw new Error(`${archivo}: se esperaban ${FILAS} filas y salieron ${bandas.length}`);
  }

  const cajas = [];
  for (const [y0, y1] of bandas) {
    const columnas = tramos(width, (x) => {
      for (let y = y0; y <= y1; y++) if (alfa(x, y) >= OPACO) return true;
      return false;
    });
    if (columnas.length !== COLUMNAS) {
      throw new Error(
        `${archivo}: en una fila se esperaban ${COLUMNAS} piezas y salieron ${columnas.length}`
      );
    }
    // De la lámina chica al original, con un píxel de más por el redondeo.
    for (const [x0, x1] of columnas) {
      cajas.push({
        left: Math.max(0, x0 * ESCALA - ESCALA),
        top: Math.max(0, y0 * ESCALA - ESCALA),
        width: (x1 - x0 + 3) * ESCALA,
        height: (y1 - y0 + 3) * ESCALA,
      });
    }
  }
  return cajas;
}

/** Ajusta una caja al ras del dibujo y cuenta cuánta tinta tiene. */
async function medir(archivo, caja) {
  const meta = await sharp(archivo).metadata();
  const recorte = {
    left: caja.left,
    top: caja.top,
    width: Math.min(caja.width, meta.width - caja.left),
    height: Math.min(caja.height, meta.height - caja.top),
  };

  const { data, info } = await sharp(archivo)
    .ensureAlpha()
    .extract(recorte)
    .raw()
    .toBuffer({ resolveWithObject: true });
  const { width, height, channels } = info;

  let x0 = width;
  let y0 = height;
  let x1 = -1;
  let y1 = -1;
  let opacos = 0;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (data[(y * width + x) * channels + 3] < OPACO) continue;
      opacos++;
      if (x < x0) x0 = x;
      if (y < y0) y0 = y;
      if (x > x1) x1 = x;
      if (y > y1) y1 = y;
    }
  }
  if (x1 < 0) return null;

  return {
    caja: {
      left: recorte.left + x0,
      top: recorte.top + y0,
      width: x1 - x0 + 1,
      height: y1 - y0 + 1,
    },
    opacos,
  };
}

/** Ver `poses.js`: la mancha va dividiendo, no multiplicando. */
const tamanoVisual = (m) =>
  Math.sqrt(Math.max(m.caja.width, m.caja.height)) / Math.pow(m.opacos, 0.25);

const centrada = (buf) =>
  sharp({
    create: { width: LADO, height: LADO, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } },
  }).composite([{ input: buf, gravity: 'center' }]);

const mediana = (ns) => {
  const o = [...ns].sort((a, b) => a - b);
  const m = Math.floor(o.length / 2);
  return o.length % 2 ? o[m] : (o[m - 1] + o[m]) / 2;
};

async function lamina({ archivo, sufijo, sombra }) {
  const ruta = path.join(RAIZ, archivo);
  if (!fs.existsSync(ruta)) {
    console.log(`${archivo}: no está, salteada`);
    return;
  }

  const encontradas = await cajas(ruta);
  const medidas = [];
  for (const c of encontradas) medidas.push(await medir(ruta, c));
  if (medidas.some((m) => !m)) throw new Error(`${archivo}: una pieza salió vacía`);
  if (medidas.length !== PIEZAS) {
    throw new Error(`${archivo}: se esperaban ${PIEZAS} piezas y salieron ${medidas.length}`);
  }

  const visuales = medidas.map(tamanoVisual);
  const patron = mediana(visuales);

  for (let i = 0; i < medidas.length; i++) {
    const nn = String(VUELTA_DE_PIEZA[i]).padStart(2, '0');
    const m = medidas[i];

    // Cuánto mide su lado más largo adentro del cuadrado: sale de comparar su
    // tamaño visual con el del grupo, con techo para que ninguna toque el borde.
    const lado = Math.round(
      Math.min(LADO * TOPE, LADO * TOPE * ACHICA * (visuales[i] / patron))
    );

    const ajustada = await sharp(ruta)
      .ensureAlpha()
      .extract(m.caja)
      .resize(lado, lado, { fit: 'inside', background: { r: 0, g: 0, b: 0, alpha: 0 } })
      .toBuffer();

    await centrada(ajustada)
      .webp({ quality: 90 })
      .toFile(path.join(DESTINO, `${nn}-${sufijo}.webp`));

    if (sombra) {
      // La misma forma, todo negro, del mismo recorte y la misma escala.
      const negra = await sharp(ajustada)
        .ensureAlpha()
        .composite([
          {
            input: { create: { width: 1, height: 1, channels: 4, background: '#000' } },
            tile: true,
            blend: 'in',
          },
        ])
        .toBuffer();
      await centrada(negra).webp({ quality: 90 }).toFile(path.join(DESTINO, `${nn}-sombra.webp`));
    }

    console.log(`  ${nn}-${sufijo}: ${m.caja.width}×${m.caja.height} → ${lado}`);
  }
}

async function main() {
  fs.mkdirSync(DESTINO, { recursive: true });
  for (const l of LAMINAS) {
    console.log(l.archivo);
    await lamina(l);
  }
}

main().catch((e) => {
  console.error(e.message);
  process.exit(1);
});
