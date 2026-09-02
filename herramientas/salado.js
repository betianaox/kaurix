/**
 * Arma los ingredientes y las preparaciones de la lámina salada.
 *
 *   node herramientas/recortar.js assets/food2.png
 *   node herramientas/salado.js
 *
 * De las 70 piezas salen **24 ingredientes nuevos y 19 preparaciones**. El
 * resto son repetidos —el tomate aparece tres veces, la harina cuatro— o cosas
 * que ya existen de las otras dos láminas y no se duplican: tomate, papa,
 * zanahoria, brócoli, apio, manzana, perejil y romero.
 *
 * Lo que esta lámina trae y a las otras les faltaba es **la despensa**: harina,
 * azúcar, manteca, aceite, sal, huevo. Con eso las recetas se leen como cocina
 * de verdad en vez de como un sorteo de frutas, y de paso arma dos capas — una
 * base de cosas comunes que siempre hacen falta y una punta de cosas
 * específicas que se buscan a propósito.
 *
 * Los panificados —pan, tortilla— no son materia prima sino preparación, así
 * que van a hacer de base de nivel 1: pan de hamburguesa más carne y lechuga es
 * una hamburguesa, y eso es exactamente la regla de "una simple más dos
 * ingredientes", pero coincidiendo con cómo se cocina.
 *
 * Se descarta el bowl de tofu en cubos: queda el bloque, que se lee mejor.
 */

const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const PIEZAS = path.join(__dirname, 'recortes', 'food2');
const ING = path.join(__dirname, '..', 'assets', 'salado');
/**
 * OJO: las preparaciones ya no se arman acá.
 *
 * Las 39 de las dos láminas las arma `preparaciones.js`, todas juntas, porque
 * se muestran mezcladas y hay que normalizarlas como un solo grupo. Esto deja
 * una copia suelta al costado, solo para poder mirarlas.
 */
const PREP = path.join(__dirname, 'recortes', 'salado-preparaciones');
const HOJA = path.join(__dirname, 'recortes', 'salado-hoja.png');

const LADO = 256;
const OCUPA = 0.9;
const TOPE = 0.98;

const INGREDIENTES = [
  // La despensa: lo que entra en casi todas las recetas.
  { id: 'harina', nombre: 'Harina', lugar: 'despensa', pieza: 'f01c1' },
  { id: 'azucar', nombre: 'Azúcar', lugar: 'despensa', pieza: 'f06c6' },
  { id: 'manteca', nombre: 'Manteca', lugar: 'despensa', pieza: 'f04c6' },
  { id: 'huevo', nombre: 'Huevo', lugar: 'despensa', pieza: 'f08c5' },
  { id: 'queso', nombre: 'Queso', lugar: 'despensa', pieza: 'f01c3' },
  { id: 'sal', nombre: 'Sal', lugar: 'despensa', pieza: 'f03c7' },
  { id: 'pimienta', nombre: 'Pimienta', lugar: 'despensa', pieza: 'f07c3' },
  { id: 'aceite', nombre: 'Aceite', lugar: 'despensa', pieza: 'f03c6' },
  { id: 'aceite-oliva', nombre: 'Aceite de oliva', lugar: 'despensa', pieza: 'f06c3' },
  { id: 'canela', nombre: 'Canela', lugar: 'despensa', pieza: 'f04c7' },
  { id: 'chocolate', nombre: 'Chocolate', lugar: 'despensa', pieza: 'f06c5' },
  { id: 'mostaza', nombre: 'Mostaza', lugar: 'despensa', pieza: 'f02c7' },

  // Las proteínas: lo más caro de conseguir.
  { id: 'carne-picada', nombre: 'Carne picada', lugar: 'proteina', pieza: 'f02c1' },
  { id: 'carne-desmenuzada', nombre: 'Carne desmenuzada', lugar: 'proteina', pieza: 'f03c2' },
  { id: 'salchicha', nombre: 'Salchicha', lugar: 'proteina', pieza: 'f02c5' },
  { id: 'pollo', nombre: 'Pollo', lugar: 'proteina', pieza: 'f05c2' },
  { id: 'bife', nombre: 'Bife', lugar: 'proteina', pieza: 'f07c1' },
  { id: 'camarones', nombre: 'Camarones', lugar: 'proteina', pieza: 'f09c1' },
  { id: 'tofu', nombre: 'Tofu', lugar: 'proteina', pieza: 'f05c7' },

  // El único fresco que no teníamos.
  { id: 'lechuga', nombre: 'Lechuga', lugar: 'verdura', pieza: 'f02c3' },
];

