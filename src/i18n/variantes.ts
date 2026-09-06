import type { Region } from './region';

/**
 * Cómo se llama cada cosa según de dónde sea quien juega.
 *
 * ## No es un diccionario por región, son excepciones
 *
 * De los 126 nombres del juego, unos treinta cambian de un país a otro. El
 * resto —tomate, ajo, sal, harina, queso, pizza— es igual en todos lados, y
 * mantenerlo repetido cuatro veces sería garantizar que se desincronicen.
 *
 * Así que acá va SOLO lo que cambia. Lo que no esté listado sale del
 * diccionario del idioma, como siempre.
 *
 * ## Cuál es la base
 *
 * `es.json` está escrito en rioplatense, que es donde se escribió el juego. Por
 * eso `rioplatense` no tiene ninguna excepción: es la base tal cual.
 *
 * `neutro` sí las tiene, y es el que se usa cuando no sabemos de dónde es
 * alguien o cuando su país no está en ninguna lista. Usa el término más
 * extendido de cada par —aguacate antes que palta, fresa antes que frutilla—
 * aunque no sea el de ningún país en particular. Es la apuesta menos mala
 * cuando no hay dato.
 *
 * ## La tortilla
 *
 * Es el único caso que no es de nombre sino de COSA. En el juego la tortilla es
 * la base del taco, o sea la mexicana; en España una tortilla es de papa y
 * huevo, y el dibujo no se le parece en nada. Por eso en `espana` no se traduce
 * el nombre: se le cambia a "Tortilla de maíz", que ahí se entiende y no choca
 * con la otra.
 */
export type Excepciones = Record<string, string>;

export const VARIANTES: Record<Region, Excepciones> = {
  // La base. `es.json` ya está escrito así.
  rioplatense: {},

  // El término más extendido de cada par. No es el de nadie, y es a propósito:
  // es el que más gente reconoce cuando no sabemos de dónde viene.
  neutro: {
    'ingredientes.palta': 'Aguacate',
    'ingredientes.frutilla': 'Fresa',
    'ingredientes.anana': 'Piña',
    'ingredientes.durazno': 'Durazno',
    'ingredientes.banana': 'Banano',
    'ingredientes.arvejas': 'Guisantes',
    'ingredientes.morron': 'Pimiento',
    'ingredientes.boniato': 'Camote',
    'ingredientes.zucchini': 'Calabacín',
    'ingredientes.manteca': 'Mantequilla',
    'ingredientes.kale': 'Col rizada',
    'ingredientes.carne-picada': 'Carne molida',
    'ingredientes.bife': 'Bistec',
    'comidas.pancho': 'Hot dog',
    'comidas.pan-pancho': 'Pan de hot dog',
    'comidas.papas-fritas': 'Papas fritas',
    'comidas.torta-arcoiris': 'Pastel arcoíris',
    'comidas.torta-chocolate': 'Pastel de chocolate',
    'comidas.torta-zanahoria': 'Pastel de zanahoria',
    'comidas.tortilla': 'Tortilla de maíz',
    'comidas.rol-canela': 'Rollo de canela',
  },

  espana: {
    'ingredientes.palta': 'Aguacate',
    'ingredientes.frutilla': 'Fresa',
    'ingredientes.anana': 'Piña',
    'ingredientes.durazno': 'Melocotón',
    'ingredientes.banana': 'Plátano',
    'ingredientes.arvejas': 'Guisantes',
    'ingredientes.morron': 'Pimiento',
    'ingredientes.boniato': 'Boniato',
    'ingredientes.papa': 'Patata',
    'ingredientes.zucchini': 'Calabacín',
    'ingredientes.champinon': 'Champiñón',
    'ingredientes.manteca': 'Mantequilla',
    'ingredientes.kale': 'Col rizada',
    'ingredientes.carne-picada': 'Carne picada',
    'ingredientes.bife': 'Filete',
    'ingredientes.camarones': 'Gambas',
    'comidas.pancho': 'Perrito caliente',
    'comidas.pan-pancho': 'Pan de perrito',
    'comidas.sandwich': 'Bocadillo',
    'comidas.pan-molde': 'Pan de molde',
    'comidas.papas-fritas': 'Patatas fritas',
    'comidas.torta-arcoiris': 'Tarta arcoíris',
    'comidas.torta-chocolate': 'Tarta de chocolate',
    'comidas.torta-zanahoria': 'Tarta de zanahoria',
    // Ver el comentario de arriba: acá no se traduce, se aclara cuál es.
    'comidas.tortilla': 'Tortilla de maíz',
    'comidas.tarta-manzana': 'Tarta de manzana',
    'comidas.rol-canela': 'Rollo de canela',
    'comidas.pastelito-frutilla': 'Magdalena de fresa',
  },

  mexico: {
    'ingredientes.palta': 'Aguacate',
    'ingredientes.frutilla': 'Fresa',
    'ingredientes.anana': 'Piña',
    'ingredientes.durazno': 'Durazno',
    'ingredientes.banana': 'Plátano',
    'ingredientes.arvejas': 'Chícharos',
    'ingredientes.morron': 'Pimiento morrón',
    'ingredientes.boniato': 'Camote',
    'ingredientes.zucchini': 'Calabacita',
    'ingredientes.manteca': 'Mantequilla',
    'ingredientes.kale': 'Col rizada',
    'ingredientes.carne-picada': 'Carne molida',
    'ingredientes.bife': 'Bistec',
    'comidas.pancho': 'Hot dog',
    'comidas.pan-pancho': 'Pan de hot dog',
    'comidas.torta-arcoiris': 'Pastel arcoíris',
    'comidas.torta-chocolate': 'Pastel de chocolate',
    'comidas.torta-zanahoria': 'Pastel de zanahoria',
    'comidas.tortilla': 'Tortilla',
    'comidas.rol-canela': 'Rol de canela',
    'comidas.pastelito-frutilla': 'Panqué de fresa',
  },
};

/**
 * Todos los nombres que alguna región le da a una cosa.
 *
 * **Esto es para BUSCAR, no para mostrar.** Quien creció diciendo aguacate va a
 * escribir "aguacate" aunque la etiqueta diga palta, y no encontrarlo es la
 * peor cara del problema: la etiqueta equivocada se lee raro, pero una búsqueda
 * que no devuelve nada parece que la cosa no existe.
 *
 * Va aparte de la variante que se muestra a propósito: la etiqueta es una sola
 * —la de tu región— y la búsqueda las acepta todas, incluidas las de idiomas
 * que no son el tuyo, que no cuesta nada y ayuda a quien juega en dos.
 */
export function sinonimosDe(clave: string): string[] {
  const nombres = new Set<string>();
  for (const region of Object.keys(VARIANTES) as Region[]) {
    const nombre = VARIANTES[region][clave];
    if (nombre) nombres.add(nombre);
  }
  return [...nombres];
}

/** El nombre de esta región, si lo cambia; si no, `undefined`. */
export const excepcionDe = (region: Region, clave: string): string | undefined =>
  VARIANTES[region]?.[clave];
