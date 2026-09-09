import { PREMIO_SIEMPRE } from '../flags';

/**
 * ───────────────────────────────────────────────────────────────────────────
 * EL CAMINO DE LOS DÍAS
 * ───────────────────────────────────────────────────────────────────────────
 * Siete pasos, uno por día, cada uno con un premio mejor que el anterior. Al
 * llegar al séptimo vuelve a empezar, así que no se termina nunca.
 *
 * ## Faltar un día no cuesta nada
 *
 * El camino espera. Quien vuelve a la semana encuentra su paso donde lo dejó y
 * sigue desde ahí; no hay racha que se rompa ni progreso que se pierda.
 *
 * Es la misma decisión que se tomó con la crianza cuando se le sacó el
 * decaimiento: **lo que agregaba era el miedo a irse, no una decisión
 * interesante**. Una racha que castiga reintroduce ese miedo por la puerta de
 * atrás, y en un juego que se juega apuntando la cámara a la cocina de tu casa,
 * el que se siente vigilado desinstala.
 *
 * Lo que empuja a volver es que mañana hay algo mejor, no que hoy se pierde algo.
 *
 * ## Y tampoco se acumula
 *
 * Un premio por día calendario, y el que no se reclamó ayer no se suma al de
 * hoy. Sin esto, entrar una vez por semana y llevarse siete premios de un saque
 * sería mejor estrategia que jugar todos los días, y el camino diría lo
 * contrario de lo que quiere decir.
 *
 * ## Los premios sirven para lo mismo que el juego
 *
 * Todos empujan a hacer crecer un bicho: ingredientes para cocinar, comida ya
 * hecha para entregar, y al final la poción, que es lo único que abre el último
 * salto a adulto. Un premio que no sirva para eso sería un adorno.
 */

/** Cuántos pasos tiene el camino antes de volver a empezar. */
export const PASOS = 7;

/**
 * Lo que da un paso.
 *
 * `ingredientes` sortea **uno** y da varias unidades de ese: tres frutillas
 * sirven para una receta y tres cosas sueltas distintas no sirven para nada.
 * `comida` y `pocion` piden una preparación de ese nivel. Cuál sale
 * exactamente es cosa del store, que es el que sortea: acá solo se dice qué
 * clase de premio toca.
 */
export type Premio = {
  /**
   * Qué dibujo lo representa en la escalera.
   *
   * Un premio de ingredientes sortea entre los setenta y cuatro, así que no
   * tiene un dibujo propio: se le pone uno **de muestra**, fijo, para que el
   * camino se pueda ver de un vistazo. Sin esto la pantalla sería una lista de
   * frases y no una escalera de cosas.
   */
  muestra: string;
} & (
  | { tipo: 'ingredientes'; cuantos: number }
  | { tipo: 'comida'; nivel: 1 | 2 }
  | { tipo: 'pocion' }
);

/**
 * Los siete premios, en orden.
 *
 * La escalera va de lo que sobra a lo que traba: los primeros días dan materia
 * prima, que se consigue igual saliendo a buscar; el cuarto y el sexto dan
 * comida ya cocinada, que ahorra el paso de la olla; y el séptimo da una poción,
 * que es lo más caro del juego —dos ingredientes de campo por cada una— y lo
 * único que hace falta para que un bicho termine de crecer.
 *
 * **Es una tabla y no una fórmula** a propósito: cada día se puede mover a mano
 * sin tocar nada más, que es lo que hace falta para balancearlo probando.
 */
const CAMINO: Premio[] = [
  { tipo: 'ingredientes', cuantos: 3, muestra: 'manzana' },
  { tipo: 'ingredientes', cuantos: 4, muestra: 'zanahoria' },
  { tipo: 'ingredientes', cuantos: 6, muestra: 'huevo' },
  { tipo: 'comida', nivel: 1, muestra: 'pan-molde' },
  { tipo: 'ingredientes', cuantos: 8, muestra: 'queso' },
  { tipo: 'comida', nivel: 2, muestra: 'sandwich' },
  { tipo: 'pocion', muestra: 'savia' },
];

/**
 * Lo que se llevó al reclamar, ya resuelto a cosas concretas.
 *
 * `null` cuando no había nada que reclamar. Lo arma el store, que es el que
 * sortea: acá vive el tipo para que la pantalla y el store hablen de lo mismo.
 */
export type Reclamo =
  | { tipo: 'ingredientes'; id: string; cuantos: number }
  | { tipo: 'comida'; id: string }
  | { tipo: 'pocion'; id: string }
  | null;

/** Cuántos días se cobraron, y cuándo fue el último. */
export type Sendero = {
  /**
   * Cuántos premios se reclamaron en total. **No es el escalón**: es la cuenta
   * que sigue subiendo.
   *
   * De acá salen las dos cosas: en qué escalón de la pirámide está —el resto de
   * dividir por siete— y qué número de día mostrar. Con un contador que se
   * reiniciaba cada vuelta, la segunda semana volvía a decir "Día 1" a alguien
   * que llevaba ocho días jugando.
   */
  dias: number;
  /** El día del último premio reclamado, en ISO. `null` si nunca reclamó. */
  ultimo: string | null;
};

export const senderoNuevo = (): Sendero => ({ dias: 0, ultimo: null });

/** El premio que toca en un día. El ciclo de siete se repite. */
export const premioDe = (dias: number): Premio => CAMINO[dias % PASOS];

/** El escalón de la pirámide en el que está: de 0 a 6. */
export const escalonDe = (dias: number): number => dias % PASOS;

/**
 * El primer día de la vuelta en curso.
 *
 * Con ocho días cobrados la vuelta va del 8 al 14, así que esto da 8. Es lo que
 * hace que la pirámide numere de corrido en vez de volver a empezar de uno.
 */
export const primerDiaDeLaVuelta = (dias: number): number =>
  Math.floor(dias / PASOS) * PASOS + 1;

/**
 * El día calendario de una fecha, en la zona del teléfono.
 *
 * Se compara por día y no por horas: quien entró anoche a las 23 y vuelve hoy a
 * las 8 hizo dos días, aunque hayan pasado nueve horas. Es la misma cuenta que
 * usa el giro gratis de la ruleta.
 */
const dia = (ms: number) => new Date(ms).toLocaleDateString('sv');

/** Si hay un premio esperando. Uno por día, y el de ayer no se acumula. */
export function hayPremio(s: Sendero, ahora = Date.now()): boolean {
  // Mientras se prueba, el escalón se puede reclamar sin esperar. Ver `flags`.
  if (PREMIO_SIEMPRE) return true;
  if (!s.ultimo) return true;
  const cuando = Date.parse(s.ultimo);
  if (Number.isNaN(cuando)) return true;
  return dia(cuando) !== dia(ahora);
}

/** El sendero después de reclamar el premio del día. */
export function reclamado(s: Sendero, ahora = Date.now()): Sendero {
  return { dias: s.dias + 1, ultimo: new Date(ahora).toISOString() };
}

/**
 * Cuántas cosas hay para hacer ahora mismo.
 *
 * Hoy es solo el premio del día: uno o ninguno. Está armado como cuenta y no
 * como booleano porque el globo del header muestra un número, y cuando existan
 * los otros avisos —un bicho listo para crecer, una receta que ya se puede
 * armar— se suman acá sin tocar el header.
 */
export const pendientesDe = (s: Sendero, ahora = Date.now()): number =>
  hayPremio(s, ahora) ? 1 : 0;
