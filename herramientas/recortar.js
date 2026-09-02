/**
 * Separa una lámina de recetas en sus piezas sueltas.
 *
 *   node herramientas/recortar.js assets/food2.png
 *
 * Espera una imagen con fondo transparente. **No supone ninguna grilla**: busca
 * manchas de píxeles conectados entre sí y cada mancha es una pieza. Eso es lo
 * que le permite andar con láminas donde los renglones no están alineados, o
 * donde un dibujo alto invade el renglón de abajo.
 *
 * Antes esto funcionaba por proyección —qué filas y qué columnas tienen algo
 * dibujado— y andaba bien mientras entre renglón y renglón hubiera una línea
 * completamente vacía. En cuanto una lámina viene apretada, esa línea no existe
 * y salen dos renglones pegados; forzar la grilla en partes iguales tampoco
 * sirve, porque corta los dibujos por la mitad.
 *
 * Los signos `+` y `=` se descartan solos: son las únicas piezas casi
 * completamente negras.
 *
 * Deja cada pieza recortada al ras en `herramientas/recortes/<lámina>/`, con el
 * nombre `fFcC.png` —fila y columna, deducidas de dónde quedó cada una— y una
 * hoja de contactos numerada para poder decir cuál es cuál sin abrir carpeta.
 *
 * ## Las tres láminas, con lo que necesita cada una
 *
 *   node herramientas/recortar.js assets/pociones.png --union 4   → 56 piezas
 *   node herramientas/recortar.js assets/food1.png                → 55 piezas
 *   node herramientas/recortar.js assets/food2.png                → 70 piezas
 *
 * La de pociones necesita más engorde por los pétalos de rosa, que son cuatro
 * manchas separadas de un mismo ingrediente. Si el número de piezas no da,
 * mirá la hoja de contactos antes de seguir: de más significa que algo se
 * partió, de menos que dos cosas se pegaron.
 */

const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const arg = (nombre, porDefecto) => {
  const i = process.argv.indexOf('--' + nombre);
  return i > -1 ? Number(process.argv[i + 1]) : porDefecto;
};

/** Desde qué opacidad se considera que un píxel es parte del dibujo. */
const OPACO = 40;

/**
 * Cuánto se achica la imagen para buscar las manchas.
 *
 * Buscar sobre 23 millones de píxeles es lento y no hace falta: para saber
 * dónde está cada pieza alcanza con una versión chica. El recorte fino se hace
 * después, sobre el original.
 */
const ESCALA = arg('escala', 4);

/**
 * Cuántos píxeles se engorda el dibujo antes de buscar manchas, en la imagen
 * chica.
 *
 * Es lo que hace que las partes sueltas de una misma pieza —unos pétalos, las
 * semillas al lado del choclo— se peguen y cuenten como una sola. Muy grande
 * empieza a pegar piezas distintas entre sí.
 */
const UNION = arg('union', 3);

/** Una pieza más chica que esto, en la imagen chica, es basura. */
const MINIMO = arg('minimo', 12);

/** Debajo de este promedio de color, la pieza es un signo y no un ingrediente. */
const NEGRO = 45;

const entrada = process.argv[2];
if (!entrada || !fs.existsSync(entrada)) {
  console.error('Uso: node herramientas/recortar.js <lámina.png> [--escala 4] [--union 4]');
  process.exit(1);
}

const nombre = path.parse(entrada).name;
const DESTINO = path.join(__dirname, 'recortes', nombre);

/** Engorda la máscara, primero a lo ancho y después a lo alto. */
function engordar(mascara, ancho, alto, radio) {
  const paso = (origen, largoLinea, cantidad, saltoPixel, saltoLinea) => {
    const salida = new Uint8Array(origen.length);
    for (let l = 0; l < cantidad; l++) {
      for (let p = 0; p < largoLinea; p++) {
        let hay = 0;
        for (let d = -radio; d <= radio && !hay; d++) {
          const q = p + d;
          if (q < 0 || q >= largoLinea) continue;
          if (origen[l * saltoLinea + q * saltoPixel]) hay = 1;
        }
        salida[l * saltoLinea + p * saltoPixel] = hay;
      }
    }
    return salida;
  };

  const horizontal = paso(mascara, ancho, alto, 1, ancho);
  // Para el paso vertical se recorre por columnas: el salto entre píxeles de
  // una misma columna es el ancho de la imagen.
  const salida = new Uint8Array(horizontal.length);
  for (let x = 0; x < ancho; x++) {
    for (let y = 0; y < alto; y++) {
      let hay = 0;
      for (let d = -radio; d <= radio && !hay; d++) {
        const q = y + d;
        if (q < 0 || q >= alto) continue;
        if (horizontal[q * ancho + x]) hay = 1;
      }
      salida[y * ancho + x] = hay;
    }
  }
  return salida;
}

