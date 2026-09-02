/**
 * Arma los ingredientes del juego a partir de las piezas de una lámina.
 *
 *   node herramientas/recortar.js assets/pociones.png   # primero separar
 *   node herramientas/ingredientes.js                   # después nombrar
 *
 * De las 56 piezas de la lámina de pociones salen 24 ingredientes: hay
 * repetidos —la misma lavanda aparece en dos recetas— y hay varios que a tamaño
 * chico son indistinguibles entre sí. De cada grupo parecido queda uno.
 *
 * Qué se descartó y por qué:
 *
 * - **tomillo** y **orégano**: en una cajita de 46 px son la misma mancha verde
 *   que el romero y la albahaca. Quedaron cuatro hierbas con siluetas de verdad
 *   distintas: hoja ancha, aguja, plumosa y gris.
 * - **hibisco rosa**: queda entre el rojo y el violeta y no se lee como un
 *   tercero.
 * - **pétalos rojos**: demasiado parecidos a los pétalos de rosa.
 * - **cuarzo rojo**, **cianita** y **malaquita**: cada uno repetía el color de
 *   otro mineral —rubí, lapislázuli y jade—, y el color es lo único que se
 *   distingue de un mineral a 46 px.
 *
 * Todos salen normalizados al mismo tamaño visual, igual que las criaturas: un
 * ramito de lavanda es alto y flaco y una piedra es compacta, así que igualar
 * la caja los deja de tamaños muy distintos.
 */

const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const PIEZAS = path.join(__dirname, 'recortes');
const DESTINO = path.join(__dirname, '..', 'assets', 'ingredientes');
const HOJA = path.join(__dirname, 'recortes', 'ingredientes-hoja.png');

/** Lado del cuadrado en el que se centra cada ingrediente. */
const LADO = 256;

/** Cuánto del cuadrado ocupa el ingrediente del medio del grupo. */
const OCUPA = 0.9;

/** Ninguno pasa de acá, por más que la cuenta lo pida. */
const TOPE = 0.98;

/**
 * El catálogo.
 *
 * `pieza` es el archivo que dejó el separador; `lugar` es dónde se encuentra, y
 * es también la clase que va a tener que reconocer la cámara. Cuatro lugares
 * bien distintos entre sí: cuantas más clases parecidas, peor acierta.
 */
const CATALOGO = [
  // Hierbas: cuatro siluetas distintas y nada más.
  { id: 'albahaca', nombre: 'Albahaca', lugar: 'planta', pieza: 'f01c3' },
  { id: 'romero', nombre: 'Romero', lugar: 'planta', pieza: 'f03c1' },
  // De food2: es el mismo ingrediente pero está mucho mejor dibujado, se lee
  // como perejil de verdad y no como una ramita genérica.
  { id: 'perejil', nombre: 'Perejil', lugar: 'planta', pieza: 'f01c7', lamina: 'food2' },
  { id: 'salvia', nombre: 'Salvia', lugar: 'planta', pieza: 'f05c1' },
  { id: 'hinojo', nombre: 'Hinojo', lugar: 'planta', pieza: 'f06c7' },

  // Flores.
  { id: 'lavanda', nombre: 'Lavanda', lugar: 'flor', pieza: 'f01c1' },
  { id: 'manzanilla', nombre: 'Manzanilla', lugar: 'flor', pieza: 'f02c1' },
  { id: 'sauco', nombre: 'Saúco', lugar: 'flor', pieza: 'f02c3' },
  { id: 'brezo', nombre: 'Brezo', lugar: 'flor', pieza: 'f05c3' },
  { id: 'diente-de-leon', nombre: 'Diente de león', lugar: 'flor', pieza: 'f06c5' },
  { id: 'hibisco-rojo', nombre: 'Hibisco rojo', lugar: 'flor', pieza: 'f04c3' },
  { id: 'hibisco-violeta', nombre: 'Hibisco violeta', lugar: 'flor', pieza: 'f04c7' },
  { id: 'petalos', nombre: 'Pétalos de rosa', lugar: 'flor', pieza: 'f04c5' },

  // De la tierra.
  { id: 'jengibre', nombre: 'Jengibre', lugar: 'tierra', pieza: 'f03c3' },
  { id: 'ajo', nombre: 'Ajo', lugar: 'tierra', pieza: 'f07c7' },

  // Minerales: uno por color, que es lo único que se distingue en chico.
  { id: 'amatista', nombre: 'Amatista', lugar: 'piedra', pieza: 'f01c2' },
  { id: 'arenisca', nombre: 'Arenisca', lugar: 'piedra', pieza: 'f01c6' },
  { id: 'piedra-luna', nombre: 'Piedra luna', lugar: 'piedra', pieza: 'f02c2' },
  { id: 'citrino', nombre: 'Citrino', lugar: 'piedra', pieza: 'f03c2' },
  { id: 'rubi', nombre: 'Rubí', lugar: 'piedra', pieza: 'f04c6' },
  { id: 'pirita', nombre: 'Pirita', lugar: 'piedra', pieza: 'f05c2' },
  { id: 'jade', nombre: 'Jade', lugar: 'piedra', pieza: 'f06c2' },
  { id: 'lapislazuli', nombre: 'Lapislázuli', lugar: 'piedra', pieza: 'f06c6' },
  { id: 'obsidiana', nombre: 'Obsidiana', lugar: 'piedra', pieza: 'f07c6' },
];

