/**
 * Prueba la tabla del reconocedor sin un teléfono en la mano.
 *
 *   npm run reconocedor
 *
 * Le da a `resolver` escenas y colores inventados y muestra qué aparecería con
 * cada uno, más el reparto real en dos mil apariciones.
 *
 * ## Para qué sirve
 *
 * La tabla de `src/buscar/objetivos.ts` son setenta y cuatro entradas escritas a
 * mano, y sus errores **no dan ningún síntoma**: un ingrediente mal apuntado
 * simplemente no aparece nunca, o aparece donde no corresponde, y eso jugando no
 * se nota hasta que ya pasaron semanas.
 *
 * Esta herramienta encontró cuatro errores reales antes de que el código llegara
 * a un teléfono:
 *
 * 1. Una pared blanca se leía **amarilla**: la saturación mínima era fija y un
 *    color casi blanco la superaba con cualquier tinte de la lámpara.
 * 2. `seafood` contenía `food`, así que una foto de fruta activaba la escena de
 *    la carne. Lo mismo `flowerpot` con `flower`.
 * 3. Apuntar a una naranja daba **doce frutas distintas**: la tolerancia de
 *    color valía lo mismo que acertar el color.
 * 4. Unas piedras grises daban piedra luna y obsidiana, **las dos gemas más
 *    raras del juego**, porque eran las únicas dos con el gris de vecino.
 *
 * ## Lo que NO prueba
 *
 * Ni la cámara, ni el modelo, ni el color real de una foto. Eso necesita un
 * build nativo. Acá se prueba de la lectura para adentro: dado que la cámara
 * diga *esto*, ¿aparece lo que tiene que aparecer?
 */

import * as fs from 'fs';
import * as path from 'path';

// El empaquetador de React Native sabe abrir un .webp; node no. Se le ensena a
// devolver un objeto vacio para poder cargar los modulos de verdad, que es lo
// que se quiere probar.
require.extensions['.webp'] = (m: NodeJS.Module) => {
  (m as { exports: unknown }).exports = {};
};

const raiz = path.join(__dirname, '..');

/* eslint-disable @typescript-eslint/no-require-imports */
const { OBJETIVOS, objetivosCompletos } = require(path.join(raiz, 'src/buscar/objetivos'));
const { cumple } = require(path.join(raiz, 'src/buscar/resolver'));
const { tonoDe } = require(path.join(raiz, 'src/buscar/tonos'));
const { escenasDe } = require(path.join(raiz, 'src/buscar/etiquetas'));
/* eslint-enable @typescript-eslint/no-require-imports */

type Rgb = { r: number; g: number; b: number };
type Lectura = { escenas: string[]; tono: string | null };
type Ing = { id: string; nombre: string; lugar: string; peso: number };

/**
 * La lista de ingredientes, leída del fuente con una expresión regular.
 *
 * Importarla arrastraría las setenta y cuatro imágenes. Se podría anular el
 * `require` de los `.webp` —de hecho se hace arriba— pero leer el texto es más
 * directo y de paso verifica que la lista tenga la forma que se espera.
 */
function ingredientes(): Ing[] {
  const src = fs.readFileSync(path.join(raiz, 'src/juego/ingredientes.ts'), 'utf8');
  const re = /\{ id: '([^']+)', nombre: '([^']+)', lugar: '([^']+)', peso: (\d+)/g;
  const salida: Ing[] = [];
  let m: RegExpExecArray | null;
  while ((m = re.exec(src))) {
    salida.push({ id: m[1], nombre: m[2], lugar: m[3], peso: Number(m[4]) });
  }
  return salida;
}

const ING = ingredientes();

type Candidato = { ing: Ing; fuerza: 'principal' | 'alternativa' };

/** La misma cuenta que `candidatos`, sobre la lista leída del fuente. */
function resolver(l: Lectura): Candidato[] {
  const salida: Candidato[] = [];
  for (const ing of ING) {
    const o = OBJETIVOS[ing.id];
    if (!o) continue;
    const suyo = o.principal ? cumple(o.principal, l) : null;
    if (suyo === 'exacto') {
      salida.push({ ing, fuerza: 'principal' });
      continue;
    }
    const porAlternativa = o.alternativas.some(
      (a: unknown) => cumple(a as never, l as never) !== null
    );
    if (suyo === 'vecino' || porAlternativa) salida.push({ ing, fuerza: 'alternativa' });
  }
  return salida;
}

