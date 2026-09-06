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
 * `docs/reconocer-el-lugar.md`; el resumen:
 *
 * | Grupo | Contra qué |
 * |---|---|
 * | fruta, verdura | el objeto real, más alternativas |
 * | piedra | nunca la gema: una escena, y el color desempata |
 * | proteína | lo real, con mucha manga ancha |
 * | despensa | el lugar —una alacena, una góndola—, y ahí sortea el peso |
 *
 * ## Principal y alternativas
 *
 * `principal` es el objeto de verdad: apuntar a una naranja da una naranja.
 * `alternativas` son las salidas para cuando no se tiene —no es temporada, no
 * hay en la casa—, y suelen ser de color: "algo anaranjado".
 *
 * Sin alternativas el juego solo se puede jugar en una verdulería. Con ellas se
 * puede jugar en una cocina real un martes cualquiera, que es donde va a estar
 * quien juegue.
 *
 * ## Cómo se lee un objetivo
 *
 * Un `Objetivo` se cumple cuando **todo** lo que pide se cumple: si tiene
 * escenas y tonos, tienen que darse los dos. Un campo ausente no pide nada.
 *
 * Los tonos aceptan vecinos —ver `tonoSirve`—, así que pedir `naranja` acepta
 * una mandarina que bajo luz cálida se lee amarilla.
 *
 * ## LO QUE FALTA
 *
 * Esta tabla es **un punto de partida escrito de una vez, no una tabla
 * probada**. Nada de esto se pudo verificar contra una cámara todavía. Los
 * lugares donde ya se sabe que hay problema están marcados con `REVISAR` en su
 * grupo.
 */

export type Objetivo = {
  /** Alguna de estas escenas tiene que estar. Ausente = cualquiera. */
  escenas?: readonly Escena[];
  /** El tono dominante tiene que ser alguno, o vecino. Ausente = cualquiera. */
  tonos?: readonly Tono[];
};

export type Reconocimiento = {
  /**
   * El objeto real. La despensa no lo tiene: ahí no se busca una cosa, se abre
   * un mueble y hay lo que hay.
   */
  principal?: Objetivo;
  /** Una o dos salidas para cuando no se tiene lo principal. */
  alternativas: readonly Objetivo[];
};

/* ────────────────────────────────────────────────────────────────────────────
 * FRUTA — el objeto real, más color
 *
 * El principal usa la etiqueta puntual cuando el modelo la tiene; la
 * alternativa es siempre "fruta de este color", que es lo que salva al que no
 * tiene esa fruta en casa.
 *
 * Varias comparten color —manzana, tomate y frutilla son las tres rojas— y eso
 * está bien: si el modelo no llega a distinguirlas, el sorteo por peso decide, y
 * las tres son cosas que se consiguen apuntando a algo rojo comestible.
 * ──────────────────────────────────────────────────────────────────────────── */

