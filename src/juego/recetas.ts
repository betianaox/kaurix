import type { ImageSourcePropType } from 'react-native';

import { COMIDAS } from './comidas';
import { ingredientePorId, type Ingrediente } from './ingredientes';

/**
 * Todo lo que se combina: pociones y comidas.
 *
 * El arte sale de las láminas; las combinaciones se deciden acá. Las láminas
 * las traían sugeridas y sirvieron de punto de partida, pero tenían recetas
 * repetidas, filas sin terminar y varias que usaban ingredientes que después se
 * descartaron por indistinguibles. Están rehechas, y **usan todos los
 * ingredientes**: no sobra ninguno.
 *
 * ## Los tres niveles
 *
 * La escalera es una sola regla y no hace falta más:
 *
 * - **Nivel 1** — tres ingredientes sueltos. Cuesta 3.
 * - **Nivel 2** — una preparación de nivel 1 más dos ingredientes. Cuesta 5.
 * - **Nivel 3** — una de nivel 2 más dos ingredientes. Cuesta 7.
 *
 * Que el costo se acumule solo es lo bueno del asunto: la de nivel 3 sale cara
 * sin que haya que inventarle un precio, y se siente el trabajo que le pusiste.
 *
 * ## Las pociones piden el doble de cada ingrediente
 *
 * Misma escalera, mismos ingredientes, pero **de a dos**: 6, 10 y 14 en vez de
 * 3, 5 y 7. Basta con duplicar los sueltos —la base ya viene duplicada de su
 * propio nivel—, así que el doble se propaga solo por toda la cadena.
 *
 * Son doce contra treinta y nueve comidas, y de una criatura entera se pide
 * **una sola**, al final. Al mismo precio que una comida, la poción sería el
 * paso más barato de la crianza justo cuando tiene que ser el más caro.
 *
 * Y es lo que le da trabajo que hacer al video: juntar de a dos con la cámara es
 * el doble de salidas, y el multiplicador de la recompensa es lo que lo vuelve
 * una tarde en vez de una semana. El video sigue sin habilitar nada que no se
 * pueda conseguir a mano.
 *
 * **Qué hace cada una todavía no está decidido.** Los nombres describen cómo se
 * ven, no qué provocan.
 */

export type Clase = 'pocion' | 'comida';
export type Nivel = 1 | 2 | 3;

export type Receta = {
  id: string;
  nombre: string;
  clase: Clase;
  nivel: Nivel;
  /**
   * La preparación de un nivel menos que hace de base.
   *
   * Solo en nivel 2 y 3. En nivel 1 no hay: se arma de cero.
   */
  base?: string;
  /** Ingredientes sueltos: tres en nivel 1, dos en los otros. */
  lleva: string[];
  /** Solo las comidas. Ordena dentro del nivel: primero saladas. */
  dulce?: boolean;
  arte: ImageSourcePropType;
};

/**
 * El arte, en un mapa aparte y con las rutas escritas enteras.
 *
 * La ruta no se puede armar con el id, por más que TypeScript lo acepte: el
 * empaquetador de React Native resuelve los `require` al compilar, mirando el
 * texto literal. Uno armado en tiempo de ejecución no existe cuando se lo
 * necesita, y la app no arranca. Ya pasó una vez.
 */
const ARTE_POCION: Record<string, ImageSourcePropType> = {
  'aliento-frio': require('../../assets/pociones/aliento-frio.webp'),
  'amatista-liquida': require('../../assets/pociones/amatista-liquida.webp'),
  ambar: require('../../assets/pociones/ambar.webp'),
  'doble-cielo': require('../../assets/pociones/doble-cielo.webp'),
  espesura: require('../../assets/pociones/espesura.webp'),
  granate: require('../../assets/pociones/granate.webp'),
  marea: require('../../assets/pociones/marea.webp'),
  nacar: require('../../assets/pociones/nacar.webp'),
  raiz: require('../../assets/pociones/raiz.webp'),
  savia: require('../../assets/pociones/savia.webp'),
  tornasol: require('../../assets/pociones/tornasol.webp'),
  vacio: require('../../assets/pociones/vacio.webp'),
};

const pocion = (
  id: string,
  nombre: string,
  nivel: Nivel,
  lleva: string[],
  base?: string
): Receta => ({
  id,
  nombre,
  clase: 'pocion',
  nivel,
  base,
  lleva,
  arte: ARTE_POCION[id],
});

/**
 * Las doce pociones: **cuatro cadenas de tres**, sin sobrantes.
 *
 * Son doce y no trece a propósito. Solo se pide la de nivel 3, y las otras dos
 * de su cadena existen para llegar hasta ella; una poción de nivel 1 que no sea
 * base de ninguna es una que nadie va a preparar nunca. Si se agrega una, va con
 * su cadena entera hasta nivel 3, o no va.
 *
 * Se arman con lo del campo: hierbas, flores y minerales. Las de nivel 3 piden
 * uno de los minerales esquivos —piedra luna, rubí y obsidiana—, que es lo que
 * las vuelve un objetivo y no un trámite.
 */
