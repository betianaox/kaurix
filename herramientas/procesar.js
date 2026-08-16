/**
 * Convierte un video con fondo plano en un WebP animado con transparencia.
 *
 *   node procesar.js <video> [--ancho 900] [--fps 15] [--calidad 82]
 *                            [--umbral 0.26] [--color 0xRRGGBB]
 *                            [--sin-recorte] [--sin-seguimiento] [--preview]
 *
 * Hace cuatro cosas que a mano se olvidan o salen mal:
 *
 * 1. Detecta el color de fondo mirando las esquinas, en vez de asumirlo. Un
 *    azul comprimido no es 0,0,255 y esa diferencia se nota en el borde.
 * 2. Mide cuánta tolerancia de recorte admite el personaje, en vez de elegirla
 *    a ojo. Cada bicho admite una distinta según cuánto se parezca al fondo.
 * 3. Sigue al personaje cuadro a cuadro para encuadrarlo, en vez de abarcar
 *    todo su recorrido. Así llena el cuadro y no comparte lugar con el aire por
 *    donde pasa.
 * 4. Verifica cuadro por cuadro que ninguno perdió la transparencia. Ese error
 *    no se ve hasta que la imagen ya está en el teléfono.
 */

const { execFileSync } = require('child_process');
const fs = require('fs');
const path = require('path');

let FFMPEG;
try {
  FFMPEG = require('ffmpeg-static');
} catch {
  console.error('Falta ffmpeg. Corré: npm install');
  process.exit(1);
}

/** Lado de la miniatura que se usa para seguir al personaje. */
const N = 96;

/**
 * El desvanecido del borde. Los píxeles entre `umbral` y `umbral + BLEND` no se
 * borran del todo: quedan semitransparentes, que es exactamente lo que necesita
 * el antialiasing del contorno para no dejar filo de color.
 */
const BLEND = 0.1;

function arg(name, fallback) {
  const i = process.argv.indexOf(`--${name}`);
  return i > -1 ? process.argv[i + 1] : fallback;
}
const flag = (name) => process.argv.includes(`--${name}`);

const input = process.argv[2];
if (!input || !fs.existsSync(input)) {
  console.error('Falta el video. Uso: node procesar.js <video> [--ancho 900] ...');
  process.exit(1);
}

const ancho = Number(arg('ancho', 900));
const fps = Number(arg('fps', 15));
const calidad = Number(arg('calidad', 82));
const umbralPedido = arg('umbral', null);
const salida = arg('salida', path.join(__dirname, path.parse(input).name + '.webp'));
fs.mkdirSync(path.dirname(salida), { recursive: true });

const dist = (a, b) =>
  Math.sqrt((a[0] - b[0]) ** 2 + (a[1] - b[1]) ** 2 + (a[2] - b[2]) ** 2);

/** La diagonal del cubo de color: la distancia máxima posible entre dos colores. */
const MAXIMA = Math.sqrt(3 * 255 * 255);

// --- dimensiones y duración -------------------------------------------------

let W = 0;
let H = 0;
let duracion = 0;

try {
  execFileSync(FFMPEG, ['-hide_banner', '-i', input], { stdio: 'pipe' });
} catch (e) {
  const texto = (e.stderr || Buffer.alloc(0)).toString();

  const m = texto.match(/,\s(\d{2,5})x(\d{2,5})[\s,]/);
  if (m) {
    W = Number(m[1]);
    H = Number(m[2]);
  }

  const d = texto.match(/Duration:\s(\d+):(\d+):(\d+\.\d+)/);
  if (d) duracion = Number(d[1]) * 3600 + Number(d[2]) * 60 + Number(d[3]);
}

if (!W || !H) {
  console.error('No pude leer las dimensiones del video.');
  process.exit(1);
}

// --- miniaturas: una por cuadro, para el seguimiento ------------------------

const raw = execFileSync(
  FFMPEG,
  [
    '-hide_banner', '-loglevel', 'error',
    '-i', input,
    '-vf', `scale=${N}:${N},format=rgb24`,
    '-f', 'rawvideo', '-',
  ],
  { maxBuffer: 512 * 1024 * 1024 }
);

const porCuadro = N * N * 3;
const cuadros = Math.floor(raw.length / porCuadro);

const pixelEn = (f, x, y) => {
  const i = f * porCuadro + (y * N + x) * 3;
  return [raw[i], raw[i + 1], raw[i + 2]];
};

// --- color de fondo ---------------------------------------------------------

const esquinas = [
  pixelEn(0, 0, 0),
  pixelEn(0, N - 1, 0),
  pixelEn(0, 0, N - 1),
  pixelEn(0, N - 1, N - 1),
];

const fondo = esquinas
  .reduce((a, c) => [a[0] + c[0], a[1] + c[1], a[2] + c[2]], [0, 0, 0])
  .map((v) => Math.round(v / esquinas.length));

const dispersion = Math.max(
  ...esquinas.map((c) => Math.max(...c.map((v, i) => Math.abs(v - fondo[i]))))
);

const hex = '0x' + fondo.map((v) => v.toString(16).padStart(2, '0')).join('').toUpperCase();
const color = arg('color', hex);