const PREPARACIONES = [
  // Los panificados no son materia prima: son lo primero que se hornea, y lo
  // que después hace de base. Por eso están acá y no entre los ingredientes.
  { id: 'pan-molde', nombre: 'Pan de molde', pieza: 'f04c1' },
  { id: 'pan-hamburguesa', nombre: 'Pan de hamburguesa', pieza: 'f02c2' },
  { id: 'pan-pancho', nombre: 'Pan de pancho', pieza: 'f02c6' },
  { id: 'tortilla', nombre: 'Tortilla', pieza: 'f03c1' },

  { id: 'pizza', nombre: 'Pizza', pieza: 'f01c4' },
  { id: 'hamburguesa', nombre: 'Hamburguesa', pieza: 'f02c4' },
  { id: 'pancho', nombre: 'Pancho', pieza: 'f02c8' },
  { id: 'taco', nombre: 'Taco', pieza: 'f03c4' },
  { id: 'sandwich', nombre: 'Sándwich', pieza: 'f04c4' },
  { id: 'papas-fritas', nombre: 'Papas fritas', pieza: 'f03c8' },
  { id: 'sopa-verduras', nombre: 'Sopa de verduras', pieza: 'f01c8' },
  { id: 'sopa-camarones', nombre: 'Sopa de camarones', pieza: 'f09c4' },
  { id: 'pollo-asado', nombre: 'Pollo asado', pieza: 'f05c4' },
  { id: 'churrasco', nombre: 'Churrasco', pieza: 'f07c4' },
  { id: 'pasta', nombre: 'Pasta', pieza: 'f06c4' },
  { id: 'quiche', nombre: 'Quiche', pieza: 'f08c8' },

  // Las dulces de esta lámina. Van al mismo cajón que los postres.
  { id: 'rol-canela', nombre: 'Rol de canela', pieza: 'f04c8' },
  { id: 'tarta-manzana', nombre: 'Tarta de manzana', pieza: 'f08c4' },
  { id: 'torta-zanahoria', nombre: 'Torta de zanahoria', pieza: 'f05c8' },
  { id: 'torta-chocolate', nombre: 'Torta de chocolate', pieza: 'f06c8' },
  { id: 'torta-arcoiris', nombre: 'Torta arcoíris', pieza: 'f07c8' },
  // Los dos sueltos del final: no son repetidos de food1, los comparé.
  { id: 'cupcake-cereza', nombre: 'Cupcake de cereza', pieza: 'f09c5' },
  { id: 'dona-confites', nombre: 'Dona de confites', pieza: 'f09c6' },
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

function pieza(id) {
  const archivo = path.join(PIEZAS, `${id}.png`);
  if (!fs.existsSync(archivo)) {
    console.error(`falta ${id}.png — ¿corriste recortar.js sobre assets/food2.png?`);
    process.exit(1);
  }
  return archivo;
}

(async () => {
  for (const d of [ING, PREP]) {
    fs.rmSync(d, { recursive: true, force: true });
    fs.mkdirSync(d, { recursive: true });
  }

  const medidos = [];
  for (const it of INGREDIENTES) {
    const archivo = pieza(it.pieza);
    medidos.push({ ...it, archivo, medida: await medir(archivo) });
  }

  const factor = (LADO * OCUPA) / mediana(medidos.map((m) => tamanoVisual(m.medida)));

  for (const it of medidos) {
    const lado = Math.min(Math.round(tamanoVisual(it.medida) * factor), Math.round(LADO * TOPE));
    const ajustado = await sharp(it.archivo)
      .ensureAlpha()
      .resize(lado, lado, { fit: 'inside', background: { r: 0, g: 0, b: 0, alpha: 0 } })
      .toBuffer();
    await centrar(ajustado, path.join(ING, `${it.id}.webp`));
  }

  for (const it of PREPARACIONES) {
    const ajustada = await sharp(pieza(it.pieza))
      .ensureAlpha()
      .resize(Math.round(LADO * 0.92), Math.round(LADO * 0.92), {
        fit: 'inside',
        background: { r: 0, g: 0, b: 0, alpha: 0 },
      })
      .toBuffer();
    await centrar(ajustada, path.join(PREP, `${it.id}.webp`));
  }

  const todo = [
    ...medidos.map((m) => ({ nombre: m.nombre, archivo: path.join(ING, `${m.id}.webp`) })),
    ...PREPARACIONES.map((p) => ({ nombre: p.nombre, archivo: path.join(PREP, `${p.id}.webp`) })),
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
        `text-anchor="middle" font-family="sans-serif" font-size="11" fill="#E6DFD2">${todo[i].nombre}</text>`
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
  console.log(`${PREPARACIONES.length} preparaciones en ${PREP}`);
  console.log(`hoja: ${HOJA}`);
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
