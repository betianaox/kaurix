/**
 * Arma los ingredientes de cocina y los postres a partir de la lámina dulce.
 *
 *   node herramientas/recortar.js assets/food1.png
 *   node herramientas/cocina.js
 *
 * De las 55 piezas salen 29 ingredientes y 16 preparaciones. Hay ingredientes
 * repetidos entre filas —la uva aparece tres veces, el tomate tres— y en las
 * últimas filas hay pastelitos y donas sueltos que no son resultado de ninguna
 * receta completa: esos se usan igual. Son justamente los que faltaban para
 * cerrar las dos filas que la lámina dejó a medias.
 *
 * Los ingredientes se normalizan por tamaño visual, como los de pociones. Las
 * preparaciones no hace falta: ya vienen todas del mismo tamaño.
 *
 * ## ⚠️ Esto vacía `assets/cocina` y la palta no sale de acá
 *
 * La palta viene de la lámina food3 y la arma `food3.js`. Como esta herramienta
 * deja la carpeta con lo que ella genera, correrla sola **borra la palta** y la
 * app deja de abrir: su `require` apunta a un archivo que ya no está.
 *
 * Después de correr esta, correr `node herramientas/food3.js`.
 */

const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const PIEZAS = path.join(__dirname, 'recortes', 'food1');
/**
 * La otra lámina, para los pocos que se toman de ahí.
 *
 * Casi todo sale de la dulce, pero algunos ingredientes están mejor dibujados en
 * la salada y se traen de allá. El grupo se normaliza igual: la cuenta del
 * tamaño mira la pieza, no de qué archivo salió.
 */
const OTRAS = path.join(__dirname, 'recortes', 'food2');
const ING = path.join(__dirname, '..', 'assets', 'cocina');
/**
 * Las preparaciones ya no se arman acá: las 39 de las dos láminas las hace
 * `preparaciones.js`, todas juntas, porque se muestran mezcladas y hay que
 * normalizarlas como un solo grupo. Esto deja una copia al costado, solo para
 * poder mirarlas.
 */
const POS = path.join(__dirname, 'recortes', 'cocina-postres');
const HOJA = path.join(__dirname, 'recortes', 'cocina-hoja.png');

const LADO = 256;
const OCUPA = 0.9;
const TOPE = 0.98;

/**
 * Dónde se encuentran.
 *
 * A diferencia de las hierbas y las piedras, que están afuera, esto se consigue
 * apuntando a comida de verdad: la frutera, la heladera, la mesa. Son dos
 * economías en dos lugares distintos, y eso es bueno: se juegan en momentos
 * distintos del día.
 */
const INGREDIENTES = [
  { id: 'manzana', nombre: 'Manzana', lugar: 'fruta', pieza: 'f01c1' },
  { id: 'banana', nombre: 'Banana', lugar: 'fruta', pieza: 'f01c2' },
  { id: 'frutilla', nombre: 'Frutilla', lugar: 'fruta', pieza: 'f01c3' },
  { id: 'durazno', nombre: 'Durazno', lugar: 'fruta', pieza: 'f01c6' },
  { id: 'uva', nombre: 'Uva', lugar: 'fruta', pieza: 'f01c7' },
  { id: 'sandia', nombre: 'Sandía', lugar: 'fruta', pieza: 'f03c1' },
  { id: 'kiwi', nombre: 'Kiwi', lugar: 'fruta', pieza: 'f03c2' },
  { id: 'pera', nombre: 'Pera', lugar: 'fruta', pieza: 'f03c5' },
  { id: 'naranja', nombre: 'Naranja', lugar: 'fruta', pieza: 'f03c6' },
  { id: 'tomate', nombre: 'Tomate', lugar: 'fruta', pieza: 'f03c7' },
  { id: 'anana', nombre: 'Ananá', lugar: 'fruta', pieza: 'f04c7' },
  { id: 'arandanos', nombre: 'Arándanos', lugar: 'fruta', pieza: 'f05c2' },
  { id: 'frambuesa', nombre: 'Frambuesa', lugar: 'fruta', pieza: 'f05c3' },
  { id: 'mango', nombre: 'Mango', lugar: 'fruta', pieza: 'f06c1' },
  { id: 'lima', nombre: 'Lima', lugar: 'fruta', pieza: 'f06c3' },

  { id: 'kale', nombre: 'Kale', lugar: 'verdura', pieza: 'f01c5' },
  { id: 'zanahoria', nombre: 'Zanahoria', lugar: 'verdura', pieza: 'f02c1' },
  { id: 'apio', nombre: 'Apio', lugar: 'verdura', pieza: 'f02c2' },
  { id: 'espinaca', nombre: 'Espinaca', lugar: 'verdura', pieza: 'f02c3' },
  { id: 'zucchini', nombre: 'Zucchini', lugar: 'verdura', pieza: 'f02c5' },
  { id: 'boniato', nombre: 'Boniato', lugar: 'verdura', pieza: 'f02c6' },
  { id: 'morron', nombre: 'Morrón', lugar: 'verdura', pieza: 'f04c1' },
  { id: 'cebolla', nombre: 'Cebolla', lugar: 'verdura', pieza: 'f04c2' },
  { id: 'champinon', nombre: 'Champiñón', lugar: 'verdura', pieza: 'f04c5' },
  { id: 'brocoli', nombre: 'Brócoli', lugar: 'verdura', pieza: 'f05c6', lamina: 'food2' },
  { id: 'arvejas', nombre: 'Arvejas', lugar: 'verdura', pieza: 'f05c5' },
  { id: 'coliflor', nombre: 'Coliflor', lugar: 'verdura', pieza: 'f06c4' },
  { id: 'papa', nombre: 'Papa', lugar: 'verdura', pieza: 'f01c5', lamina: 'food2' },
  { id: 'maiz', nombre: 'Maíz', lugar: 'verdura', pieza: 'f06c6' },
];

