/**
 * Saca de cada animación el cuadro con que la criatura se muestra quieta.
 *
 *   node herramientas/poses.js contactos          # hojas para elegir
 *   node herramientas/poses.js generar            # usa el candidato automático
 *   node herramientas/poses.js generar 01=7 04=2  # o el cuadro que elijas
 *
 * Produce dos archivos por criatura, **sacados del mismo cuadro**:
 *
 *   NN-quieto.webp   la imagen a color de la colección
 *   NN-sombra.webp   la misma silueta, en negro
 *
 * Que salgan del mismo cuadro es la razón de que esto exista: al encontrar la
 * criatura, la sombra se llena de color sin que se mueva un pixel. Con dos
 * dibujos distintos esa transición no cierra nunca.
 *
 * Y van normalizadas para que se vean del mismo tamaño, que no es lo mismo que
 * medir igual. Ni la caja ni la mancha alcanzan por separado: por caja, uno de
 * alas abiertas se ve enorme al lado de uno compacto; por mancha, pasa lo
 * inverso. Se usa la media geométrica entre las dos: ver `tamanoVisual`.
 *
 * La escala relativa entre criaturas importa sobre la cámara, donde una tiene
 * que ser más grande que otra. En una grilla son fichas de un álbum y todas
 * valen lo mismo.
 */

const { execFileSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

let FFMPEG;
try {
  FFMPEG = require('ffmpeg-static');
} catch {
  console.error('Falta ffmpeg. Corré: npm install');
  process.exit(1);
}

const ORIGEN = path.join(__dirname, '..', 'assets', 'eggs');
const DESTINO = path.join(__dirname, '..', 'assets', 'criaturas');
const HOJAS = path.join(__dirname, 'poses');
const TEMP = path.join(__dirname, '.poses-tmp');

/** Cuántos cuadros se ofrecen para elegir. */
const CUADROS = 12;

/**
 * Las poses elegidas a ojo, mirando las hojas de contactos.
 *
 * Van acá y no en la línea de comandos para que volver a generar dé siempre lo
 * mismo: el candidato automático es una regla y puede cambiar si se toca el
 * criterio, pero estas son decisiones tomadas mirando.
 *
 * Las que no están usan el candidato automático. Se puede pisar cualquiera
 * desde la línea de comandos: `node herramientas/poses.js generar 03=5`.
 */
const ELEGIDOS = {
  '03': 3,
  '04': 8,
  '05': 8,
  '06': 3,
  '08': 5,
};

/** Lado del cuadrado al que se normaliza cada pose. */
const LADO = 512;

/**
 * Cuánto del cuadrado puede llegar a ocupar, como techo.
 *
 * Ninguna toca el borde: en la grilla las fichas tienen marco, y una criatura
 * pegada al borde se ve apretada al lado de una que no.
 */
const TOPE = 0.94;

/**
 * Qué tan grandes quedan, respecto de la mediana del grupo.
 *
 * Por debajo de 1 a propósito: emparejarlas hacia el tamaño de las más grandes
 * deja la grilla apretada. Conviene que respiren.
 */
const ACHICA = 0.86;

/** El desvanecido del borde, igual que en `procesar.js`. */
const BLEND = 0.1;

const dist = (a, b) => Math.sqrt((a[0] - b[0]) ** 2 + (a[1] - b[1]) ** 2 + (a[2] - b[2]) ** 2);
const MAXIMA = Math.sqrt(3 * 255 * 255);

function correr(args) {
  execFileSync(FFMPEG, ['-v', 'error', '-y', ...args], { stdio: ['ignore', 'ignore', 'pipe'] });
}

/**
 * Duración del video, en segundos.
 *
 * ffmpeg escribe los datos del archivo por la salida de error y termina con
 * código distinto de cero cuando no se le pide una salida, así que hay que
 * leerlos desde la excepción. Es el mismo truco que usa `procesar.js`.
 */
function duracion(video) {
  let texto = '';
  try {
    execFileSync(FFMPEG, ['-hide_banner', '-i', video], {
      stdio: ['ignore', 'ignore', 'pipe'],
    });
  } catch (e) {
    texto = (e.stderr || Buffer.alloc(0)).toString();
  }
  const m = texto.match(/Duration:\s(\d+):(\d+):(\d+\.\d+)/);
  if (!m) return null;
  return Number(m[1]) * 3600 + Number(m[2]) * 60 + Number(m[3]);
}

/**
 * El color del fondo, mirando las cuatro esquinas del primer cuadro.
 *
 * Se detecta y no se asume: un azul comprimido no es 0,0,255, y esa diferencia
 * se nota en el borde del personaje.
 */
async function fondoDe(video) {
  const png = path.join(TEMP, 'sonda.png');
  correr(['-i', video, '-frames:v', '1', png]);
  const { data, info } = await sharp(png).raw().toBuffer({ resolveWithObject: true });
  const px = (x, y) => {
    const i = (y * info.width + x) * info.channels;
    return [data[i], data[i + 1], data[i + 2]];
  };
  const esquinas = [
    px(2, 2),
    px(info.width - 3, 2),
    px(2, info.height - 3),
    px(info.width - 3, info.height - 3),
  ];
  const medio = [0, 1, 2].map((c) => Math.round(esquinas.reduce((s, e) => s + e[c], 0) / 4));

  // Si las esquinas no coinciden entre sí, el fondo no es plano y recortarlo por
  // color va a comerse partes del personaje.
  const dispersion = Math.max(...esquinas.map((e) => dist(e, medio)));
  return { color: medio, plano: dispersion < 30 };
}

const hex = (c) => '0x' + c.map((v) => v.toString(16).padStart(2, '0')).join('');

/** Saca `CUADROS` cuadros repartidos a lo largo del video, ya sin fondo. */
async function cuadrosDe(nn) {
  const video = path.join(ORIGEN, `fly${nn}.mp4`);
  if (!fs.existsSync(video)) return null;

  const dur = duracion(video);
  if (!dur) return null;

  const { color, plano } = await fondoDe(video);
  if (!plano) console.warn(`  ${nn}: el fondo no es plano, el recorte puede comerse el borde`);

  // El umbral fijo alcanza acá: estos videos ya se generaron con fondo plano a
  // propósito, y el ajuste fino por criatura lo hace `procesar.js` para las
  // animaciones, que es donde un borde sucio se nota moviéndose.
  const umbral = (60 / MAXIMA).toFixed(3);

  const salidas = [];
  for (let i = 0; i < CUADROS; i++) {
    // Se saltea el arranque y el final: suelen ser cuadros de transición donde
    // el personaje todavía no está armado.
    const t = dur * (0.08 + (0.84 * i) / (CUADROS - 1));
    const png = path.join(TEMP, `${nn}-${String(i + 1).padStart(2, '0')}.png`);
    correr([
      '-ss', t.toFixed(3),
      '-i', video,
      '-frames:v', '1',
      '-vf', `colorkey=${hex(color)}:${umbral}:${BLEND}`,
      '-c:v', 'png',
      png,
    ]);
    salidas.push(png);
  }
  return salidas;
}

/** Recorta al rectángulo donde hay algo opaco. */
async function recortar(png) {
  const img = sharp(png).ensureAlpha();
  const { data, info } = await img.raw().toBuffer({ resolveWithObject: true });
  const { width, height, channels } = info;

  let x0 = width;
  let y0 = height;
  let x1 = -1;
  let y1 = -1;
  let opacos = 0;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const a = data[(y * width + x) * channels + 3];
      // 40 y no 0: el desvanecido del borde deja un halo casi transparente que,
      // si contara, haría que el recorte abarcara casi todo el cuadro.
      if (a < 40) continue;
      opacos++;
      if (x < x0) x0 = x;
      if (y < y0) y0 = y;
      if (x > x1) x1 = x;
      if (y > y1) y1 = y;
    }
  }

  if (x1 < 0) return null;
  return {
    caja: { left: x0, top: y0, width: x1 - x0 + 1, height: y1 - y0 + 1 },
    opacos,
    width,
    height,
  };
}

/**
 * El cuadro más expresivo: el que más se aparta de la silueta promedio.
 *
 * Es una regla, no un criterio: una pose puede ser rara y fea. Sirve para no
 * arrancar de cero, y por eso las hojas de contactos existen.
 */
