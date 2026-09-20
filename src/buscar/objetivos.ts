import type { Clase } from './clases';
import type { Escena } from './etiquetas';
import type { Tono } from './tonos';

/**
 * ───────────────────────────────────────────────────────────────────────────
 * CONTRA QUÉ SE CONSIGUE CADA COSA
 * ───────────────────────────────────────────────────────────────────────────
 * La tabla que dice, para cada uno de los setenta y cuatro ingredientes, qué
 * hay que estar mirando para que aparezca.
 *
 * **No hay una regla única.** Hay cuatro regímenes, uno por grupo, porque los
 * grupos son cosas distintas. Está explicado entero en
 * `../docs/kaurix-reconocer-el-lugar.md`; el resumen:
 *
 * | Grupo | Contra qué |
 * |---|---|
 * | fruta, verdura, planta, flor | la cosa, por nombre, más alternativas de color |
 * | piedra | nunca la gema: una escena, y el color desempata |
 * | proteína | la cosa por nombre; el tofu, por lugar y color |
 * | despensa | el lugar —una alacena, una góndola—, y ahí sortea el peso |
 *
 * ## Tres niveles, y el de arriba siempre gana
 *
 * - `clase` es **la cosa, dicha por el modelo propio**: apuntar a una naranja y
 *   que el modelo diga `naranja`. Es la única señal que de verdad sabe qué hay
 *   enfrente, así que si algún ingrediente la cumple, los demás no compiten.
 *   Las clases están en `clases.ts`.
 * - `principal` es la cosa **deducida** de escena y color: "fruta, y naranja".
 *   Es lo que había antes del modelo propio y sigue haciendo falta: con el
 *   modelo base es todo lo que hay, y con el propio es como se consiguen las
 *   gemas o el jengibre, que no tienen clase.
 * - `alternativas` son las salidas para cuando no se tiene la cosa —no es
 *   temporada, no hay en la casa—, y suelen ser de color: "algo anaranjado".
 *
 * El orden importa por un caso concreto: el jengibre se busca como "verdura
 * tostada", y una papa es una verdura tostada. Si `principal` valiera lo mismo
 * que `clase`, apuntar a una papa que el modelo reconoce como papa daría
 * jengibre una de cada tres veces.
 *
 * Sin alternativas el juego solo se puede jugar en una verdulería. Con ellas se
 * puede jugar en una cocina real un martes cualquiera, que es donde va a estar
 * quien juegue.
 *
 * ## Varias cosas en una clase
 *
 * Donde el modelo no las distingue, varios ingredientes piden la misma clase:
 * `hoja-verde` es espinaca, kale, lechuga y apio; `hibisco` es el rojo y el
 * violeta; `carne-roja` es bife, picada y desmenuzada. Si la clase lleva tonos,
 * el color decide cuál; si no, el peso. Y si el modelo vio la clase pero el
 * color no coincide —un hibisco que se lee verde por las hojas—, cuenta como
 * `principal`: sigue siendo un hibisco, aunque no se sepa cuál.
 *
 * ## Cómo se lee un objetivo
 *
 * Un `Objetivo` se cumple cuando **todo** lo que pide se cumple: si tiene
 * clases, escenas y tonos, tienen que darse los tres. Un campo ausente no pide
 * nada.
 *
 * Los tonos aceptan vecinos —ver `tonoSirve`—, así que pedir `naranja` acepta
 * una mandarina que bajo luz cálida se lee amarilla.
 *
 * ## LO QUE FALTA
 *
 * Nada de esto se probó contra una cámara todavía, y no hay fotos propias para
 * medir el modelo. `npm run reconocedor` prueba la tabla con lecturas
 * inventadas; lo demás se va a ver jugando.
 */

export type Objetivo = {
  /** Alguna de estas clases del modelo propio tiene que estar. Ausente = cualquiera. */
  clases?: readonly Clase[];
  /** Alguna de estas escenas tiene que estar. Ausente = cualquiera. */
  escenas?: readonly Escena[];
  /** El tono dominante tiene que ser alguno, o vecino. Ausente = cualquiera. */
  tonos?: readonly Tono[];
};

