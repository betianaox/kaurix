/**
 * Arma la palta y el sushi a partir de la lámina food3.
 *
 *   node herramientas/recortar.js assets/food3.png
 *   node herramientas/food3.js
 *
 * La lámina trae seis piezas y **solo se usan dos**:
 *
 *   4 · sushi   → comida
 *   5 · palta   → ingrediente
 *
 * Las otras cuatro se descartan, y cada una por su motivo:
 *
 *   1 · grano de arroz — a tamaño de ficha es una manchita blanca sin forma.
 *   2 · nigiri de salmón — no es materia prima, YA ES SUSHI. Usarlo como
 *       ingrediente del sushi sería circular.
 *   3 · hoja de alga — un cuadrado verde sin silueta; en chico no se lee.
 *   6 · cebolla morada — ya existe `cebolla` en el juego, y se queda la que
 *       estaba.
 *
 * ## Por qué este script y no otro
 *
 * `salado.js` y `cocina.js` normalizan el tamaño de los ingredientes contra la
 * MEDIANA DE SU PROPIO LOTE: de veinticuatro piezas sale un tamaño típico y
 * todas se escalan a él. Con un lote de una sola pieza esa cuenta no existe —la
 * mediana de un número es ese número—, así que la palta saldría del tamaño que
 * viniera dibujada.
 *
 * Acá la referencia son los ingredientes QUE YA ESTÁN: se escala la palta hasta
 * que ocupe lo mismo que la mediana de ellos. Es la misma idea de las otras
 * herramientas, midiendo contra el resultado en vez de contra el lote.
 *
 * El sushi no necesita nada de esto: las preparaciones van todas al mismo
 * tamaño fijo, sin medir nada (ver `preparaciones.js`).
 */

const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const PIEZAS = path.join(__dirname, 'recortes', 'food3');
const COCINA = path.join(__dirname, '..', 'assets', 'cocina');
const COMIDAS = path.join(__dirname, '..', 'assets', 'comidas');
const HOJA = path.join(__dirname, 'recortes', 'food3-resultado.png');

const LADO = 256;
/** El mismo que usan las preparaciones en `preparaciones.js`. */
const OCUPA_COMIDA = 0.92;

/**
 * El área que ocupa la silueta, recortada al ras.
 *
 * SE MIDE EL ÁREA Y NO LA TINTA, y esto costó una pasada. Primero se comparó
 * cuántos píxeles opacos tenía cada dibujo, que suena razonable pero castiga a
 * las formas macizas: con la misma tinta que un brócoli lleno de huecos, una
 * palta entera ocupa bastante menos lugar en la ficha. Salía chica.
 *
 * El área del recuadro que la contiene es lo que el ojo compara de verdad, y es
 * la que deja a la palta al lado de la manzana sin que ninguna parezca de otro
 * juego.
 */
async function area(archivo) {
  const { info } = await sharp(archivo).trim({ threshold: 10 }).toBuffer({ resolveWithObject: true });
  return info.width * info.height;
}

const mediana = (ns) => {
  const o = [...ns].sort((a, b) => a - b);
  const m = Math.floor(o.length / 2);
  return o.length % 2 ? o[m] : (o[m - 1] + o[m]) / 2;
};

async function centrar(buffer, destino) {
  await sharp({
    create: { width: LADO, height: LADO, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } },
  })
    .composite([{ input: buffer, gravity: 'center' }])
    .webp({ quality: 90 })
    .toFile(destino);
}

function pieza(id) {
  const archivo = path.join(PIEZAS, `${id}.png`);
  if (!fs.existsSync(archivo)) {
    console.error(`falta ${id}.png — ¿corriste recortar.js sobre assets/food3.png?`);
    process.exit(1);
  }
  return archivo;
}

/**
 * Escala la pieza hasta que su área se acerque al objetivo.
 *
 * Va por bisección y no por una cuenta directa porque la relación entre el lado
 * y el área no es exactamente cuadrática: depende de la silueta, de cuánto
 * borde semitransparente tenga y de cómo redondee el escalado.
 */