// --- cuánta tolerancia admite este personaje --------------------------------

/**
 * El histograma se calcula a resolución completa y no sobre la miniatura.
 *
 * En 96x96 el borde antialiaseado ocupa casi el 10% del área del personaje, y
 * el estimador lo confunde con el personaje mismo. A resolución completa ese
 * borde es medio punto porcentual y deja de molestar.
 */
const PASO = 5;
const histograma = new Array(Math.ceil(MAXIMA / PASO) + 1).fill(0);
const MUESTRAS = 3;

for (let m = 0; m < MUESTRAS; m++) {
  const cuadro = Math.floor(((m + 0.5) / MUESTRAS) * cuadros);
  const full = execFileSync(
    FFMPEG,
    [
      '-hide_banner', '-loglevel', 'error',
      '-i', input,
      '-vf', `select='eq(n\\,${cuadro})',format=rgb24`,
      '-vframes', '1', '-f', 'rawvideo', '-',
    ],
    { maxBuffer: 64 * 1024 * 1024 }
  );

  for (let i = 0; i + 2 < full.length; i += 3) {
    const d = dist([full[i], full[i + 1], full[i + 2]], fondo);
    histograma[Math.min(histograma.length - 1, Math.floor(d / PASO))]++;
  }
}

/** Cuántos píxeles están a esta distancia del fondo, o más. */
const desde = (d) => {
  let n = 0;
  for (let i = Math.floor(d / PASO); i < histograma.length; i++) n += histograma[i];
  return n;
};

// Área del personaje, medida donde no hay ninguna duda de que es él.
const area = desde(80);

/**
 * Se sube la tolerancia mientras no se pierdan píxeles del personaje, y se para
 * justo antes.
 *
 * Si su color más parecido al fondo está a distancia 200, se puede recortar con
 * casi 200 sin tocarlo. Si tiene algo del color del fondo, la cuenta cae
 * enseguida y el corte queda bajo solo. Por eso conviene un fondo lejano de
 * todos los colores del personaje: no porque se vea distinto, sino porque
 * agranda este número y con él la prolijidad posible.
 */
let techo = 45;
for (let d = 50; d <= 300; d += PASO) {
  if (desde(d) >= area * 0.97) techo = d;
  else break;
}

// Lo que no puede pasarse del techo es la suma de los dos: el desvanecido borra
// tanto como el umbral, solo que a medias.
const umbral =
  umbralPedido ?? Math.max(0.1, Math.min(0.4, (techo * 0.85) / MAXIMA - BLEND)).toFixed(3);

// --- encuadre ---------------------------------------------------------------

/**
 * Qué tan lejos del fondo tiene que estar un píxel para contar como personaje.
 * Se usa la misma medida que el recorte real y un poco por encima de su umbral,
 * para que el encuadre abarque lo que va a quedar visible y no el halo de
 * compresión, que engorda la caja sin aportar nada.
 */
const TOLERANCIA = Math.max(45, Number(umbral) * MAXIMA * 1.05);