export type Reconocimiento = {
  /** La cosa por nombre, cuando el modelo propio la tiene. */
  clase?: Objetivo;
  /**
   * La cosa deducida de escena y color. La despensa no lo tiene: ahí no se
   * busca una cosa, se abre un mueble y hay lo que hay.
   */
  principal?: Objetivo;
  /** Una o dos salidas para cuando no se tiene lo principal. */
  alternativas: readonly Objetivo[];
};

/** Pedir una clase por nombre, sin más. */
const nombre = (c: Clase): Objetivo => ({ clases: [c] });

/* ────────────────────────────────────────────────────────────────────────────
 * FRUTA — la cosa, más color
 *
 * La alternativa es siempre "fruta de este color", que es lo que salva al que
 * no tiene esa fruta en casa.
 *
 * Varias comparten color —manzana, tomate y frutilla son las tres rojas— y eso
 * está bien en las alternativas: son cosas que se consiguen apuntando a algo
 * rojo comestible. Con el modelo propio, la clase separa las tres.
 * ──────────────────────────────────────────────────────────────────────────── */

const FRUTA: Record<string, Reconocimiento> = {
  manzana: {
    clase: nombre('manzana'),
    principal: { escenas: ['fruta'], tonos: ['rojo', 'verde'] },
    alternativas: [{ escenas: ['comida'], tonos: ['rojo'] }, { tonos: ['rojo'] }],
  },
  banana: {
    clase: nombre('banana'),
    principal: { escenas: ['fruta'], tonos: ['amarillo'] },
    alternativas: [{ escenas: ['comida'], tonos: ['amarillo'] }, { tonos: ['amarillo'] }],
  },
  naranja: {
    clase: nombre('naranja'),
    principal: { escenas: ['fruta'], tonos: ['naranja'] },
    alternativas: [{ escenas: ['comida'], tonos: ['naranja'] }, { tonos: ['naranja'] }],
  },
  tomate: {
    clase: nombre('tomate'),
    principal: { escenas: ['fruta', 'verdura'], tonos: ['rojo'] },
    alternativas: [{ escenas: ['comida'], tonos: ['rojo'] }, { tonos: ['rojo'] }],
  },
  pera: {
    clase: nombre('pera'),
    principal: { escenas: ['fruta'], tonos: ['verde', 'amarillo'] },
    alternativas: [{ escenas: ['comida'], tonos: ['verde'] }],
  },
  frutilla: {
    clase: nombre('frutilla'),
    principal: { escenas: ['fruta'], tonos: ['rojo'] },
    alternativas: [{ escenas: ['flor'], tonos: ['rojo'] }, { tonos: ['rojo', 'rosa'] }],
  },
  uva: {
    clase: nombre('uva'),
    principal: { escenas: ['fruta'], tonos: ['violeta'] },
    alternativas: [{ tonos: ['violeta'] }],
  },
  durazno: {
    clase: nombre('durazno'),
    principal: { escenas: ['fruta'], tonos: ['naranja', 'rosa'] },
    alternativas: [{ escenas: ['comida'], tonos: ['rosa'] }],
  },
  lima: {
    clase: nombre('lima'),
    principal: { escenas: ['fruta'], tonos: ['verde'] },
    alternativas: [{ escenas: ['comida'], tonos: ['verde'] }],
  },
  kiwi: {
    clase: nombre('kiwi'),
    principal: { escenas: ['fruta'], tonos: ['verde', 'tostado'] },
    alternativas: [{ escenas: ['comida'], tonos: ['tostado'] }],
  },
  arandanos: {
    clase: nombre('arandanos'),
    principal: { escenas: ['fruta'], tonos: ['azul', 'violeta'] },
    alternativas: [{ tonos: ['azul'] }],
  },
  frambuesa: {
    clase: nombre('frambuesa'),
    principal: { escenas: ['fruta'], tonos: ['rosa', 'rojo'] },
    alternativas: [{ escenas: ['flor'], tonos: ['rosa'] }, { tonos: ['rosa'] }],
  },
  sandia: {
    clase: nombre('sandia'),
    principal: { escenas: ['fruta'], tonos: ['verde', 'rojo'] },
    alternativas: [{ escenas: ['comida'], tonos: ['verde'] }],
  },
  mango: {
    clase: nombre('mango'),
    principal: { escenas: ['fruta'], tonos: ['naranja', 'amarillo'] },
    alternativas: [{ escenas: ['comida'], tonos: ['naranja'] }],
  },
  anana: {
    clase: nombre('anana'),
    principal: { escenas: ['fruta'], tonos: ['amarillo', 'tostado'] },
    alternativas: [{ escenas: ['comida'], tonos: ['tostado'] }],
  },
};