/** Cuántos píxeles opacos tiene, y cuánto mide su lado mayor. */
async function medir(archivo) {
  const { data, info } = await sharp(archivo).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  let opacos = 0;
  for (let i = 3; i < data.length; i += info.channels) if (data[i] >= 40) opacos++;
  return { opacos, largo: Math.max(info.width, info.height), ancho: info.width, alto: info.height };
}

/**
 * El tamaño con que el ojo lee una pieza: la media geométrica entre su lado
 * mayor y la raíz de su mancha. Ni la caja ni el área alcanzan por separado.
 */
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

(async () => {
  fs.rmSync(DESTINO, { recursive: true, force: true });
  fs.mkdirSync(DESTINO, { recursive: true });

  const medidos = [];
  for (const it of CATALOGO) {
    const archivo = path.join(PIEZAS, it.lamina || 'pociones', `${it.pieza}.png`);
    if (!fs.existsSync(archivo)) {
      console.error(`falta ${it.pieza}.png en ${it.lamina || 'pociones'} — ¿corriste recortar.js?`);
      process.exit(1);
    }
    medidos.push({ ...it, archivo, medida: await medir(archivo) });
  }

  const referencia = mediana(medidos.map((m) => tamanoVisual(m.medida)));
  const factor = (LADO * OCUPA) / referencia;

  for (const it of medidos) {
    const lado = Math.min(
      Math.round(tamanoVisual(it.medida) * factor),
      Math.round(LADO * TOPE)
    );

    const ajustado = await sharp(it.archivo)
      .ensureAlpha()
      .resize(lado, lado, { fit: 'inside', background: { r: 0, g: 0, b: 0, alpha: 0 } })
      .toBuffer();

    await sharp({
      create: { width: LADO, height: LADO, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } },
    })
      .composite([{ input: ajustado, gravity: 'center' }])
      .webp({ quality: 90 })
      .toFile(path.join(DESTINO, `${it.id}.webp`));

    console.log(`${it.id.padEnd(16)} ${it.lugar.padEnd(8)} lado ${lado}`);
  }

  // --- la hoja para mirarlos todos juntos -------------------------------------

  const CELDA = 150;
  const COLS = 6;
  const capas = [];
  const etiquetas = [];

  for (let i = 0; i < medidos.length; i++) {
    const mini = await sharp(path.join(DESTINO, `${medidos[i].id}.webp`))
      .resize(CELDA - 26, CELDA - 40, { fit: 'inside' })
      .png()
      .toBuffer();
    capas.push({ input: mini, left: (i % COLS) * CELDA + 13, top: Math.floor(i / COLS) * CELDA + 28 });
    etiquetas.push(
      `<text x="${(i % COLS) * CELDA + CELDA / 2}" y="${Math.floor(i / COLS) * CELDA + 20}" ` +
        `text-anchor="middle" font-family="sans-serif" font-size="13" fill="#E6DFD2">${medidos[i].nombre}</text>`
    );
  }

  const filas = Math.ceil(medidos.length / COLS);
  await sharp({
    create: { width: COLS * CELDA, height: filas * CELDA, channels: 4, background: { r: 21, g: 19, b: 31, alpha: 1 } },
  })
    .composite([
      ...capas,
      { input: Buffer.from(`<svg width="${COLS * CELDA}" height="${filas * CELDA}">${etiquetas.join('')}</svg>`), left: 0, top: 0 },
    ])
    .png()
    .toFile(HOJA);

  // --- el bloque para pegar en el registro ------------------------------------

  console.log('\n\n// ---- para src/juego/ingredientes.ts ----\n');
  for (const it of medidos) {
    console.log(
      `  { id: '${it.id}', nombre: '${it.nombre}', lugar: '${it.lugar}', peso: 60, ` +
        `arte: require('../../assets/ingredientes/${it.id}.webp') },`
    );
  }
  console.log(`\n// ${medidos.length} ingredientes · hoja: ${HOJA}`);
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
