/**
 * Busca el color de fondo que más lejos queda de todos los colores del
 * personaje.
 *
 * El recorte por color borra todo lo que se parezca al fondo, mida lo que mida
 * el parecido. Así que lo que importa no es qué color "se ve distinto", sino
 * cuál está a mayor distancia del color del personaje que más se le acerca.
 * Ese mínimo es el que manda: define cuánta tolerancia se puede usar antes de
 * empezar a comerse al personaje.
 */

const { execFileSync } = require('child_process');
const path = require('path');

let FFMPEG;
try {
  FFMPEG = require('ffmpeg-static');
} catch {
  console.error('Falta ffmpeg. Corré: npm install');
  process.exit(1);
}
const input = process.argv[2];
const N = 256;

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

// El fondo es el color de las esquinas del primer cuadro.
const esquina = (x, y) => {
  const i = (y * N + x) * 3;
  return [raw[i], raw[i + 1], raw[i + 2]];
};
const fondo = esquina(0, 0);

const dist = (a, b) =>
  Math.sqrt((a[0] - b[0]) ** 2 + (a[1] - b[1]) ** 2 + (a[2] - b[2]) ** 2);

// Píxeles del personaje: los que están lejos del fondo actual. Se descartan los
// intermedios (el borde antialiaseado) para no contaminar la medición.
const personaje = [];
for (let f = 0; f < cuadros; f += 4) {
  for (let p = 0; p < N * N; p++) {
    const i = f * porCuadro + p * 3;
    const c = [raw[i], raw[i + 1], raw[i + 2]];
    if (dist(c, fondo) > 140) personaje.push(c);
  }
}

const candidatos = {
  'magenta puro   #FF00FF': [255, 0, 255],
  'verde puro     #00FF00': [0, 255, 0],
  'azul puro      #0000FF': [0, 0, 255],
  'violeta        #8000FF': [128, 0, 255],
  'verde croma    #00B140': [0, 177, 64],
  'azul croma     #0047BB': [0, 71, 187],
  'amarillo       #FFFF00': [255, 255, 0],
  'cyan           #00FFFF': [0, 255, 255],
  'azul rey       #0033CC': [0, 51, 204],
  'azul noche     #000080': [0, 0, 128],
  'gris medio     #808080': [128, 128, 128],
  'gris oscuro    #404040': [64, 64, 64],
  'gris claro     #C0C0C0': [192, 192, 192],
  'el fondo actual': fondo,
};

console.log(`personaje: ${personaje.length} píxeles muestreados de ${Math.ceil(cuadros / 4)} cuadros`);
console.log(`fondo actual: ${fondo.join(',')}\n`);

const resultados = Object.entries(candidatos).map(([nombre, color]) => {
  let min = Infinity;
  for (const c of personaje) {
    const d = dist(c, color);
    if (d < min) min = d;
  }
  return { nombre, color, min, margen: min / 441.67 };
});

resultados.sort((a, b) => b.min - a.min);

console.log('color                    distancia mínima   tolerancia máxima segura');
for (const r of resultados) {
  const barra = '█'.repeat(Math.round(r.margen * 40));
  console.log(
    `${r.nombre.padEnd(24)} ${String(Math.round(r.min)).padStart(5)}            ${r.margen.toFixed(2)}  ${barra}`
  );
}