/* ────────────────────────────────────────────────────────────────────────────
 * VERDURA — igual que la fruta
 *
 * Con una diferencia útil: muchas verduras se consiguen también apuntando a una
 * planta o a un huerto, no solo al refrigerador. Las de hoja llevan `planta` de
 * alternativa.
 *
 * Espinaca, apio, kale y lechuga comparten `hoja-verde`: casi no hay fotos de
 * cada una por separado, y a un metro son la misma hoja. Sin tono en la clase,
 * decide el peso.
 * ──────────────────────────────────────────────────────────────────────────── */

const HOJA_VERDE = nombre('hoja-verde');

const VERDURA: Record<string, Reconocimiento> = {
  papa: {
    clase: nombre('papa'),
    principal: { escenas: ['verdura'], tonos: ['tostado', 'amarillo'] },
    alternativas: [{ escenas: ['tierra'], tonos: ['tostado'] }],
  },
  cebolla: {
    clase: nombre('cebolla'),
    principal: { escenas: ['verdura'], tonos: ['blanco', 'tostado', 'violeta'] },
    alternativas: [{ escenas: ['alacena'], tonos: ['tostado'] }],
  },
  zanahoria: {
    clase: nombre('zanahoria'),
    principal: { escenas: ['verdura'], tonos: ['naranja'] },
    alternativas: [{ escenas: ['comida'], tonos: ['naranja'] }, { tonos: ['naranja'] }],
  },
  zucchini: {
    clase: nombre('zucchini'),
    principal: { escenas: ['verdura'], tonos: ['verde'] },
    alternativas: [{ escenas: ['planta'], tonos: ['verde'] }],
  },
  palta: {
    clase: nombre('palta'),
    principal: { escenas: ['verdura', 'fruta'], tonos: ['verde', 'negro'] },
    alternativas: [{ escenas: ['comida'], tonos: ['verde'] }],
  },
  espinaca: {
    clase: HOJA_VERDE,
    principal: { escenas: ['verdura'], tonos: ['verde'] },
    alternativas: [{ escenas: ['planta'], tonos: ['verde'] }],
  },
  apio: {
    clase: HOJA_VERDE,
    principal: { escenas: ['verdura'], tonos: ['verde'] },
    alternativas: [{ escenas: ['planta'], tonos: ['verde'] }],
  },
  morron: {
    clase: nombre('morron'),
    principal: { escenas: ['verdura'], tonos: ['rojo', 'amarillo', 'verde'] },
    alternativas: [{ escenas: ['comida'], tonos: ['rojo'] }],
  },
  brocoli: {
    clase: nombre('brocoli'),
    principal: { escenas: ['verdura'], tonos: ['verde'] },
    alternativas: [{ escenas: ['planta'], tonos: ['verde'] }],
  },
  maiz: {
    clase: nombre('maiz'),
    principal: { escenas: ['verdura'], tonos: ['amarillo'] },
    alternativas: [{ escenas: ['comida'], tonos: ['amarillo'] }],
  },
  arvejas: {
    clase: nombre('arvejas'),
    principal: { escenas: ['verdura'], tonos: ['verde'] },
    alternativas: [{ escenas: ['planta'], tonos: ['verde'] }],
  },
  // Sin clase: no juntó fotos suficientes, como el jengibre.
  boniato: {
    principal: { escenas: ['verdura'], tonos: ['naranja', 'tostado'] },
    alternativas: [{ escenas: ['tierra'], tonos: ['naranja'] }],
  },
  kale: {
    clase: HOJA_VERDE,
    principal: { escenas: ['verdura'], tonos: ['verde'] },
    alternativas: [{ escenas: ['planta', 'pasto'], tonos: ['verde'] }],
  },
  champinon: {
    clase: nombre('champinon'),
    principal: { escenas: ['verdura'], tonos: ['blanco', 'tostado'] },
    alternativas: [{ escenas: ['tierra'], tonos: ['tostado'] }],
  },
  coliflor: {
    clase: nombre('coliflor'),
    principal: { escenas: ['verdura'], tonos: ['blanco'] },
    alternativas: [{ escenas: ['comida'], tonos: ['blanco'] }],
  },
  lechuga: {
    clase: HOJA_VERDE,
    principal: { escenas: ['verdura'], tonos: ['verde'] },
    alternativas: [{ escenas: ['planta', 'pasto'], tonos: ['verde'] }],
  },
};