async function escalarAArea(archivo, objetivo) {
  let bajo = 40;
  let alto = Math.round(LADO * 0.98);
  let mejor = alto;

  for (let i = 0; i < 12; i++) {
    const medio = Math.round((bajo + alto) / 2);
    const buf = await sharp(archivo)
      .ensureAlpha()
      .resize(medio, medio, { fit: 'inside', background: { r: 0, g: 0, b: 0, alpha: 0 } })
      .toBuffer();
    const t = await area(buf);
    mejor = medio;
    if (t > objetivo) alto = medio - 1;
    else bajo = medio + 1;
    if (bajo > alto) break;
  }
  return mejor;
}

(async () => {
  // ── El ingrediente ────────────────────────────────────────────────────────
  const existentes = fs
    .readdirSync(COCINA)
    .filter((f) => f.endsWith('.webp'))
    .map((f) => path.join(COCINA, f));

  if (existentes.length === 0) {
    console.error('no hay ingredientes en assets/cocina contra los que medir');
    process.exit(1);
  }

  const objetivo = mediana(
    await Promise.all(existentes.filter((f) => !f.endsWith('palta.webp')).map(area))
  );
  const archivoPalta = pieza('f02c1');
  const lado = await escalarAArea(archivoPalta, objetivo);

  const paltaAjustada = await sharp(archivoPalta)
    .ensureAlpha()
    .resize(lado, lado, { fit: 'inside', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .toBuffer();
  await centrar(paltaAjustada, path.join(COCINA, 'palta.webp'));

  const logrado = await area(path.join(COCINA, 'palta.webp'));
  console.log(
    `palta: lado ${lado} — area ${Math.round(logrado / 1000)}k contra ${Math.round(objetivo / 1000)}k ` +
      `de la mediana (${Math.round((logrado / objetivo - 1) * 100)}%)`
  );

  // ── La comida ─────────────────────────────────────────────────────────────
  const sushiAjustado = await sharp(pieza('f01c4'))
    .ensureAlpha()
    .resize(Math.round(LADO * OCUPA_COMIDA), Math.round(LADO * OCUPA_COMIDA), {
      fit: 'inside',
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    })
    .toBuffer();
  await centrar(sushiAjustado, path.join(COMIDAS, 'sushi.webp'));
  console.log('sushi: escrito en assets/comidas/sushi.webp');

  // ── Una hoja para mirar la palta al lado de sus vecinas ────────────────────
  const vecinas = ['papa', 'cebolla', 'zanahoria', 'brocoli', 'champinon']
    .map((id) => ({ nombre: id, archivo: path.join(COCINA, `${id}.webp`) }))
    .filter((v) => fs.existsSync(v.archivo));
  const todo = [{ nombre: 'palta', archivo: path.join(COCINA, 'palta.webp') }, ...vecinas];

  const CELDA = 150;
  const capas = [];
  const etiquetas = [];
  for (let i = 0; i < todo.length; i++) {
    const mini = await sharp(todo[i].archivo).resize(CELDA - 26, CELDA - 42, { fit: 'inside' }).png().toBuffer();
    capas.push({ input: mini, left: i * CELDA + 13, top: 30 });
    etiquetas.push(
      `<text x="${i * CELDA + CELDA / 2}" y="20" text-anchor="middle" ` +
        `font-family="sans-serif" font-size="11" fill="#E6DFD2">${todo[i].nombre}</text>`
    );
  }
  const ancho = todo.length * CELDA;
  await sharp({ create: { width: ancho, height: CELDA, channels: 4, background: '#1B1826' } })
    .composite([
      ...capas,
      { input: Buffer.from(`<svg width="${ancho}" height="${CELDA}">${etiquetas.join('')}</svg>`), top: 0, left: 0 },
    ])
    .png()
    .toFile(HOJA);
  console.log('hoja: ' + HOJA);
})();
