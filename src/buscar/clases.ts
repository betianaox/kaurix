import type { Escena } from './etiquetas';

/**
 * ───────────────────────────────────────────────────────────────────────────
 * LAS CLASES DEL MODELO PROPIO
 * ───────────────────────────────────────────────────────────────────────────
 * Lo que sabe decir `modules/reconocedor/.../modelo.tflite`: cuarenta y nueve
 * nombres, los mismos de `modelo/clases.json` menos el jengibre, que no llegó a
 * tener fotos suficientes.
 *
 * Con el modelo base, las etiquetas son palabras en inglés —`Fruit`, `Rock`— y
 * `etiquetas.ts` las agrupa en escenas. Con el propio, cada etiqueta ya es una
 * de estas clases, y hacen dos cosas:
 *
 * 1. **Piden por nombre.** Un ingrediente con clase se consigue apuntando a esa
 *    cosa: ver `clase` en `objetivos.ts`.
 * 2. **Siguen dando escena.** Todo lo que no tiene clase —las gemas, la
 *    despensa, el tofu, el jengibre— se busca por escena y color como antes, y
 *    esas escenas salen de acá: `piedras` es la escena de piedra, cualquier
 *    fruta es `fruta` y también `comida`.
 *
 * ## Si se reentrena el modelo
 *
 * Esta lista tiene que decir lo mismo que `modelo/salida/etiquetas.txt`. Una
 * clase que el modelo tiene y acá no está se ignora en silencio; una que está
 * acá y el modelo no tiene nunca aparece. Lo verifica `npm run reconocedor`.
 */
export const CLASES = {
  // fruta
  manzana: ['fruta', 'comida'],
  banana: ['fruta', 'comida'],
  naranja: ['fruta', 'comida'],
  tomate: ['fruta', 'verdura', 'comida'],
  pera: ['fruta', 'comida'],
  frutilla: ['fruta', 'comida'],
  uva: ['fruta', 'comida'],
  durazno: ['fruta', 'comida'],
  lima: ['fruta', 'comida'],
  kiwi: ['fruta', 'comida'],
  arandanos: ['fruta', 'comida'],
  frambuesa: ['fruta', 'comida'],
  sandia: ['fruta', 'comida'],
  mango: ['fruta', 'comida'],
  anana: ['fruta', 'comida'],

  // verdura
  papa: ['verdura', 'comida', 'tierra'],
  cebolla: ['verdura', 'comida'],
  zanahoria: ['verdura', 'comida'],
  zucchini: ['verdura', 'comida'],
  palta: ['verdura', 'fruta', 'comida'],
  // Crece a la vista: una lechuga en el huerto también es planta.
  'hoja-verde': ['verdura', 'planta', 'comida'],
  morron: ['verdura', 'comida'],
  brocoli: ['verdura', 'comida'],
  maiz: ['verdura', 'comida'],
  arvejas: ['verdura', 'comida'],
  boniato: ['verdura', 'comida', 'tierra'],
  champinon: ['verdura', 'comida', 'tierra'],
  coliflor: ['verdura', 'comida'],

  // proteína
  'carne-roja': ['carne', 'comida'],
  pollo: ['carne', 'comida'],
  embutido: ['carne', 'comida'],
  camaron: ['carne', 'comida'],

  // flor
  manzanilla: ['flor', 'planta', 'pasto'],
  'diente-de-leon': ['flor', 'planta', 'pasto'],
  lavanda: ['flor', 'planta'],
  sauco: ['flor', 'planta'],
  brezo: ['flor', 'planta', 'pasto'],
  petalos: ['flor', 'planta'],
  hibisco: ['flor', 'planta'],

  // planta
  albahaca: ['planta'],
  romero: ['planta'],
  perejil: ['planta', 'verdura'],
  salvia: ['planta'],
  hinojo: ['planta', 'verdura'],

  // tierra
  ajo: ['verdura', 'tierra', 'comida'],

  // escenas: no son ingredientes, son lugares
  piedras: ['piedra'],
  ladrillo: ['ladrillo'],
  arena: ['arena'],
  alacena: ['alacena'],
} as const satisfies Record<string, readonly Escena[]>;

export type Clase = keyof typeof CLASES;

/** Si una etiqueta del modelo es una de las clases. */
export const esClase = (texto: string): texto is Clase => texto in CLASES;

/** Las escenas que dan las clases que se están viendo. */
export function escenasDeClases(clases: readonly string[]): Escena[] {
  const salida = new Set<Escena>();
  for (const c of clases) {
    if (esClase(c)) for (const e of CLASES[c]) salida.add(e);
  }
  return [...salida];
}
