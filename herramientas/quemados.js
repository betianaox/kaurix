/**
 * Arma los quemados a partir de las piezas de la lámina.
 *
 *   node herramientas/recortar.js assets/burn.png --escala 2
 *   node herramientas/quemados.js
 *
 * Son doce y salen las doce: la lámina viene en grilla limpia de 4×3 y con el
 * fondo bien transparente, así que el cortador no necesita ninguna maña.
 *
 * ## Los nombres
 *
 * Describen qué se ve y nada más. No son ingredientes del juego y no tienen que
 * coincidir con ninguno: son lo que queda cuando cocinaste cualquier cosa, y
 * atarlos al catálogo obligaría a explicar por qué se quemó una zanahoria si
 * vos habías tirado albahaca.
 *
 * ## Por qué se normalizan igual que las comidas
 *
 * Salen de a uno en el mismo lugar de la olla, así que si uno viniera al doble
 * del otro se notaría al quemar dos veces seguidas. Misma cuenta que en
 * `preparaciones.js`: el tamaño percibido no es el ancho ni la cantidad de
 * tinta, sino algo entre los dos.
 */

const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const PIEZAS = path.join(__dirname, 'recortes', 'burn');
const DESTINO = path.join(__dirname, '..', 'assets', 'quemados');

const LADO = 256;
/** Cuánto del cuadro ocupa el de tamaño mediano. */
const OCUPA = 0.86;
/** Tope, para que el más flaco y largo no se salga del cuadro. */
const TOPE = 0.98;

const QUEMADOS = [
  { id: 'banana', pieza: 'f01c1' },
  { id: 'morron', pieza: 'f01c2' },
  { id: 'cebolla', pieza: 'f01c3' },
  { id: 'tomate', pieza: 'f01c4' },
  { id: 'choclo', pieza: 'f02c1' },
  { id: 'aji', pieza: 'f02c2' },
  { id: 'hierbas', pieza: 'f02c3' },
  { id: 'naranja', pieza: 'f02c4' },
  { id: 'brocoli', pieza: 'f03c1' },
  { id: 'ajo', pieza: 'f03c2' },
  { id: 'zanahoria', pieza: 'f03c3' },
  { id: 'hojas', pieza: 'f03c4' },
];

async function medir(archivo) {
  const { data, info } = await sharp(archivo).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  let opacos = 0;
  for (let i = 3; i < data.length; i += info.channels) if (data[i] >= 40) opacos++;
  return { opacos, largo: Math.max(info.width, info.height) };
}

/** Ver `preparaciones.js`: el `opacos` va dividiendo, no multiplicando. */
const tamanoVisual = (m) => Math.sqrt(m.largo) / Math.pow(m.opacos, 0.25);

const mediana = (ns) => {
  const o = [...ns].sort((a, b) => a - b);
  const m = Math.floor(o.length / 2);
  return o.length % 2 ? o[m] : (o[m - 1] + o[m]) / 2;
};

(async () => {
  fs.rmSync(DESTINO, { recursive: true, force: true });
  fs.mkdirSync(DESTINO, { recursive: true });

  const medidas = [];
  for (const it of QUEMADOS) {
    const archivo = path.join(PIEZAS, `${it.pieza}.png`);
    if (!fs.existsSync(archivo)) {
      console.error(`falta ${it.pieza}.png — ¿corriste recortar.js?`);
      process.exit(1);
    }
    medidas.push({ ...it, archivo, medida: await medir(archivo) });
  }

  const factor = (LADO * OCUPA) / mediana(medidas.map((m) => tamanoVisual(m.medida)));

  for (const it of medidas) {
    const lado = Math.min(Math.round(tamanoVisual(it.medida) * factor), Math.round(LADO * TOPE));

    const ajustada = await sharp(it.archivo)
      .ensureAlpha()
      .resize(lado, lado, { fit: 'inside', background: { r: 0, g: 0, b: 0, alpha: 0 } })
      .toBuffer();

    await sharp({
      create: { width: LADO, height: LADO, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } },
    })
      .composite([{ input: ajustada, gravity: 'center' }])
      .webp({ quality: 90 })
      .toFile(path.join(DESTINO, `${it.id}.webp`));

    it.lado = lado;
  }

  const CELDA = 150;
  const COLS = 6;
  const capas = [];
  const rotulos = [];

  for (let i = 0; i < medidas.length; i++) {
    const mini = await sharp(path.join(DESTINO, `${medidas[i].id}.webp`))
      .resize(CELDA - 26, CELDA - 40, { fit: 'inside' })
      .png()
      .toBuffer();
    capas.push({ input: mini, left: (i % COLS) * CELDA + 13, top: Math.floor(i / COLS) * CELDA + 28 });
    rotulos.push(
      `<text x="${(i % COLS) * CELDA + CELDA / 2}" y="${Math.floor(i / COLS) * CELDA + 19}" ` +
        `text-anchor="middle" font-family="sans-serif" font-size="10" fill="#E6DFD2">${medidas[i].id}</text>`
    );
  }

  const filas = Math.ceil(medidas.length / COLS);
  const hoja = path.join(__dirname, 'recortes', 'quemados-hoja.png');
  await sharp({
    create: { width: COLS * CELDA, height: filas * CELDA, channels: 4, background: { r: 21, g: 19, b: 31, alpha: 1 } },
  })
    .composite([
      ...capas,
      {
        input: Buffer.from(
          `<svg width="${COLS * CELDA}" height="${filas * CELDA}">${rotulos.join('')}</svg>`
        ),
        top: 0,
        left: 0,
      },
    ])
    .png()
    .toFile(hoja);

  for (const it of medidas) console.log(`${it.id.padEnd(12)} ${it.pieza}  lado ${it.lado}`);
  console.log(`\n${medidas.length} quemados en ${DESTINO}`);
  console.log(`hoja: ${hoja}`);
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