/**
 * Las manchas conectadas de la máscara, cada una con su caja.
 *
 * Devuelve también a qué mancha pertenece cada píxel. Hace falta para el
 * recorte fino: dos piezas vecinas pueden quedar tan cerca que la caja de una
 * roce a la otra, y sin saber de quién es cada píxel se cuela un pedazo del
 * dibujo de al lado.
 */
function manchas(mascara, ancho, alto) {
  const visto = new Uint8Array(mascara.length);
  const etiquetas = new Int32Array(mascara.length).fill(-1);
  const salida = [];
  const pila = new Int32Array(mascara.length);

  for (let inicio = 0; inicio < mascara.length; inicio++) {
    if (!mascara[inicio] || visto[inicio]) continue;

    const cual = salida.length;
    let tope = 0;
    pila[tope++] = inicio;
    visto[inicio] = 1;
    etiquetas[inicio] = cual;

    let x0 = ancho;
    let y0 = alto;
    let x1 = -1;
    let y1 = -1;
    let n = 0;

    while (tope > 0) {
      const i = pila[--tope];
      const x = i % ancho;
      const y = (i / ancho) | 0;
      n++;
      if (x < x0) x0 = x;
      if (y < y0) y0 = y;
      if (x > x1) x1 = x;
      if (y > y1) y1 = y;

      // Ocho vecinos: con solo cuatro, una diagonal fina parte la pieza.
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          const vx = x + dx;
          const vy = y + dy;
          if (vx < 0 || vy < 0 || vx >= ancho || vy >= alto) continue;
          const j = vy * ancho + vx;
          if (mascara[j] && !visto[j]) {
            visto[j] = 1;
            etiquetas[j] = cual;
            pila[tope++] = j;
          }
        }
      }
    }

    // La mancha se guarda igual aunque sea basura: su etiqueta ya está puesta
    // en el mapa y los índices tienen que seguir coincidiendo. Las chicas se
    // descartan después.
    salida.push({ x0, y0, x1, y1, n, sirve: x1 - x0 + 1 >= MINIMO && y1 - y0 + 1 >= MINIMO });
  }

  return { salida, etiquetas };
}