const FRUTA: Record<string, Reconocimiento> = {
  manzana: {
    principal: { escenas: ['fruta'], tonos: ['rojo', 'verde'] },
    alternativas: [{ escenas: ['comida'], tonos: ['rojo'] }, { tonos: ['rojo'] }],
  },
  banana: {
    principal: { escenas: ['fruta'], tonos: ['amarillo'] },
    alternativas: [{ escenas: ['comida'], tonos: ['amarillo'] }, { tonos: ['amarillo'] }],
  },
  naranja: {
    principal: { escenas: ['fruta'], tonos: ['naranja'] },
    alternativas: [{ escenas: ['comida'], tonos: ['naranja'] }, { tonos: ['naranja'] }],
  },
  tomate: {
    principal: { escenas: ['fruta', 'verdura'], tonos: ['rojo'] },
    alternativas: [{ escenas: ['comida'], tonos: ['rojo'] }, { tonos: ['rojo'] }],
  },
  pera: {
    principal: { escenas: ['fruta'], tonos: ['verde', 'amarillo'] },
    alternativas: [{ escenas: ['comida'], tonos: ['verde'] }],
  },
  frutilla: {
    principal: { escenas: ['fruta'], tonos: ['rojo'] },
    alternativas: [{ escenas: ['flor'], tonos: ['rojo'] }, { tonos: ['rojo', 'rosa'] }],
  },
  uva: {
    principal: { escenas: ['fruta'], tonos: ['violeta'] },
    alternativas: [{ tonos: ['violeta'] }],
  },
  durazno: {
    principal: { escenas: ['fruta'], tonos: ['naranja', 'rosa'] },
    alternativas: [{ escenas: ['comida'], tonos: ['rosa'] }],
  },
  lima: {
    principal: { escenas: ['fruta'], tonos: ['verde'] },
    alternativas: [{ escenas: ['comida'], tonos: ['verde'] }],
  },
  kiwi: {
    principal: { escenas: ['fruta'], tonos: ['verde', 'tostado'] },
    alternativas: [{ escenas: ['comida'], tonos: ['tostado'] }],
  },
  arandanos: {
    principal: { escenas: ['fruta'], tonos: ['azul', 'violeta'] },
    alternativas: [{ tonos: ['azul'] }],
  },
  frambuesa: {
    principal: { escenas: ['fruta'], tonos: ['rosa', 'rojo'] },
    alternativas: [{ escenas: ['flor'], tonos: ['rosa'] }, { tonos: ['rosa'] }],
  },
  sandia: {
    principal: { escenas: ['fruta'], tonos: ['verde', 'rojo'] },
    alternativas: [{ escenas: ['comida'], tonos: ['verde'] }],
  },
  mango: {
    principal: { escenas: ['fruta'], tonos: ['naranja', 'amarillo'] },
    alternativas: [{ escenas: ['comida'], tonos: ['naranja'] }],
  },
  anana: {
    principal: { escenas: ['fruta'], tonos: ['amarillo', 'tostado'] },
    alternativas: [{ escenas: ['comida'], tonos: ['tostado'] }],
  },
};

/* ────────────────────────────────────────────────────────────────────────────
 * VERDURA — igual que la fruta
 *
 * Con una diferencia útil: muchas verduras se consiguen también apuntando a una
 * planta o a un huerto, no solo a la heladera. Las que crecen a la vista
 * —espinaca, kale, lechuga, apio— llevan `planta` de alternativa.
 * ──────────────────────────────────────────────────────────────────────────── */

const VERDURA: Record<string, Reconocimiento> = {
  papa: {
    principal: { escenas: ['verdura'], tonos: ['tostado', 'amarillo'] },
    alternativas: [{ escenas: ['tierra'], tonos: ['tostado'] }],
  },
  cebolla: {
    principal: { escenas: ['verdura'], tonos: ['blanco', 'tostado', 'violeta'] },
    alternativas: [{ escenas: ['alacena'], tonos: ['tostado'] }],
  },
  zanahoria: {
    principal: { escenas: ['verdura'], tonos: ['naranja'] },
    alternativas: [{ escenas: ['comida'], tonos: ['naranja'] }, { tonos: ['naranja'] }],
  },
  zucchini: {
    principal: { escenas: ['verdura'], tonos: ['verde'] },
    alternativas: [{ escenas: ['planta'], tonos: ['verde'] }],
  },
  palta: {
    principal: { escenas: ['verdura', 'fruta'], tonos: ['verde', 'negro'] },
    alternativas: [{ escenas: ['comida'], tonos: ['verde'] }],
  },
  espinaca: {
    principal: { escenas: ['verdura'], tonos: ['verde'] },
    alternativas: [{ escenas: ['planta'], tonos: ['verde'] }],
  },
  apio: {
    principal: { escenas: ['verdura'], tonos: ['verde'] },
    alternativas: [{ escenas: ['planta'], tonos: ['verde'] }],
  },
  morron: {
    principal: { escenas: ['verdura'], tonos: ['rojo', 'amarillo', 'verde'] },
    alternativas: [{ escenas: ['comida'], tonos: ['rojo'] }],
  },
  brocoli: {
    principal: { escenas: ['verdura'], tonos: ['verde'] },
    alternativas: [{ escenas: ['planta'], tonos: ['verde'] }],
  },
  choclo: {
    principal: { escenas: ['verdura'], tonos: ['amarillo'] },
    alternativas: [{ escenas: ['comida'], tonos: ['amarillo'] }],
  },
  arvejas: {
    principal: { escenas: ['verdura'], tonos: ['verde'] },
    alternativas: [{ escenas: ['planta'], tonos: ['verde'] }],
  },
  boniato: {
    principal: { escenas: ['verdura'], tonos: ['naranja', 'tostado'] },
    alternativas: [{ escenas: ['tierra'], tonos: ['naranja'] }],
  },
  kale: {
    principal: { escenas: ['verdura'], tonos: ['verde'] },
    alternativas: [{ escenas: ['planta', 'pasto'], tonos: ['verde'] }],
  },
  champinon: {
    principal: { escenas: ['verdura'], tonos: ['blanco', 'tostado'] },
    alternativas: [{ escenas: ['tierra'], tonos: ['tostado'] }],
  },
  coliflor: {
    principal: { escenas: ['verdura'], tonos: ['blanco'] },
    alternativas: [{ escenas: ['comida'], tonos: ['blanco'] }],
  },
  lechuga: {
    principal: { escenas: ['verdura'], tonos: ['verde'] },
    alternativas: [{ escenas: ['planta', 'pasto'], tonos: ['verde'] }],
  },
};

