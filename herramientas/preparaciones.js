/**
 * Arma las 39 comidas, de las dos láminas, en un solo lote.
 *
 *   node herramientas/recortar.js assets/food1.png
 *   node herramientas/recortar.js assets/food2.png
 *   node herramientas/preparaciones.js
 *
 * **Van todas juntas a propósito.** En el bolso se mezclan en la misma pestaña
 * —para el bicho son lo mismo, comida de tal nivel—, así que normalizarlas por
 * separado deja los postres de un tamaño y las saladas de otro, y se nota al
 * verlas en la misma grilla.
 *
 * Y se normalizan **por tamaño visual**, no por caja: una dona es redonda y
 * llena el cuadrado, una porción de torta es un triángulo y deja la mitad
 * vacía. Con la caja igualada la dona se ve bastante más grande. La media
 * geométrica entre el lado mayor y la raíz de la mancha se porta bien con las
 * dos formas.
 */

const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const RECORTES = path.join(__dirname, 'recortes');
const DESTINO = path.join(__dirname, '..', 'assets', 'comidas');
const HOJA = path.join(RECORTES, 'comidas-hoja.png');

const LADO = 256;

/** Cuánto del cuadrado ocupa la comida del medio del grupo. */
const OCUPA = 0.88;

/** Ninguna pasa de acá, por más que la cuenta lo pida. */
const TOPE = 0.98;

const COMIDAS = [
  // ── De la lámina salada ────────────────────────────────────────────────
  // Los panificados: no son materia prima, son lo primero que se hornea.
  { id: 'pan-molde', lamina: 'food2', pieza: 'f04c1' },
  { id: 'pan-hamburguesa', lamina: 'food2', pieza: 'f02c2' },
  { id: 'pan-pancho', lamina: 'food2', pieza: 'f02c6' },
  { id: 'tortilla', lamina: 'food2', pieza: 'f03c1' },

  { id: 'pizza', lamina: 'food2', pieza: 'f01c4' },
  { id: 'hamburguesa', lamina: 'food2', pieza: 'f02c4' },
  { id: 'pancho', lamina: 'food2', pieza: 'f02c8' },
  { id: 'taco', lamina: 'food2', pieza: 'f03c4' },
  { id: 'sandwich', lamina: 'food2', pieza: 'f04c4' },
  { id: 'papas-fritas', lamina: 'food2', pieza: 'f03c8' },
  { id: 'sopa-verduras', lamina: 'food2', pieza: 'f01c8' },
  { id: 'sopa-camarones', lamina: 'food2', pieza: 'f09c4' },
  { id: 'pollo-asado', lamina: 'food2', pieza: 'f05c4' },
  { id: 'churrasco', lamina: 'food2', pieza: 'f07c4' },
  { id: 'pasta', lamina: 'food2', pieza: 'f06c4' },
  { id: 'quiche', lamina: 'food2', pieza: 'f08c8' },

  // Las dulces de la lámina salada.
  { id: 'rol-canela', lamina: 'food2', pieza: 'f04c8' },
  { id: 'tarta-manzana', lamina: 'food2', pieza: 'f08c4' },
  { id: 'torta-zanahoria', lamina: 'food2', pieza: 'f05c8' },
  { id: 'torta-chocolate', lamina: 'food2', pieza: 'f06c8' },
  { id: 'torta-arcoiris', lamina: 'food2', pieza: 'f07c8' },
  { id: 'pastelito-cereza', lamina: 'food2', pieza: 'f09c5' },
  { id: 'dona-confites', lamina: 'food2', pieza: 'f09c6' },

  // ── De la lámina dulce ─────────────────────────────────────────────────
  { id: 'dona-nuez', lamina: 'food1', pieza: 'f02c4' },
  { id: 'dona-rosada', lamina: 'food1', pieza: 'f05c7' },
  { id: 'dona-caramelo', lamina: 'food1', pieza: 'f06c7' },
  { id: 'dona-menta', lamina: 'food1', pieza: 'f05c4' },
  { id: 'dona-arcoiris', lamina: 'food1', pieza: 'f04c4' },
  { id: 'pastelito-frutilla', lamina: 'food1', pieza: 'f01c4' },
  { id: 'pastelito-rosado', lamina: 'food1', pieza: 'f07c4' },
  { id: 'pastelito-confites', lamina: 'food1', pieza: 'f01c8' },
  { id: 'pastelito-arandanos', lamina: 'food1', pieza: 'f02c8' },
  { id: 'pastelito-moras', lamina: 'food1', pieza: 'f03c4' },
  { id: 'pastelito-miel', lamina: 'food1', pieza: 'f04c8' },
  { id: 'pastelito-frutos-rojos', lamina: 'food1', pieza: 'f03c8' },
  { id: 'pastelito-naranja', lamina: 'food1', pieza: 'f05c8' },
  { id: 'pastelito-flores', lamina: 'food1', pieza: 'f06c8' },
  { id: 'pastelito-perlas', lamina: 'food1', pieza: 'f07c6' },
  { id: 'pastelito-jardin', lamina: 'food1', pieza: 'f07c7' },
];

async function medir(archivo) {
  const { data, info } = await sharp(archivo).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  let opacos = 0;
  for (let i = 3; i < data.length; i += info.channels) if (data[i] >= 40) opacos++;
  return { opacos, largo: Math.max(info.width, info.height) };
}

/**
 * Qué lado hay que darle a esta pieza para que se vea del mismo tamaño que el
 * resto.
 *
 * Sale de una cuenta y no de la intuición, porque la intuición se equivoca:
 *
 * Se quiere igualar el tamaño percibido, que no es ni el ancho ni la mancha
 * sino algo entre los dos — la media geométrica entre el lado que ocupa (`E`) y
 * la raíz de su mancha. Al dibujarla con lado `E`, su mancha queda
 * `opacos · (E / largo)²`, así que despejando `E` de
 *
 *     E^½ · (√opacos · E / largo)^½ = constante
 *
 * queda `E ∝ √largo / opacos^¼`.
 *
 * **El `opacos` va dividiendo, no multiplicando.** Es al revés de lo que parece:
 * una cosa con mucha tinta —una dona, que es un anillo gordo— tiene que
 * dibujarse *más chica* para pesar lo mismo que una con poca —un pastelito, que
 * es angosto—. Tenerlo multiplicando le daba más lugar justo a lo que ya se veía
 * grande.
 */
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
  for (const it of COMIDAS) {
    const archivo = path.join(RECORTES, it.lamina, `${it.pieza}.png`);
    if (!fs.existsSync(archivo)) {
      console.error(`falta ${it.pieza}.png en ${it.lamina} — ¿corriste recortar.js?`);
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
  const COLS = 7;
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
  await sharp({
    create: { width: COLS * CELDA, height: filas * CELDA, channels: 4, background: { r: 21, g: 19, b: 31, alpha: 1 } },
  })
    .composite([
      ...capas,
      {
        input: Buffer.from(
          `<svg width="${COLS * CELDA}" height="${filas * CELDA}">${rotulos.join('')}</svg>`
        ),
        left: 0,
        top: 0,
      },
    ])
    .png()
    .toFile(HOJA);

  const lados = medidas.map((m) => m.lado);
  console.log(`${medidas.length} comidas en ${DESTINO}`);
  console.log(`lados: de ${Math.min(...lados)} a ${Math.max(...lados)} sobre ${LADO}`);
  console.log(`hoja: ${HOJA}`);
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