(async () => {
  const original = sharp(entrada).ensureAlpha();
  const meta = await original.metadata();
  const { width: W, height: H } = meta;
  console.log(`${nombre}: ${W}x${H}`);

  const w = Math.round(W / ESCALA);
  const h = Math.round(H / ESCALA);

  const chica = await sharp(entrada)
    .ensureAlpha()
    .resize(w, h, { fit: 'fill' })
    .raw()
    .toBuffer({ resolveWithObject: true });

  const canales = chica.info.channels;
  const mascara = new Uint8Array(w * h);
  for (let i = 0, p = 0; i < chica.data.length; i += canales, p++) {
    mascara[p] = chica.data[i + 3] >= OPACO ? 1 : 0;
  }

  const { salida: encontradas, etiquetas } = manchas(engordar(mascara, w, h, UNION), w, h);
  console.log(`manchas: ${encontradas.filter((m) => m.sirve).length}`);

  // Los datos crudos del original, para recortar al ras y para distinguir los
  // signos por su color.
  const grande = await original.raw().toBuffer({ resolveWithObject: true });
  const gc = grande.info.channels;

  const piezas = [];

  for (let cual = 0; cual < encontradas.length; cual++) {
    const m = encontradas[cual];
    if (!m.sirve) continue;
    // Se vuelve a la escala real con un margen, y ahí se busca la caja exacta.
    const bx0 = Math.max(0, m.x0 * ESCALA - ESCALA * 2);
    const by0 = Math.max(0, m.y0 * ESCALA - ESCALA * 2);
    const bx1 = Math.min(W - 1, (m.x1 + 1) * ESCALA + ESCALA * 2);
    const by1 = Math.min(H - 1, (m.y1 + 1) * ESCALA + ESCALA * 2);

    let x0 = bx1;
    let y0 = by1;
    let x1 = bx0;
    let y1 = by0;
    let suma = 0;
    let opacos = 0;

    for (let y = by0; y <= by1; y++) {
      for (let x = bx0; x <= bx1; x++) {
        const i = (y * W + x) * gc;
        if (grande.data[i + 3] < OPACO) continue;
        // Solo los píxeles de esta mancha: los del dibujo de al lado quedan
        // afuera aunque caigan adentro de la ventana.
        const lx = Math.min(w - 1, (x / ESCALA) | 0);
        const ly = Math.min(h - 1, (y / ESCALA) | 0);
        if (etiquetas[ly * w + lx] !== cual) continue;
        if (x < x0) x0 = x;
        if (y < y0) y0 = y;
        if (x > x1) x1 = x;
        if (y > y1) y1 = y;
        suma += grande.data[i] + grande.data[i + 1] + grande.data[i + 2];
        opacos++;
      }
    }

    if (!opacos || x1 < x0) continue;
    if (suma / 3 / opacos < NEGRO) continue; // es un + o un =

    piezas.push({
      caja: { left: x0, top: y0, width: x1 - x0 + 1, height: y1 - y0 + 1 },
      centroY: (y0 + y1) / 2,
      centroX: (x0 + x1) / 2,
    });
  }

  /*
   * En qué renglón quedó cada pieza.
   *
   * Se agrupan por su centro vertical: dos piezas del mismo renglón tienen el
   * centro parecido aunque midan muy distinto. El corte es la mitad del alto
   * típico, que aguanta que un renglón esté un poco corrido respecto del otro.
   */
  const altos = piezas.map((p) => p.caja.height).sort((a, b) => a - b);
  const altoTipico = altos[Math.floor(altos.length / 2)] || 1;
  const corte = altoTipico * 0.6;

  piezas.sort((a, b) => a.centroY - b.centroY);

  let fila = 0;
  let referencia = piezas.length ? piezas[0].centroY : 0;
  for (const p of piezas) {
    if (p.centroY - referencia > corte) {
      fila++;
      referencia = p.centroY;
    }
    p.fila = fila;
  }

  // Dentro de cada renglón, de izquierda a derecha.
  piezas.sort((a, b) => a.fila - b.fila || a.centroX - b.centroX);

  fs.rmSync(DESTINO, { recursive: true, force: true });
  fs.mkdirSync(DESTINO, { recursive: true });

  const porFila = {};
  for (const p of piezas) {
    porFila[p.fila] = (porFila[p.fila] || 0) + 1;
    p.archivo = `f${String(p.fila + 1).padStart(2, '0')}c${porFila[p.fila]}.png`;
    await sharp(entrada).ensureAlpha().extract(p.caja).png().toFile(path.join(DESTINO, p.archivo));
  }

  console.log(`piezas: ${piezas.length} en ${fila + 1} renglones`);

  // --- la hoja de contactos ---------------------------------------------------

  const CELDA = 190;
  const COLS = 8;
  const capas = [];
  const rotulos = [];

  for (let i = 0; i < piezas.length; i++) {
    const mini = await sharp(path.join(DESTINO, piezas[i].archivo))
      .resize(CELDA - 30, CELDA - 46, { fit: 'inside' })
      .toBuffer();

    capas.push({
      input: mini,
      left: (i % COLS) * CELDA + 15,
      top: Math.floor(i / COLS) * CELDA + 34,
    });

    rotulos.push(
      `<text x="${(i % COLS) * CELDA + CELDA / 2}" y="${Math.floor(i / COLS) * CELDA + 24}" ` +
        `text-anchor="middle" font-family="sans-serif" font-size="15" fill="#E6DFD2">` +
        `${i + 1} · ${piezas[i].archivo.replace('.png', '')}</text>`
    );
  }

  const filasHoja = Math.ceil(piezas.length / COLS);
  const hoja = path.join(__dirname, 'recortes', `${nombre}-hoja.png`);

  await sharp({
    create: {
      width: COLS * CELDA,
      height: filasHoja * CELDA,
      channels: 4,
      background: { r: 21, g: 19, b: 31, alpha: 1 },
    },
  })
    .composite([
      ...capas,
      {
        input: Buffer.from(
          `<svg width="${COLS * CELDA}" height="${filasHoja * CELDA}">${rotulos.join('')}</svg>`
        ),
        left: 0,
        top: 0,
      },
    ])
    .png()
    .toFile(hoja);

  console.log(`hoja: ${hoja}`);
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