/* ────────────────────────────────────────────────────────────────────────────
 * PLANTA — REVISAR
 *
 * **Las cinco son hojas verdes.** Albahaca, romero, perejil, salvia e hinojo se
 * ven casi igual a un metro de distancia, y ningún modelo que corra en un
 * teléfono las va a separar. Es el mismo problema que las gemas, pero sin la
 * salida del color: las cinco son verdes.
 *
 * Lo que hay acá es lo poco que se puede aprovechar —el perejil y el hinojo se
 * venden como verdura, la salvia tira a gris, el romero es un arbusto— y va a
 * repartir mal. **Queda a decidir**: o se acepta que dentro de las hierbas
 * sortee el peso, como en la despensa, o se busca otra mecánica para este grupo.
 * ──────────────────────────────────────────────────────────────────────────── */

const PLANTA: Record<string, Reconocimiento> = {
  albahaca: {
    principal: { escenas: ['planta'], tonos: ['verde'] },
    alternativas: [{ escenas: ['verdura'], tonos: ['verde'] }],
  },
  romero: {
    // El unico con forma de arbusto, que es lo mas parecido a una senal propia
    // que tiene el grupo.
    principal: { escenas: ['planta'], tonos: ['verde'] },
    alternativas: [{ escenas: ['pasto'], tonos: ['verde'] }],
  },
  perejil: {
    principal: { escenas: ['planta', 'verdura'], tonos: ['verde'] },
    alternativas: [{ escenas: ['verdura'], tonos: ['verde'] }],
  },
  salvia: {
    // Tira a gris verdoso, unico dato de color que separa algo en este grupo.
    principal: { escenas: ['planta'], tonos: ['verde', 'gris'] },
    alternativas: [{ escenas: ['planta'], tonos: ['gris'] }],
  },
  hinojo: {
    principal: { escenas: ['verdura', 'planta'], tonos: ['verde', 'blanco'] },
    alternativas: [{ escenas: ['verdura'], tonos: ['blanco'] }],
  },
};

/* ────────────────────────────────────────────────────────────────────────────
 * FLOR — acá el color sí alcanza
 *
 * Ocho flores de siete colores distintos. Es el grupo que mejor funciona con
 * esta mecánica: la escena la da `flower`, que el modelo base tiene, y el color
 * hace el resto.
 * ──────────────────────────────────────────────────────────────────────────── */