/** Las 16 preparaciones. El nivel lo decide la receta, no el archivo. */
const POSTRES = [
  { id: 'dona-nuez', nombre: 'Dona de nuez', pieza: 'f02c4' },
  { id: 'dona-rosada', nombre: 'Dona rosada', pieza: 'f05c7' },
  { id: 'dona-caramelo', nombre: 'Dona de caramelo', pieza: 'f06c7' },
  { id: 'dona-menta', nombre: 'Dona de menta', pieza: 'f05c4' },
  { id: 'dona-arcoiris', nombre: 'Dona de arcoíris', pieza: 'f04c4' },
  { id: 'pastelito-frutilla', nombre: 'Pastelito de frutilla', pieza: 'f01c4' },
  { id: 'pastelito-rosado', nombre: 'Pastelito rosado', pieza: 'f07c4' },
  { id: 'pastelito-confites', nombre: 'Pastelito de confites', pieza: 'f01c8' },
  { id: 'pastelito-arandanos', nombre: 'Pastelito de arándanos', pieza: 'f02c8' },
  { id: 'pastelito-moras', nombre: 'Pastelito de moras', pieza: 'f03c4' },
  { id: 'pastelito-miel', nombre: 'Pastelito de miel', pieza: 'f04c8' },
  { id: 'pastelito-frutos-rojos', nombre: 'Pastelito de frutos rojos', pieza: 'f03c8' },
  { id: 'pastelito-naranja', nombre: 'Pastelito de naranja', pieza: 'f05c8' },
  { id: 'pastelito-flores', nombre: 'Pastelito de flores', pieza: 'f06c8' },
  { id: 'pastelito-perlas', nombre: 'Pastelito de perlas', pieza: 'f07c6' },
  { id: 'pastelito-jardin', nombre: 'Pastelito del jardín', pieza: 'f07c7' },
];

/**
 * Borra los huecos blancos que quedaron encerrados en el dibujo.
 *
 * Algunas piezas traen, adentro del contorno, un pedacito del fondo de la
 * lámina: el más claro es el triángulo entre el tallo y la hoja de la uva. Con
 * el fondo oscuro de antes no se notaba; sobre el papel claro —y sobre todo
 * sobre la cámara, donde atrás puede haber cualquier cosa— se lee como una
 * mancha blanca pegada al dibujo.
 *
 * Se van solo los blancos **casi puros y encerrados en una mancha chica**. Esos
 * tres requisitos juntos son lo que distingue un pedazo de fondo de un brillo
 * pintado: un brillo tiene el tinte de lo que ilumina, degrada hacia el color
 * de al lado, y rara vez llega a 250 pleno en un área conexa.
 *
 * Devuelve cuántos píxeles borró, para poder mirar de una si se comió algo que
 * no debía.
 */
async function sinHuecosBlancos(buffer) {
  const { data, info } = await sharp(buffer).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const { width, height, channels } = info;

  /** Blanco casi puro y sin tinte. */
  const esFondo = (p) => {
    const i = p * channels;
    if (data[i + 3] < 120) return false;
    const r = data[i], g = data[i + 1], b = data[i + 2];
    return r >= 240 && g >= 240 && b >= 235 && Math.max(r, g, b) - Math.min(r, g, b) <= 20;
  };

  /** Una mancha más grande que esto es parte del dibujo, no un hueco. */
  const TOPE = Math.round(width * height * 0.004);

  const visto = new Uint8Array(width * height);
  let borrados = 0;

  for (let p = 0; p < width * height; p++) {
    if (visto[p] || !esFondo(p)) continue;

    // La mancha entera, a lo ancho: sin recursión, que con piezas grandes
    // desborda la pila.
    const mancha = [];
    const cola = [p];
    visto[p] = 1;
    while (cola.length) {
      const q = cola.pop();
      mancha.push(q);
      const x = q % width;
      const y = (q / width) | 0;
      const vecinos = [];
      if (x > 0) vecinos.push(q - 1);
      if (x < width - 1) vecinos.push(q + 1);
      if (y > 0) vecinos.push(q - width);
      if (y < height - 1) vecinos.push(q + width);
      for (const v of vecinos) {
        if (!visto[v] && esFondo(v)) {
          visto[v] = 1;
          cola.push(v);
        }
      }
    }

    if (mancha.length > TOPE) continue;
    for (const q of mancha) {
      data[q * channels + 3] = 0;
      borrados++;
    }
  }

  return {
    borrados,
    buffer: await sharp(data, { raw: { width, height, channels } }).png().toBuffer(),
  };
}

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
 * La mancha va dividiendo, no multiplicando: una cosa con mucha tinta tiene
 * que dibujarse más chica para pesar lo mismo que una con poca. La deducción
 * completa está en preparaciones.js.
 */