const lee = (etiquetas: string[], color: Rgb): Lectura => ({
  escenas: escenasDe(etiquetas),
  tono: tonoDe(color),
});

/** Las escenas que se prueban. Agregar acá al afinar la tabla. */
const CASOS: { que: string; etiquetas: string[]; color: Rgb }[] = [
  { que: 'una naranja', etiquetas: ['Fruit', 'Orange', 'Food'], color: { r: 243, g: 146, b: 55 } },
  { que: 'tomates', etiquetas: ['Fruit', 'Vegetable', 'Food'], color: { r: 200, g: 40, b: 40 } },
  { que: 'una banana', etiquetas: ['Fruit', 'Banana'], color: { r: 235, g: 205, b: 60 } },
  { que: 'lechuga', etiquetas: ['Vegetable', 'Lettuce'], color: { r: 110, g: 170, b: 70 } },
  { que: 'pared de ladrillo', etiquetas: ['Brick', 'Wall'], color: { r: 170, g: 70, b: 55 } },
  { que: 'piedras grises', etiquetas: ['Rock', 'Stone'], color: { r: 150, g: 150, b: 152 } },
  { que: 'piedra violeta', etiquetas: ['Rock'], color: { r: 150, g: 100, b: 200 } },
  { que: 'arena', etiquetas: ['Sand', 'Beach'], color: { r: 214, g: 184, b: 130 } },
  { que: 'la alacena', etiquetas: ['Kitchen', 'Shelf', 'Bottle'], color: { r: 180, g: 160, b: 130 } },
  { que: 'la heladera', etiquetas: ['Refrigerator', 'Food'], color: { r: 200, g: 90, b: 90 } },
  { que: 'pasto', etiquetas: ['Grass', 'Plant'], color: { r: 90, g: 150, b: 60 } },
  { que: 'una maceta', etiquetas: ['Potted plant', 'Soil'], color: { r: 120, g: 82, b: 48 } },
  { que: 'flor amarilla', etiquetas: ['Flower', 'Plant'], color: { r: 240, g: 210, b: 60 } },
  { que: 'flor violeta', etiquetas: ['Flower'], color: { r: 150, g: 100, b: 200 } },
  { que: 'pared blanca', etiquetas: ['Wall'], color: { r: 240, g: 238, b: 235 } },
  { que: 'el techo, nada', etiquetas: [], color: { r: 245, g: 245, b: 245 } },
];

/** Cuántas veces sale cada uno, con el sorteo por peso de `elegir`. */
function reparto(cs: Candidato[], vueltas = 2000): string {
  if (cs.length === 0) return '—';
  const hayPrincipal = cs.some((c) => c.fuerza === 'principal');
  const enJuego = hayPrincipal ? cs.filter((c) => c.fuerza === 'principal') : cs;
  const total = enJuego.reduce((s, c) => s + c.ing.peso, 0);

  const cuenta: Record<string, number> = {};
  for (let i = 0; i < vueltas; i++) {
    let corte = Math.random() * total;
    for (const c of enJuego) {
      corte -= c.ing.peso;
      if (corte <= 0) {
        cuenta[c.ing.nombre] = (cuenta[c.ing.nombre] ?? 0) + 1;
        break;
      }
    }
  }

  return Object.entries(cuenta)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 4)
    .map(([n, v]) => `${n} ${Math.round((v / vueltas) * 100)}%`)
    .join(', ');
}

function main() {
  const { faltan, sobran } = objetivosCompletos(ING.map((i) => i.id));
  console.log(`ingredientes: ${ING.length}  |  objetivos escritos: ${Object.keys(OBJETIVOS).length}`);
  console.log(`faltan: ${faltan.length ? faltan.join(', ') : 'ninguno'}`);
  console.log(`sobran: ${sobran.length ? sobran.join(', ') : 'ninguno'}`);

  console.log('\n─── qué aparece ───');
  for (const caso of CASOS) {
    const l = lee(caso.etiquetas, caso.color);
    const cs = resolver(l);
    const pri = cs.filter((c) => c.fuerza === 'principal').length;
    console.log(
      `${caso.que.padEnd(18)} ${(l.escenas.join(',') || '—').padEnd(20)} ${String(l.tono).padEnd(9)}` +
        ` ${pri} pri / ${cs.length - pri} alt   ${reparto(cs)}`
    );
  }
}

main();