/* ────────────────────────────────────────────────────────────────────────────
 * PLANTA — las cinco tienen clase
 *
 * Con el modelo base, las cinco son hojas verdes y se repartían por peso. El
 * propio sí las separa —se entrenaron con fotos de iNaturalist, donde cada una
 * está en su planta—, así que ahora se piden por nombre.
 *
 * Lo de escena y color queda para el modelo base, y aprovecha lo poco que hay:
 * el perejil y el hinojo se venden como verdura, la salvia tira a gris.
 * ──────────────────────────────────────────────────────────────────────────── */

const PLANTA: Record<string, Reconocimiento> = {
  albahaca: {
    clase: nombre('albahaca'),
    principal: { escenas: ['planta'], tonos: ['verde'] },
    alternativas: [{ escenas: ['verdura'], tonos: ['verde'] }],
  },
  romero: {
    clase: nombre('romero'),
    principal: { escenas: ['planta'], tonos: ['verde'] },
    alternativas: [{ escenas: ['pasto'], tonos: ['verde'] }],
  },
  perejil: {
    clase: nombre('perejil'),
    principal: { escenas: ['planta', 'verdura'], tonos: ['verde'] },
    alternativas: [{ escenas: ['verdura'], tonos: ['verde'] }],
  },
  salvia: {
    // Tira a gris verdoso, unico dato de color que separa algo en este grupo.
    clase: nombre('salvia'),
    principal: { escenas: ['planta'], tonos: ['verde', 'gris'] },
    alternativas: [{ escenas: ['planta'], tonos: ['gris'] }],
  },
  hinojo: {
    clase: nombre('hinojo'),
    principal: { escenas: ['verdura', 'planta'], tonos: ['verde', 'blanco'] },
    alternativas: [{ escenas: ['verdura'], tonos: ['blanco'] }],
  },
};

/* ────────────────────────────────────────────────────────────────────────────
 * FLOR — clase, y el color para los dos hibiscos
 *
 * Ocho flores de siete colores distintos. Con el modelo base alcanzaba la
 * escena `flower` más el color; con el propio, cada una tiene clase menos los
 * dos hibiscos, que son la misma flor en dos colores.
 * ──────────────────────────────────────────────────────────────────────────── */