function masDistinto(medidas) {
  const validos = medidas.filter(Boolean);
  if (!validos.length) return 0;
  const medio =
    validos.reduce((s, m) => s + m.caja.width / m.caja.height, 0) / validos.length;
  let mejor = 0;
  let peorParecido = -1;
  medidas.forEach((m, i) => {
    if (!m) return;
    const d = Math.abs(m.caja.width / m.caja.height - medio) + m.opacos / (m.width * m.height);
    if (d > peorParecido) {
      peorParecido = d;
      mejor = i;
    }
  });
  return mejor;
}

/**
 * El tamaño con que el ojo lee una criatura.
 *
 * Ni la caja ni la mancha alcanzan por separado, y cada una falla para el lado
 * contrario:
 *
 * - Por **caja**, uno de alas finas y abiertas se ve enorme al lado de uno
 *   compacto, porque la caja está casi vacía.
 * - Por **mancha**, pasa lo inverso: al de alas finas hay que agrandarlo tanto
 *   para igualar los píxeles pintados que se sale de la ficha, y al macizo lo
 *   deja chiquito.
 *
 * La salida es igualar la media geométrica entre el lado que ocupa y la raíz de
 * su mancha. Al dibujarlo con lado `E`, su mancha queda `opacos · (E / caja)²`,
 * así que despejando `E` de
 *
 *     E^½ · (√opacos · E / caja)^½ = constante
 *
 * queda `E ∝ √caja / opacos^¼`.
 *
 * **La mancha va dividiendo, no multiplicando**, que es al revés de lo que
 * parece: lo que tiene mucha tinta hay que dibujarlo *más chico* para que pese
 * lo mismo que algo liviano. Tenerlo multiplicando —como estuvo un tiempo— le
 * daba más lugar justo a lo que ya se veía grande.
 */
const tamanoVisual = (medida) =>
  Math.sqrt(Math.max(medida.caja.width, medida.caja.height)) / Math.pow(medida.opacos, 0.25);

const centrada = (buf) =>
  sharp({
    create: { width: LADO, height: LADO, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } },
  }).composite([{ input: buf, gravity: 'center' }]);

/**
 * Escribe las dos piezas de una criatura, al lado que le toca.
 *
 * `lado` es cuánto va a medir su dimensión más larga adentro del cuadrado. Sale
 * de comparar el tamaño visual de las ocho, no de esta sola.
 */
