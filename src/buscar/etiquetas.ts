/**
 * ───────────────────────────────────────────────────────────────────────────
 * QUÉ DICE EL MODELO Y QUÉ ENTIENDE EL JUEGO
 * ───────────────────────────────────────────────────────────────────────────
 * El etiquetador devuelve palabras en inglés de un vocabulario cerrado —`Fruit`,
 * `Rock`, `Countertop`—. Acá se agrupan en las **escenas** que el juego usa.
 *
 * ## Por qué escenas y no etiquetas sueltas
 *
 * Un objetivo que pidiera la etiqueta `Rock` fallaría en un patio de baldosas,
 * donde el modelo dice `Floor`. Uno que pidiera `Fruit` fallaría con una
 * manzana sola sobre la mesa, donde dice `Apple`. Agrupando, "estoy mirando
 * piedra" es una sola pregunta y no una lista de casos.
 *
 * ## Las etiquetas van en minúscula y sin acentos
 *
 * El modelo devuelve `Granny Smith` y `Potted plant`; acá todo se normaliza
 * antes de comparar. Sin eso, cada etiqueta nueva es una oportunidad de escribir
 * mal una mayúscula y que no matchee nunca, que es un error que no da ningún
 * síntoma: simplemente no aparece nada.
 *
 * ## Lo que NO está acá
 *
 * El color. Vive en `tonos.ts` y se cruza con esto en `objetivos.ts`. Son dos
 * señales independientes a propósito: la etiqueta dice qué clase de cosa hay y
 * el color desempata cuál. Ver `../docs/kaurix-reconocer-el-lugar.md`.
 */

/**
 * Las escenas que el juego sabe reconocer.
 *
 * Son el vocabulario con el que se escriben los objetivos de cada ingrediente.
 */
export type Escena =
  | 'fruta'
  | 'verdura'
  | 'planta'
  | 'flor'
  | 'pasto'
  | 'tierra'
  | 'piedra'
  | 'ladrillo'
  | 'arena'
  | 'alacena'
  | 'carne'
  | 'comida';

/**
 * Qué etiquetas del modelo activan cada escena.
 *
 * Generosas a propósito. El costo de una etiqueta de más es que a veces aparezca
 * algo donde no correspondía; el de una de menos es que apuntes a lo correcto y
 * no pase nada, que es mucho peor: la primera se lee como suerte y la segunda
 * como que el juego está roto.
 *
 * Salen del modelo base de ML Kit. Las que ese modelo no tiene están igual
 * —`ginger`, `garlic`, `strawberry`— porque un modelo propio sí las va a tener
 * y entonces esto ya está escrito. Ver la etapa dos del plan.
 */
export const ETIQUETAS: Record<Escena, readonly string[]> = {
  fruta: [
    'fruit',
    'apple',
    'granny smith',
    'orange',
    'lemon',
    'lime',
    'banana',
    'strawberry',
    'pineapple',
    'grape',
    'peach',
    'pear',
    'kiwi',
    'watermelon',
    'mango',
    'melon',
    'berry',
    'blueberry',
    'raspberry',
    'fig',
    'pomegranate',
    'citrus',
    'tomato',
  ],
  verdura: [
    'vegetable',
    'broccoli',
    'cauliflower',
    'zucchini',
    'cucumber',
    'bell pepper',
    'pepper',
    'mushroom',
    'corn',
    'potato',
    'onion',
    'carrot',
    'lettuce',
    'cabbage',
    'head cabbage',
    'spinach',
    'kale',
    'celery',
    'avocado',
    'pea',
    'squash',
    'artichoke',
    'salad',
    'leaf vegetable',
  ],
  planta: [
    'plant',
    'flora',
    'houseplant',
    'potted plant',
    'leaf',
    'herb',
    'tree',
    'shrub',
    'bush',
    'garden',
    'vegetation',
    'branch',
  ],
  flor: ['flower', 'petal', 'blossom', 'daisy', 'rose', 'bouquet', 'flowering plant', 'flowerpot'],
  pasto: ['grass', 'lawn', 'meadow', 'field', 'turf', 'grassland'],
  tierra: ['soil', 'dirt', 'ground', 'mud', 'compost', 'flowerpot', 'garden'],
  piedra: ['rock', 'stone', 'pebble', 'gravel', 'boulder', 'mineral', 'cliff', 'concrete'],
  // SIN `wall` A SECAS. Una pared blanca es la superficie mas comun que hay en
  // una casa, y con `wall` en la lista daba la escena del ladrillo: apuntarle
  // devolvia piedra luna --la segunda gema mas rara-- el cien por ciento de las
  // veces. Una pared tiene que decir de que esta hecha para contar.
  ladrillo: ['brick', 'brickwork', 'brick wall', 'masonry', 'stone wall'],
  arena: ['sand', 'beach', 'dune', 'sandstone', 'desert'],
  alacena: [
    'kitchen',
    'countertop',
    'cupboard',
    'shelf',
    'shelving',
    'pantry',
    'bottle',
    'jar',
    'container',
    'canning',
    'supermarket',
    'grocery store',
    'refrigerator',
    'tableware',
    'cookware and bakeware',
  ],
  carne: ['meat', 'beef', 'pork', 'chicken', 'steak', 'sausage', 'seafood', 'fish', 'shrimp', 'ham'],
  comida: ['food', 'dish', 'cuisine', 'ingredient', 'recipe', 'meal', 'produce'],
};

/**
 * Deja una etiqueta comparable: minúscula, sin acentos y sin espacios de más.
 *
 * Se aplica a lo que devuelve el modelo Y a lo que está escrito acá arriba, así
 * que las dos puntas se normalizan igual y no hay forma de que se desincronicen.
 */
export function normalizar(texto: string): string {
  return texto
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .trim();
}

/**
 * La etiqueta contiene el término **como palabra entera**.
 *
 * No alcanza con `includes` de subcadena, y no es una sutileza: con eso,
 * `seafood` contenía `food` y una foto de fruta activaba la escena `carne`;
 * `flowerpot` contenía `flower` y apuntar a una maceta daba flores. Los dos
 * errores aparecieron probando esto, no razonándolo.
 *
 * Y se busca en una sola dirección —el término adentro de la etiqueta, no al
 * revés—. Al revés, la etiqueta `plant` matcheaba `flowering plant` y toda
 * planta activaba la escena de las flores.
 */
function contiene(etiqueta: string, termino: string): boolean {
  if (etiqueta === termino) return true;
  const escapado = termino.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(`\\b${escapado}\\b`).test(etiqueta);
}

/**
 * Qué escenas están presentes en un conjunto de etiquetas.
 *
 * Devuelve todas las que matcheen y no la mejor: mirando una maceta con una
 * planta hay `planta` y `tierra` al mismo tiempo, y las dos son ciertas. Elegir
 * cuál gana es asunto de quien resuelve el ingrediente, no de acá.
 */
export function escenasDe(etiquetas: readonly string[]): Escena[] {
  const limpias = etiquetas.map(normalizar);
  const salida: Escena[] = [];

  for (const escena of Object.keys(ETIQUETAS) as Escena[]) {
    const busca = ETIQUETAS[escena];
    const hay = busca.some((b) => limpias.some((l) => contiene(l, b)));
    if (hay) salida.push(escena);
  }

  return salida;
}