const FLOR: Record<string, Reconocimiento> = {
  manzanilla: {
    clase: nombre('manzanilla'),
    principal: { escenas: ['flor'], tonos: ['blanco', 'amarillo'] },
    alternativas: [{ escenas: ['pasto'], tonos: ['blanco'] }],
  },
  'diente-de-leon': {
    clase: nombre('diente-de-leon'),
    principal: { escenas: ['flor'], tonos: ['amarillo'] },
    alternativas: [{ escenas: ['pasto'], tonos: ['amarillo'] }],
  },
  lavanda: {
    clase: nombre('lavanda'),
    principal: { escenas: ['flor'], tonos: ['violeta'] },
    alternativas: [{ escenas: ['planta'], tonos: ['violeta'] }],
  },
  sauco: {
    clase: nombre('sauco'),
    principal: { escenas: ['flor'], tonos: ['blanco'] },
    alternativas: [{ escenas: ['planta'], tonos: ['blanco'] }],
  },
  brezo: {
    clase: nombre('brezo'),
    principal: { escenas: ['flor'], tonos: ['rosa'] },
    alternativas: [{ escenas: ['pasto'], tonos: ['rosa'] }],
  },
  petalos: {
    clase: nombre('petalos'),
    principal: { escenas: ['flor'], tonos: ['rosa', 'rojo'] },
    alternativas: [{ tonos: ['rosa'] }],
  },
  'hibisco-rojo': {
    clase: { clases: ['hibisco'], tonos: ['rojo'] },
    principal: { escenas: ['flor'], tonos: ['rojo'] },
    alternativas: [{ escenas: ['planta'], tonos: ['rojo'] }],
  },
  'hibisco-violeta': {
    clase: { clases: ['hibisco'], tonos: ['violeta', 'rosa'] },
    principal: { escenas: ['flor'], tonos: ['violeta', 'rosa'] },
    alternativas: [{ escenas: ['planta'], tonos: ['violeta'] }],
  },
};

/* ────────────────────────────────────────────────────────────────────────────
 * TIERRA — dos raíces
 *
 * El ajo tiene clase. El jengibre no: entre Open Images e iNaturalist no
 * llegaron a treinta fotos usables, así que sigue por escena y color, igual que
 * el boniato. Por eso
 * `clase` le gana a `principal`: una papa es una verdura tostada.
 * ──────────────────────────────────────────────────────────────────────────── */

const TIERRA: Record<string, Reconocimiento> = {
  jengibre: {
    principal: { escenas: ['verdura', 'tierra'], tonos: ['tostado', 'amarillo'] },
    alternativas: [{ escenas: ['tierra'], tonos: ['tostado'] }],
  },
  ajo: {
    clase: nombre('ajo'),
    principal: { escenas: ['verdura', 'tierra'], tonos: ['blanco'] },
    alternativas: [{ escenas: ['alacena'], tonos: ['blanco'] }],
  },
};

/* ────────────────────────────────────────────────────────────────────────────
 * PIEDRA — nunca contra la gema
 *
 * Ninguna se consigue apuntando a la piedra real: distinguir amatista de citrino
 * con la cámara de un teléfono no lo hace un gemólogo sin lupa. Cada una va
 * contra **una escena** —piedras, ladrillos, arena— y el color desempata. Con el
 * modelo propio las escenas salen de las clases `piedras`, `ladrillo` y `arena`.
 *
 * Es el grupo que mejor muestra por qué el color no es un adorno: nueve
 * resultados distintos salen de un modelo que solo sabe decir tres cosas.
 *
 * REVISAR: pirita y citrino comparten piedra y amarillo. Se dejan así a
 * propósito —el peso las separa, 55 contra 35— pero si molesta, la pirita puede
 * mudarse a `arena`, que es donde se la encuentra de verdad.
 * ──────────────────────────────────────────────────────────────────────────── */

/**
 * La salida de una piedra gris cualquiera.
 *
 * El gris es el color de casi todas las piedras del mundo, y sin esto las
 * únicas dos que lo aceptaban eran la piedra luna —blanca— y la obsidiana
 * —negra—, que lo tienen de vecino. Probándolo con dos mil apariciones, apuntar
 * a unas piedras grises daba **piedra luna el 63% de las veces y obsidiana el
 * 37%**: las dos gemas más raras del juego, las más fáciles de conseguir.
 *
 * Con esto, una piedra gris reparte entre las nueve por peso, que es lo que
 * hace que la arenisca sea común y la obsidiana no.
 */