const cajas = [];
for (let f = 0; f < cuadros; f++) {
  let minX = N;
  let minY = N;
  let maxX = -1;
  let maxY = -1;

  for (let y = 0; y < N; y++) {
    for (let x = 0; x < N; x++) {
      if (dist(pixelEn(f, x, y), fondo) > TOLERANCIA) {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }

  cajas.push(maxX >= minX ? { minX, minY, maxX, maxY } : null);
}

const par = (v) => Math.max(2, Math.round(v / 2) * 2);
const validas = cajas.filter(Boolean);
const margen = 2; // en unidades de miniatura, para no comer el borde

let filtroRecorte = '';
let recorte = 'sin recortar';

if (!flag('sin-recorte') && validas.length) {
  if (flag('sin-seguimiento')) {
    // Encuadre fijo: abarca todo el recorrido del personaje.
    const minX = Math.min(...validas.map((c) => c.minX));
    const minY = Math.min(...validas.map((c) => c.minY));
    const maxX = Math.max(...validas.map((c) => c.maxX));
    const maxY = Math.max(...validas.map((c) => c.maxY));

    const cw = par(((maxX - minX + 1 + margen * 2) / N) * W);
    const ch = par(((maxY - minY + 1 + margen * 2) / N) * H);
    const cx = par((Math.max(0, minX - margen) / N) * W);
    const cy = par((Math.max(0, minY - margen) / N) * H);

    filtroRecorte = `crop=${cw}:${ch}:${cx}:${cy},`;
    recorte = `fijo ${cw}x${ch}`;
  } else {
    // Seguimiento: la ventana es del tamaño del personaje, no de su recorrido,
    // y se mueve con él. Así llena el cuadro. El desplazamiento lo pone la app.
    const anchoMax = Math.max(...validas.map((c) => c.maxX - c.minX + 1));
    const altoMax = Math.max(...validas.map((c) => c.maxY - c.minY + 1));

    const cw = Math.min(W, par(((anchoMax + margen * 2) / N) * W));
    const ch = Math.min(H, par(((altoMax + margen * 2) / N) * H));

    const lineas = [];
    cajas.forEach((c, f) => {
      if (!c) return;
      const centroX = ((c.minX + c.maxX + 1) / 2 / N) * W;
      const centroY = ((c.minY + c.maxY + 1) / 2 / N) * H;
      const x = par(Math.max(0, Math.min(W - cw, centroX - cw / 2)));
      const y = par(Math.max(0, Math.min(H - ch, centroY - ch / 2)));
      const t = ((f / cuadros) * duracion).toFixed(4);
      lineas.push(`${t} crop x ${x}, crop y ${y};`);
    });

    const archivo = path.join(path.dirname(salida), path.parse(salida).name + '.cmd');
    fs.writeFileSync(archivo, lineas.join('\n'));

    const escapado = archivo.replace(/\\/g, '/').replace(/:/g, '\\:');
    filtroRecorte = `sendcmd=f='${escapado}',crop=${cw}:${ch}:0:0,`;
    recorte = `siguiendo al personaje, ventana ${cw}x${ch}`;
  }
}

// --- informe ----------------------------------------------------------------

console.log(`video:      ${W} x ${H}, ${cuadros} cuadros, ${duracion.toFixed(2)} s`);
console.log(
  `fondo:      ${color}${dispersion > 12 ? '   las esquinas no coinciden, puede no ser fondo plano' : ''}`
);
console.log(
  `tolerancia: ${umbral}${umbralPedido ? ' (pedida)' : ` + ${BLEND} de borde   techo medido ${techo}`}`
);
console.log(`encuadre:   ${recorte}`);

/**
 * Cuánto del ancho original ocupa la ventana de recorte.
 *
 * Es el dato que devuelve la escala. Al recortar ajustado a cada personaje y
 * después mostrarlos todos al mismo ancho, se pierde la proporción entre ellos:
 * uno con las alas abiertas y uno compacto terminan del mismo tamaño aunque en
 * el video original uno fuera el doble del otro. Guardando esta relación se
 * puede recuperar la escala que tenían.
 */
const ventana = filtroRecorte.match(/crop=(\d+):/);
if (ventana) console.log(`escala:     ${(Number(ventana[1]) / W).toFixed(3)}`);

if (flag('analizar')) process.exit(0);

// --- conversión -------------------------------------------------------------

const cadena =
  `colorkey=${color}:${umbral}:${BLEND},${filtroRecorte}` +
  `scale=${ancho}:-1,fps=${fps},format=yuva420p`;

execFileSync(
  FFMPEG,
  [
    '-hide_banner', '-loglevel', 'error', '-y',
    '-i', input,
    '-vf', cadena,
    '-c:v', 'libwebp_anim',
    '-lossless', '0',
    '-q:v', String(calidad),
    '-loop', '0',
    salida,
  ],
  { stdio: 'inherit' }
);

/**
 * Vista previa sobre el fondo de la app.
 *
 * ffmpeg sabe escribir WebP animado pero no leerlo, así que la única forma de
 * mirar el resultado es rehacer la misma cadena de filtros y quedarse con un
 * cuadro.
 */
if (flag('preview')) {
  const previo = salida.replace(/\.webp$/, '-previo.png');
  execFileSync(
    FFMPEG,
    [
      '-hide_banner', '-loglevel', 'error', '-y',
      '-f', 'lavfi', '-i', 'color=c=0x15131F:s=1920x1080',
      '-i', input,
      '-filter_complex',
        `[1:v]${cadena},select='eq(n\\,20)',setpts=PTS-STARTPTS[k];` +
        `[0:v][k]overlay=(W-w)/2:(H-h)/2:shortest=1`,
      '-vframes', '1',
      previo,
    ],
    { stdio: 'inherit' }
  );
}

// --- verificación -----------------------------------------------------------

const buf = fs.readFileSync(salida);
let off = 12;
let salieron = 0;
let anchoFinal = 0;
let altoFinal = 0;
const sinAlfa = [];

while (off + 8 <= buf.length) {
  const tag = buf.toString('ascii', off, off + 4);
  const size = buf.readUInt32LE(off + 4);
  const body = off + 8;

  if (tag === 'VP8X') {
    anchoFinal = 1 + (buf[body + 4] | (buf[body + 5] << 8) | (buf[body + 6] << 16));
    altoFinal = 1 + (buf[body + 7] | (buf[body + 8] << 8) | (buf[body + 9] << 16));
  }
  if (tag === 'ANMF') {
    salieron++;
    if (buf.toString('ascii', body + 16, body + 20).trim() !== 'ALPH') sinAlfa.push(salieron);
  }

  off = body + size + (size % 2);
}

const mb = fs.statSync(salida).size / 1024 / 1024;

console.log(`\nsalida:     ${salida}`);
console.log(`tamaño:     ${anchoFinal} x ${altoFinal}`);
console.log(`peso:       ${mb.toFixed(2)} MB`);
console.log(`cuadros:    ${salieron} a ${fps} fps`);
console.log(
  sinAlfa.length
    ? `SIN ALFA:   ${sinAlfa.join(', ')} - hay que rehacerlo`
    : `alfa:       los ${salieron} cuadros la conservan`
);
