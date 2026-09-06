import * as path from 'path';

/**
 * ───────────────────────────────────────────────────────────────────────────
 * PROBAR EL REPARTO DEL ÁLBUM SIN TELÉFONO
 * ───────────────────────────────────────────────────────────────────────────
 * `npm run album`.
 *
 * Simula una partida entera —ocho vueltas de ocho crecidas— y cuenta qué pasa.
 * Lo que hay que mirar:
 *
 * - que las 64 crecidas den 64 cartas distintas y ninguna repetida;
 * - que las ocho doradas salgan **todas** y ninguna antes de tener sus ocho;
 * - cuántas crecidas hacen falta para ver la primera hoja completa, que es lo
 *   que tarda el juego en mostrar su primer festejo.
 */

// El empaquetador de React Native sabe abrir un .webp; node no. Se le ensena a
// devolver un objeto vacio para poder cargar los modulos de verdad, que es lo
// que se quiere probar. Mismo truco que `probar-reconocedor`.
require.extensions['.webp'] = (m: NodeJS.Module) => {
  (m as { exports: unknown }).exports = {};
};

const raiz = path.join(__dirname, '..');

/* eslint-disable @typescript-eslint/no-require-imports */
const { ORDEN_DE_VUELTAS } = require(path.join(raiz, 'src/juego/datos'));
const { ACCIONES, hojaCompleta } = require(path.join(raiz, 'src/album/casillas'));
const { cartaAlCrecer, doradaPorCompletar } = require(path.join(raiz, 'src/album/sorteo'));
const { carta, LEGENDARIA } = require(path.join(raiz, 'src/juego/guardado'));
/* eslint-enable @typescript-eslint/no-require-imports */

const CRECIDAS_POR_VUELTA = ORDEN_DE_VUELTAS.length;
const VUELTAS = ORDEN_DE_VUELTAS.length;

function partida(azar: () => number) {
  const ganadas: string[] = [];
  const doradas: { criatura: string; crecida: number }[] = [];
  let repetidas = 0;
  let vacias = 0;
  /** Doradas que aparecieron sin tener las ocho: no debería pasar ninguna. */
  let doradasSueltas = 0;
  let crecida = 0;

  for (let vuelta = 1; vuelta <= VUELTAS; vuelta++) {
    for (let i = 0; i < CRECIDAS_POR_VUELTA; i++) {
      crecida++;
      // Cada vuelta se crían los ocho bichos, uno por uno.
      const criatura = ORDEN_DE_VUELTAS[i];

      const salio = cartaAlCrecer(criatura, ganadas, azar);
      if (!salio) {
        vacias++;
        continue;
      }
      if (ganadas.includes(salio.llave)) repetidas++;
      ganadas.push(salio.llave);

      const dorada = doradaPorCompletar(salio.criatura, ganadas);
      if (dorada) {
        if (!hojaCompleta(dorada, ganadas)) doradasSueltas++;
        ganadas.push(carta(dorada, LEGENDARIA));
        doradas.push({ criatura: dorada, crecida });
      }
    }
  }

  return { ganadas, doradas, repetidas, vacias, doradasSueltas, crecidas: crecida };
}

/** Azar reproducible, para que dos corridas digan lo mismo. */
function semilla(n: number) {
  let x = n;
  return () => {
    x = (x * 1664525 + 1013904223) % 4294967296;
    return x / 4294967296;
  };
}

const r = partida(semilla(7));
const acciones = r.ganadas.filter((k) => !k.endsWith(`:${LEGENDARIA}`));

console.log(`crecidas: ${r.crecidas}  |  cartas de acción: ${acciones.length} de ${VUELTAS * ACCIONES.length}`);
console.log(`repetidas: ${r.repetidas === 0 ? 'ninguna' : r.repetidas}`);
console.log(`crecidas sin premio: ${r.vacias === 0 ? 'ninguna' : r.vacias}`);
console.log(`doradas sueltas: ${r.doradasSueltas === 0 ? 'ninguna' : r.doradasSueltas}`);
console.log(`doradas: ${r.doradas.length} de ${VUELTAS}`);

console.log('\n─── cuándo se completó cada hoja ───');
for (const d of r.doradas) console.log(`  crecida ${String(d.crecida).padStart(2)}  ${d.criatura}`);

console.log('\n─── de qué hoja salió cada carta, por vuelta ───');
const porVuelta: string[][] = [];
{
  const ganadas: string[] = [];
  const azar = semilla(7);
  for (let vuelta = 0; vuelta < VUELTAS; vuelta++) {
    const fila: string[] = [];
    for (let i = 0; i < CRECIDAS_POR_VUELTA; i++) {
      const criatura = ORDEN_DE_VUELTAS[i];
      const salio = cartaAlCrecer(criatura, ganadas, azar);
      if (!salio) { fila.push('—'); continue; }
      ganadas.push(salio.llave);
      const dorada = doradaPorCompletar(salio.criatura, ganadas);
      if (dorada) ganadas.push(carta(dorada, LEGENDARIA));
      // Una marca cuando la carta salió de la hoja del bicho que se crió.
      fila.push(salio.criatura === criatura ? '●' : '·');
    }
    porVuelta.push(fila);
  }
}
for (const [i, fila] of porVuelta.entries()) {
  console.log(`  vuelta ${i + 1}: ${fila.join(' ')}`);
}
console.log('\n  ● la carta salió de la hoja del bicho que criaste');
console.log('  · salió de otra hoja');

const propias = porVuelta.flat().filter((c) => c === '●').length;
console.log(`\n  propias: ${propias} de ${porVuelta.flat().length}`);