const FLOR: Record<string, Reconocimiento> = {
  manzanilla: {
    principal: { escenas: ['flor'], tonos: ['blanco', 'amarillo'] },
    alternativas: [{ escenas: ['pasto'], tonos: ['blanco'] }],
  },
  'diente-de-leon': {
    principal: { escenas: ['flor'], tonos: ['amarillo'] },
    alternativas: [{ escenas: ['pasto'], tonos: ['amarillo'] }],
  },
  lavanda: {
    principal: { escenas: ['flor'], tonos: ['violeta'] },
    alternativas: [{ escenas: ['planta'], tonos: ['violeta'] }],
  },
  sauco: {
    principal: { escenas: ['flor'], tonos: ['blanco'] },
    alternativas: [{ escenas: ['planta'], tonos: ['blanco'] }],
  },
  brezo: {
    principal: { escenas: ['flor'], tonos: ['rosa'] },
    alternativas: [{ escenas: ['pasto'], tonos: ['rosa'] }],
  },
  petalos: {
    principal: { escenas: ['flor'], tonos: ['rosa', 'rojo'] },
    alternativas: [{ tonos: ['rosa'] }],
  },
  'hibisco-rojo': {
    principal: { escenas: ['flor'], tonos: ['rojo'] },
    alternativas: [{ escenas: ['planta'], tonos: ['rojo'] }],
  },
  'hibisco-violeta': {
    principal: { escenas: ['flor'], tonos: ['violeta', 'rosa'] },
    alternativas: [{ escenas: ['planta'], tonos: ['violeta'] }],
  },
};

/* ────────────────────────────────────────────────────────────────────────────
 * TIERRA — dos raíces
 * ──────────────────────────────────────────────────────────────────────────── */

const TIERRA: Record<string, Reconocimiento> = {
  jengibre: {
    principal: { escenas: ['verdura', 'tierra'], tonos: ['tostado', 'amarillo'] },
    alternativas: [{ escenas: ['tierra'], tonos: ['tostado'] }],
  },
  ajo: {
    principal: { escenas: ['verdura', 'tierra'], tonos: ['blanco'] },
    alternativas: [{ escenas: ['alacena'], tonos: ['blanco'] }],
  },
};

/* ────────────────────────────────────────────────────────────────────────────
 * PIEDRA — nunca contra la gema
 *
 * Ninguna se consigue apuntando a la piedra real: distinguir amatista de citrino
 * con la cámara de un teléfono no lo hace un gemólogo sin lupa. Cada una va
 * contra **una escena** —piedras, ladrillos, arena— y el color desempata.
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
 * Por eso ninguna lleva `principal`: no hay objeto que buscar.
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
 * PROTEÍNA — REVISAR, es el grupo sin terminar
 *
 * Va contra lo real como la fruta, pero con mucha más manga ancha: la carne
 * cruda cambia de aspecto según el corte, la luz y el envase, y el modelo base
 * **no tiene ninguna etiqueta de carne**. Hasta que haya modelo propio, lo que
 * de verdad va a disparar acá es la heladera —`alacena`— más el color.
 *
 * Escrito para que exista y se pueda probar, no porque esté resuelto.
 * ──────────────────────────────────────────────────────────────────────────── */

const PROTEINA: Record<string, Reconocimiento> = {
  tofu: {
    principal: { escenas: ['carne', 'comida'], tonos: ['blanco'] },
    alternativas: [{ escenas: ['alacena'], tonos: ['blanco'] }],
  },
  salchicha: {
    principal: { escenas: ['carne'], tonos: ['rojo', 'rosa', 'tostado'] },
    alternativas: [{ escenas: ['comida'], tonos: ['rosa'] }],
  },
  'carne-picada': {
    principal: { escenas: ['carne'], tonos: ['rojo'] },
    alternativas: [{ escenas: ['alacena'], tonos: ['rojo'] }],
  },
  pollo: {
    principal: { escenas: ['carne'], tonos: ['blanco', 'rosa'] },
    alternativas: [{ escenas: ['alacena'], tonos: ['rosa'] }],
  },
  'carne-desmenuzada': {
    principal: { escenas: ['carne'], tonos: ['tostado', 'rojo'] },
    alternativas: [{ escenas: ['comida'], tonos: ['tostado'] }],
  },
  bife: {
    principal: { escenas: ['carne'], tonos: ['rojo'] },
    alternativas: [{ escenas: ['comida'], tonos: ['rojo'] }],
  },
  camarones: {
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