const PIEDRA_CUALQUIERA: Objetivo = { escenas: ['piedra'], tonos: ['gris'] };

const PIEDRA: Record<string, Reconocimiento> = {
  arenisca: {
    principal: { escenas: ['arena'], tonos: ['tostado'] },
    alternativas: [
      { escenas: ['ladrillo'], tonos: ['tostado'] },
      { escenas: ['arena'] },
      PIEDRA_CUALQUIERA,
    ],
  },
  pirita: {
    principal: { escenas: ['piedra'], tonos: ['amarillo'] },
    alternativas: [{ escenas: ['arena'], tonos: ['amarillo'] }, PIEDRA_CUALQUIERA],
  },
  jade: {
    principal: { escenas: ['piedra'], tonos: ['verde'] },
    alternativas: [{ escenas: ['ladrillo'], tonos: ['verde'] }, PIEDRA_CUALQUIERA],
  },
  amatista: {
    principal: { escenas: ['piedra'], tonos: ['violeta'] },
    alternativas: [{ escenas: ['ladrillo'], tonos: ['violeta'] }, PIEDRA_CUALQUIERA],
  },
  citrino: {
    principal: { escenas: ['piedra'], tonos: ['amarillo'] },
    alternativas: [{ escenas: ['ladrillo'], tonos: ['amarillo'] }, PIEDRA_CUALQUIERA],
  },
  lapislazuli: {
    principal: { escenas: ['piedra'], tonos: ['azul'] },
    alternativas: [{ escenas: ['ladrillo'], tonos: ['azul'] }, PIEDRA_CUALQUIERA],
  },
  'piedra-luna': {
    principal: { escenas: ['piedra'], tonos: ['blanco'] },
    alternativas: [{ escenas: ['ladrillo'], tonos: ['blanco'] }],
  },
  rubi: {
    principal: { escenas: ['ladrillo'], tonos: ['rojo'] },
    alternativas: [{ escenas: ['piedra'], tonos: ['rojo'] }],
  },
  obsidiana: {
    principal: { escenas: ['piedra'], tonos: ['negro'] },
    alternativas: [{ escenas: ['ladrillo'], tonos: ['negro'] }],
  },
};

/* ────────────────────────────────────────────────────────────────────────────
 * DESPENSA — acá sí la categoría
 *
 * Harina, azúcar y sal son polvo blanco en un frasco: no hay forma de
 * distinguirlas mirando y no la va a haber. Así que las doce van contra **el
 * lugar** —una alacena, una góndola, la mesada— y ahí sortea el peso, que ya
 * existe y va de 130 (la harina) a 45 (el chocolate).
 *
 * Es el único grupo donde la lotería está bien: son los insumos comunes. Nadie
 * sale a buscar sal; se abre el mueble y hay.
 *
 * Por eso ninguna lleva `clase` ni `principal`: no hay objeto que buscar.
 * ──────────────────────────────────────────────────────────────────────────── */

const enLaAlacena: Reconocimiento = {
  alternativas: [{ escenas: ['alacena'] }, { escenas: ['comida'] }],
};

const DESPENSA: Record<string, Reconocimiento> = {
  harina: enLaAlacena,
  azucar: enLaAlacena,
  sal: enLaAlacena,
  aceite: enLaAlacena,
  manteca: enLaAlacena,
  huevo: enLaAlacena,
  queso: enLaAlacena,
  pimienta: enLaAlacena,
  'aceite-oliva': enLaAlacena,
  mostaza: enLaAlacena,
  canela: enLaAlacena,
  chocolate: enLaAlacena,
};

/* ────────────────────────────────────────────────────────────────────────────
 * PROTEÍNA — por nombre, menos el tofu
 *
 * El modelo propio tiene `carne-roja`, `pollo`, `embutido` y `camaron`. Bife,
 * picada y desmenuzada comparten `carne-roja`: el corte, la luz y el envase
 * cambian más que el tipo de carne, y el color desempata lo que se pueda.
 *
 * El tofu es un cubo blanco en un envase: sigue por lugar y color.
 * ──────────────────────────────────────────────────────────────────────────── */