async function escribirPieza(png, medida, lado, nn) {
  const ajustada = await sharp(png)
    .ensureAlpha()
    .extract(medida.caja)
    .resize(lado, lado, { fit: 'inside', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .toBuffer();

  await centrada(ajustada).webp({ quality: 88 }).toFile(path.join(DESTINO, `${nn}-quieto.webp`));

  // La sombra: la misma forma, todo negro. Sale del mismo cuadro y de la misma
  // escala, así que al encontrar la criatura el color entra sin que nada se
  // mueva.
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

  await centrada(negra).webp({ quality: 88 }).toFile(path.join(DESTINO, `${nn}-sombra.webp`));
}

const mediana = (ns) => {
  const o = [...ns].sort((a, b) => a - b);
  const m = Math.floor(o.length / 2);
  return o.length % 2 ? o[m] : (o[m - 1] + o[m]) / 2;
};

/** La hoja de contactos: los cuadros numerados, con el candidato marcado. */
async function hoja(nn, pngs, medidas, sugerido) {
  const celda = 220;
  const cols = 4;
  const filas = Math.ceil(pngs.length / cols);
  const capas = [];

  for (let i = 0; i < pngs.length; i++) {
    if (!medidas[i]) continue;
    const mini = await sharp(pngs[i])
      .ensureAlpha()
      .extract(medidas[i].caja)
      .resize(celda - 24, celda - 44, { fit: 'inside', background: { r: 0, g: 0, b: 0, alpha: 0 } })
      .toBuffer();
    capas.push({
      input: mini,
      left: (i % cols) * celda + 12,
      top: Math.floor(i / cols) * celda + 32,
    });
  }

  // El número de cada cuadro, y una marca en el sugerido.
  const etiquetas = pngs
    .map((_, i) => {
      const x = (i % cols) * celda + 12;
      const y = Math.floor(i / cols) * celda + 24;
      const marca = i === sugerido ? ' ←' : '';
      return `<text x="${x}" y="${y}" font-family="sans-serif" font-size="20" fill="${
        i === sugerido ? '#FFD35A' : '#FFFFFF'
      }">${i + 1}${marca}</text>`;
    })
    .join('');

  const svg = Buffer.from(
    `<svg width="${cols * celda}" height="${filas * celda}">${etiquetas}</svg>`
  );

  await sharp({
    create: {
      width: cols * celda,
      height: filas * celda,
      channels: 4,
      background: { r: 26, g: 22, b: 16, alpha: 1 },
    },
  })
    .composite([...capas, { input: svg, left: 0, top: 0 }])
    .png()
    .toFile(path.join(HOJAS, `${nn}-contactos.png`));
}

async function main() {
  const modo = process.argv[2];
  if (modo !== 'contactos' && modo !== 'generar') {
    console.error('Uso: node herramientas/poses.js contactos | generar [NN=cuadro ...]');
    process.exit(1);
  }

  /** Las elecciones pasadas por línea de comandos, 1-indexadas. */
  // Arranca de las decisiones tomadas a ojo; la linea de comandos las pisa.
  const elegidos = Object.fromEntries(Object.entries(ELEGIDOS).map(([nn, n]) => [nn, n - 1]));
  for (const a of process.argv.slice(3)) {
    const m = a.match(/^(\d{2})=(\d+)$/);
    if (m) elegidos[m[1]] = Number(m[2]) - 1;
  }

  const porEscribir = [];

  fs.mkdirSync(TEMP, { recursive: true });
  fs.mkdirSync(HOJAS, { recursive: true });
  fs.mkdirSync(DESTINO, { recursive: true });

  for (let i = 1; i <= 8; i++) {
    const nn = String(i).padStart(2, '0');
    process.stdout.write(`${nn} … `);

    const pngs = await cuadrosDe(nn);
    if (!pngs) {
      console.log('sin video, salteada');
      continue;
    }

    const medidas = [];
    for (const png of pngs) medidas.push(await recortar(png));

    const sugerido = elegidos[nn] ?? masDistinto(medidas);

    if (modo === 'contactos') {
      await hoja(nn, pngs, medidas, sugerido);
      console.log(`hoja lista, sugerido el ${sugerido + 1}`);
      continue;
    }

    const m = medidas[sugerido];
    if (!m) {
      console.log('el cuadro elegido salió vacío');
      continue;
    }

    // Primera pasada: solo se mide. De qué lado sale cada una depende de cómo
    // se ven las ocho juntas, así que no se puede escribir ninguna hasta
    // haberlas visto a todas.
    porEscribir.push({
      nn,
      png: pngs[sugerido],
      medida: m,
      visual: tamanoVisual(m),
      cuadro: sugerido + 1,
    });
    console.log(`cuadro ${sugerido + 1} medido`);
  }

  if (modo === 'generar' && porEscribir.length) {
    /*
     * El lado de cada una sale de igualar el tamaño visual, no la caja.
     *
     * Se busca el factor que lleva a la criatura del medio del grupo a ocupar
     * `ACHICA` del cuadrado, y se aplica el mismo factor a todas. Las que
     * tienen más presencia quedan más chicas de caja y las livianas más
     * grandes, que es justo lo que hace que se vean parejas.
     *
     * La mediana y no el promedio: si una sale rarísima de tamaño, el promedio
     * corre a las otras siete detrás de ella.
     */
    const referencia = mediana(porEscribir.map((p) => p.visual));
    const factor = (LADO * ACHICA) / referencia;

    console.log('');
    for (const p of porEscribir) {
      const largo = Math.max(p.medida.caja.width, p.medida.caja.height);
      // El techo evita que una criatura muy liviana —toda alas y poco cuerpo—
      // se agrande hasta salirse de la ficha.
      const lado = Math.min(Math.round(p.visual * factor), Math.round(LADO * TOPE));
      await escribirPieza(p.png, p.medida, lado, p.nn);
      console.log(
        `${p.nn} … cuadro ${p.cuadro}, lado ${lado} (caja ${largo}) → ${p.nn}-quieto.webp y ${p.nn}-sombra.webp`
      );
    }
  }

  fs.rmSync(TEMP, { recursive: true, force: true });

  if (modo === 'contactos') {
    console.log(`\nLas hojas quedaron en herramientas/poses/.`);
    console.log('Elegí el número de cada una y corré, por ejemplo:');
    console.log('  node herramientas/poses.js generar 01=7 02=3 03=11');
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