export const POCIONES: Receta[] = [
  pocion('savia', 'Savia', 1, ['albahaca', 'perejil', 'jade']),
  pocion('ambar', 'Ámbar', 1, ['romero', 'jengibre', 'citrino']),
  pocion('raiz', 'Raíz', 1, ['salvia', 'ajo', 'pirita']),
  pocion('amatista-liquida', 'Amatista líquida', 1, ['lavanda', 'albahaca', 'amatista']),

  pocion('marea', 'Marea', 2, ['arenisca', 'salvia'], 'savia'),
  pocion('aliento-frio', 'Aliento frío', 2, ['manzanilla', 'sauco'], 'amatista-liquida'),
  pocion('espesura', 'Espesura', 2, ['brezo', 'lapislazuli'], 'raiz'),
  pocion('doble-cielo', 'Doble cielo', 2, ['diente-de-leon', 'hinojo'], 'ambar'),

  pocion('tornasol', 'Tornasol', 3, ['sauco', 'piedra-luna'], 'aliento-frio'),
  pocion('nacar', 'Nácar', 3, ['petalos', 'piedra-luna'], 'marea'),
  pocion('granate', 'Granate', 3, ['hibisco-rojo', 'rubi'], 'espesura'),
  pocion('vacio', 'Vacío', 3, ['hibisco-violeta', 'obsidiana'], 'doble-cielo'),
];

/**
 * Las comidas, tomadas de su archivo y con la forma de receta.
 *
 * Viven aparte porque son cuarenta y con dos láminas detrás; acá se adaptan al
 * mismo tipo que las pociones para que la ayuda, el bolso y el crafteo no
 * tengan que saber de cuál de las dos se trata.
 */
export const COMIDAS_COMO_RECETA: Receta[] = COMIDAS.map((c) => ({
  id: c.id,
  nombre: c.nombre,
  clase: 'comida',
  nivel: c.nivel,
  base: c.base,
  lleva: c.lleva,
  arte: c.arte,
  dulce: c.dulce,
}));

export const RECETAS: Receta[] = [...POCIONES, ...COMIDAS_COMO_RECETA];

export const recetaPorId = (id: string) => RECETAS.find((r) => r.id === id);

/**
 * La clave con que se busca el nombre de una receta en el diccionario.
 *
 * Vive acá y no en el módulo de idiomas porque depende de cómo están
 * clasificadas las recetas, que es asunto de este archivo.
 */
export const claveDe = (r: Receta) =>
  `${r.clase === 'pocion' ? 'pociones' : 'comidas'}.${r.id}`;

export const deClase = (clase: Clase) => RECETAS.filter((r) => r.clase === clase);

/** Los ingredientes sueltos de una receta, ya resueltos. */
export const ingredientesDe = (r: Receta): Ingrediente[] =>
  r.lleva.map((id) => ingredientePorId(id)).filter((i): i is Ingrediente => !!i);

/**
 * Cuántas unidades pide una receta **de cada uno** de sus ingredientes sueltos.
 *
 * Uno en las comidas, dos en las pociones. Sale de la clase y no de un campo
 * anotado receta por receta a propósito: así no existe la poción a la que se le
 * olvidó el doble, y cambiar el número es cambiarlo acá.
 *
 * La base va aparte y siempre de a una: su propio doble ya está contado adentro.
 */
export const porIngrediente = (r: Receta) => (r.clase === 'pocion' ? 2 : 1);

export type Falta = { pide: number; tenes: number } & (
  | { tipo: 'ingrediente'; ingrediente: Ingrediente }
  | { tipo: 'base'; receta: Receta }
);

/**
 * Qué lleva una receta y cuánto tenés de cada cosa.
 *
 * La base va primera, cuando hay: es lo que se lee como "primero armá esta
 * otra". Es lo que dibuja la ayuda, y la gracia es ver de un vistazo cuál te
 * está frenando.
 */
export function faltantesDe(
  r: Receta,
  ingredientes: Record<string, number>,
  preparadas: Record<string, number>
): Falta[] {
  const salida: Falta[] = [];

  if (r.base) {
    const base = recetaPorId(r.base);
    if (base) {
      salida.push({ tipo: 'base', receta: base, pide: 1, tenes: preparadas[base.id] ?? 0 });
    }
  }

  const pide = porIngrediente(r);
  for (const i of ingredientesDe(r)) {
    salida.push({ tipo: 'ingrediente', ingrediente: i, pide, tenes: ingredientes[i.id] ?? 0 });
  }

  return salida;
}

/** Se puede armar ya: hay al menos lo que pide de cada cosa. */
export const sePuede = (
  r: Receta,
  ingredientes: Record<string, number>,
  preparadas: Record<string, number>
) => faltantesDe(r, ingredientes, preparadas).every((f) => f.tenes >= f.pide);

/**
 * Cuántos ingredientes cuesta en total, contando lo que cuesta su base.
 *
 * En las comidas 3, 5 y 7; en las pociones el doble: 6, 10 y 14. Se calcula en
 * vez de anotarse para que siga siendo cierto si alguna receta cambia.
 */
export function costoTotal(r: Receta): number {
  const base = r.base ? recetaPorId(r.base) : null;
  return r.lleva.length * porIngrediente(r) + (base ? costoTotal(base) : 0);
}
