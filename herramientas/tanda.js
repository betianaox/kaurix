/**
 * Convierte la tanda completa de una o varias criaturas y escribe el bloque
 * que va en `src/art/index.ts`.
 *
 *   node herramientas/tanda.js assets/eggs 1 8
 *
 * Espera cuatro videos por criatura, numerados igual:
 *
 *   eggNN   el huevo en reposo, en loop
 *   failNN  el intento de salir que no lo logra, una sola vez
 *   eclNN   la eclosión, una sola vez
 *   flyNN   el adulto volando, en loop
 *
 * Las dos animaciones de un solo pase se generan al doble de velocidad: son
 * momentos de acción y a velocidad normal se hacen largos, además de pesar el
 * doble.
 */

const { execFileSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const PROCESAR = path.join(__dirname, 'procesar.js');
const DESTINO = path.join(__dirname, '..', 'assets', 'criaturas');

const carpeta = process.argv[2];
const primero = Number(process.argv[3] ?? 1);
const ultimo = Number(process.argv[4] ?? 8);

if (!carpeta || !fs.existsSync(carpeta)) {
  console.error('Uso: node herramientas/tanda.js <carpeta> [primero] [ultimo]');
  process.exit(1);
}

/** Cada pieza, con las opciones que le corresponden. */
const PIEZAS = [
  { prefijo: 'egg', sufijo: 'huevo', opciones: [] },
  { prefijo: 'fail', sufijo: 'falla', opciones: ['--loops', '1', '--velocidad', '2'] },
  {
    prefijo: 'ecl',
    sufijo: 'eclosion',
    opciones: ['--loops', '1', '--velocidad', '2', '--sin-seguimiento'],
  },
  { prefijo: 'fly', sufijo: 'adulto', opciones: [] },
];

const COMUNES = ['--ancho', '700', '--fps', '12', '--calidad', '80'];

const resultados = [];

for (let i = primero; i <= ultimo; i++) {
  const nn = String(i).padStart(2, '0');
  const criatura = { id: nn, piezas: {} };

  for (const pieza of PIEZAS) {
    const entrada = path.join(carpeta, `${pieza.prefijo}${nn}.mp4`);
    if (!fs.existsSync(entrada)) {
      console.error(`  falta ${entrada}`);
      continue;
    }

    const salida = path.join(DESTINO, `${nn}-${pieza.sufijo}.webp`);
    const salidaTexto = execFileSync(
      'node',
      [PROCESAR, entrada, ...COMUNES, ...pieza.opciones, '--salida', salida],
      { encoding: 'utf8' }
    );

    const escala = Number(salidaTexto.match(/escala:\s+([\d.]+)/)?.[1] ?? 0);
    const duracion = Number(salidaTexto.match(/duracion:\s+(\d+) ms/)?.[1] ?? 0);
    const peso = Number(salidaTexto.match(/peso:\s+([\d.]+) MB/)?.[1] ?? 0);
    const sinAlfa = /SIN ALFA/.test(salidaTexto);

    criatura.piezas[pieza.sufijo] = { escala, duracion, peso, sinAlfa, salida };

    console.log(
      `${nn} ${pieza.sufijo.padEnd(9)} escala ${escala.toFixed(3)}  ` +
        `${String(duracion).padStart(4)} ms  ${peso.toFixed(2)} MB` +
        (sinAlfa ? '   SIN ALFA, revisar' : '')
    );
  }

  resultados.push(criatura);
}

// --- el bloque para pegar en el registro ------------------------------------

console.log('\n\n// ---- para src/art/index.ts ----\n');

for (const c of resultados) {
  const p = c.piezas;
  if (!p.adulto) continue;

  console.log(`  {
    id: 'criatura-${c.id}',
    nombre: 'Criatura ${c.id}',
    elemento: 'agua',
    arte: require('../../assets/criaturas/${c.id}-adulto.webp'),
    escala: ${p.adulto.escala},${
      p.huevo
        ? `
    huevo: {
      arte: require('../../assets/criaturas/${c.id}-huevo.webp'),
      escala: ${p.huevo.escala},
    },`
        : ''
    }${
      p.falla
        ? `
    falla: {
      arte: require('../../assets/criaturas/${c.id}-falla.webp'),
      escala: ${p.falla.escala},
      duracion: ${p.falla.duracion},
    },`
        : ''
    }${
      p.eclosion
        ? `
    eclosion: {
      arte: require('../../assets/criaturas/${c.id}-eclosion.webp'),
      escala: ${p.eclosion.escala},
      duracion: ${p.eclosion.duracion},
    },`
        : ''
    }
  },`);
}

const total = resultados
  .flatMap((c) => Object.values(c.piezas))
  .reduce((s, p) => s + p.peso, 0);

console.log(`\n// total del arte: ${total.toFixed(1)} MB`);