const tamanoVisual = (m) => Math.sqrt(m.largo) / Math.pow(m.opacos, 0.25);

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

function pieza(id, lamina) {
  const carpeta = lamina === 'food2' ? OTRAS : PIEZAS;
  const archivo = path.join(carpeta, `${id}.png`);
  if (!fs.existsSync(archivo)) {
    console.error(`falta ${id}.png — ¿corriste recortar.js sobre assets/${lamina ?? 'food1'}.png?`);
    process.exit(1);
  }
  return archivo;
}

(async () => {
  for (const d of [ING, POS]) {
    fs.rmSync(d, { recursive: true, force: true });
    fs.mkdirSync(d, { recursive: true });
  }

  const medidos = [];
  for (const it of INGREDIENTES) {
    const archivo = pieza(it.pieza, it.lamina);
    medidos.push({ ...it, archivo, medida: await medir(archivo) });
  }

  const factor = (LADO * OCUPA) / mediana(medidos.map((m) => tamanoVisual(m.medida)));

  for (const it of medidos) {
    const lado = Math.min(Math.round(tamanoVisual(it.medida) * factor), Math.round(LADO * TOPE));
    const limpio = await sinHuecosBlancos(fs.readFileSync(it.archivo));
    if (limpio.borrados) console.log(`  ${it.id}: ${limpio.borrados} px de fondo encerrado`);
    const ajustado = await sharp(limpio.buffer)
      .ensureAlpha()
      .resize(lado, lado, { fit: 'inside', background: { r: 0, g: 0, b: 0, alpha: 0 } })
      .toBuffer();
    await centrar(ajustado, path.join(ING, `${it.id}.webp`));
  }

  for (const it of POSTRES) {
    const limpio = await sinHuecosBlancos(fs.readFileSync(pieza(it.pieza)));
    if (limpio.borrados) console.log(`  ${it.id}: ${limpio.borrados} px de fondo encerrado`);
    const ajustado = await sharp(limpio.buffer)
      .ensureAlpha()
      .resize(Math.round(LADO * 0.92), Math.round(LADO * 0.92), {
        fit: 'inside',
        background: { r: 0, g: 0, b: 0, alpha: 0 },
      })
      .toBuffer();
    await centrar(ajustado, path.join(POS, `${it.id}.webp`));
  }

  // Una hoja con todo junto, para mirarlo de una.
  const todo = [
    ...medidos.map((m) => ({ nombre: m.nombre, archivo: path.join(ING, `${m.id}.webp`) })),
    ...POSTRES.map((p) => ({ nombre: p.nombre, archivo: path.join(POS, `${p.id}.webp`) })),
  ];

  const CELDA = 150;
  const COLS = 7;
  const capas = [];
  const etiquetas = [];

  for (let i = 0; i < todo.length; i++) {
    const mini = await sharp(todo[i].archivo)
      .resize(CELDA - 26, CELDA - 42, { fit: 'inside' })
      .png()
      .toBuffer();
    capas.push({ input: mini, left: (i % COLS) * CELDA + 13, top: Math.floor(i / COLS) * CELDA + 30 });
    etiquetas.push(
      `<text x="${(i % COLS) * CELDA + CELDA / 2}" y="${Math.floor(i / COLS) * CELDA + 20}" ` +
        `text-anchor="middle" font-family="sans-serif" font-size="12" fill="#E6DFD2">${todo[i].nombre}</text>`
    );
  }

  const filas = Math.ceil(todo.length / COLS);
  await sharp({
    create: { width: COLS * CELDA, height: filas * CELDA, channels: 4, background: { r: 21, g: 19, b: 31, alpha: 1 } },
  })
    .composite([
      ...capas,
      {
        input: Buffer.from(
          `<svg width="${COLS * CELDA}" height="${filas * CELDA}">${etiquetas.join('')}</svg>`
        ),
        left: 0,
        top: 0,
      },
    ])
    .png()
    .toFile(HOJA);

  console.log(`${INGREDIENTES.length} ingredientes en ${ING}`);
  console.log(`${POSTRES.length} postres en ${POS}`);
  console.log(`hoja: ${HOJA}`);
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