const PROTEINA: Record<string, Reconocimiento> = {
  tofu: {
    principal: { escenas: ['carne', 'comida'], tonos: ['blanco'] },
    alternativas: [{ escenas: ['alacena'], tonos: ['blanco'] }],
  },
  salchicha: {
    clase: nombre('embutido'),
    principal: { escenas: ['carne'], tonos: ['rojo', 'rosa', 'tostado'] },
    alternativas: [{ escenas: ['comida'], tonos: ['rosa'] }],
  },
  'carne-picada': {
    clase: { clases: ['carne-roja'], tonos: ['rojo', 'rosa'] },
    principal: { escenas: ['carne'], tonos: ['rojo'] },
    alternativas: [{ escenas: ['alacena'], tonos: ['rojo'] }],
  },
  pollo: {
    clase: nombre('pollo'),
    principal: { escenas: ['carne'], tonos: ['blanco', 'rosa'] },
    alternativas: [{ escenas: ['alacena'], tonos: ['rosa'] }],
  },
  'carne-desmenuzada': {
    clase: { clases: ['carne-roja'], tonos: ['tostado'] },
    principal: { escenas: ['carne'], tonos: ['tostado', 'rojo'] },
    alternativas: [{ escenas: ['comida'], tonos: ['tostado'] }],
  },
  bife: {
    clase: { clases: ['carne-roja'], tonos: ['rojo'] },
    principal: { escenas: ['carne'], tonos: ['rojo'] },
    alternativas: [{ escenas: ['comida'], tonos: ['rojo'] }],
  },
  camarones: {
    clase: nombre('camaron'),
    principal: { escenas: ['carne'], tonos: ['rosa', 'naranja'] },
    alternativas: [{ escenas: ['comida'], tonos: ['rosa'] }],
  },
};

/**
 * La tabla completa, por id de ingrediente.
 *
 * Los ids son los de `INGREDIENTES` en `src/juego/ingredientes.ts`. Que estén
 * todos y que no sobre ninguno lo verifica `objetivosCompletos`, que se usa en
 * desarrollo: un id mal escrito acá no da ningún error, simplemente hace que ese
 * ingrediente no aparezca nunca, y eso es imposible de notar jugando.
 */
export const OBJETIVOS: Record<string, Reconocimiento> = {
  ...FRUTA,
  ...VERDURA,
  ...PLANTA,
  ...FLOR,
  ...TIERRA,
  ...PIEDRA,
  ...DESPENSA,
  ...PROTEINA,
};

/**
 * Qué ingredientes quedaron sin objetivo y qué objetivos sobran.
 *
 * No tira una excepción: devuelve las diferencias para que quien lo llame
 * decida. Lo usa un aviso en desarrollo — ver `useReconocer`.
 */
export function objetivosCompletos(ids: readonly string[]): {
  faltan: string[];
  sobran: string[];
} {
  const escritos = new Set(Object.keys(OBJETIVOS));
  const reales = new Set(ids);

  return {
    faltan: ids.filter((id) => !escritos.has(id)),
    sobran: [...escritos].filter((id) => !reales.has(id)),
  };
}

/**
 * Los ingredientes que comparten la clase de uno, él incluido y primero.
 *
 * Lo usa la ficha del ingrediente: si la lechuga se consigue apuntando a hoja
 * verde, conviene saber que la espinaca también, y que cuál sale no se elige.
 */
export function compartenClase(id: string): string[] {
  const suya = OBJETIVOS[id]?.clase?.clases;
  if (!suya?.length) return [];
  const otros = Object.entries(OBJETIVOS)
    .filter(([otro, r]) => otro !== id && r.clase?.clases?.some((c) => suya.includes(c)))
    .map(([otro]) => otro);
  return [id, ...otros];
}
