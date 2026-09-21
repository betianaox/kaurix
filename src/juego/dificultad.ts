import { TODO_CERCA } from '../flags';

/**
 * ───────────────────────────────────────────────────────────────────────────
 * FÁCIL Y DIFÍCIL
 * ───────────────────────────────────────────────────────────────────────────
 * Los dos modos no cambian ninguna regla: cambian **cuánto hay que caminar y
 * cuánto hay que esperar**. Todo lo que se puede jugar en fácil se puede jugar
 * en difícil, y al revés; lo que cambia es el ritmo.
 *
 * Se elige en Ayuda y arranca en fácil, que es lo que hace que la primera media
 * hora de alguien que recién instala tenga cosas para hacer. Difícil es el
 * juego que se quiso hacer: salir a caminar, volver al otro día.
 *
 * ## Lo que ya empezó no se recalcula
 *
 * Cambiar de modo vale **de ahí en adelante**. Una espera que ya está corriendo
 * termina cuando iba a terminar: por eso el guardado anota *hasta cuándo* dura
 * cada una y no cuándo empezó. Si guardara el comienzo, pasar a fácil con una
 * espera de ocho horas a la mitad la recortaría sola, y pasar a difícil la
 * estiraría: dos formas de que el juego haga algo que nadie pidió.
 *
 * ## En desarrollo manda `TODO_CERCA`
 *
 * Corriendo desde la computadora, los números son los de probar sentado y el
 * modo no toca nada: ver `flags.ts`. En la app instalada ese flag es falso
 * siempre, así que lo único que manda es esto.
 */

export type Modo = 'facil' | 'dificil';

export const MODOS: readonly Modo[] = ['facil', 'dificil'];

export type Numeros = {
  /** Cuánto tarda un ingrediente en poder volver a aparecer, en milisegundos. */
  esperaIngrediente: number;
  /** Cuánto pasa entre encontrar una criatura y poder buscar la siguiente. */
  esperaCriatura: number;
  /** Cuánto tarda la criatura en aparecer, con la cámara en modo bichos. */
  apareceCriatura: number;
  /** Cuánto se acerca la criatura por lectura del sensor si la seguís. */
  acerca: number;
  /** Cuánto se aleja por lectura si mirás para otro lado. */
  aleja: number;
  /** Cada cuánto puede aparecer un ingrediente. */
  cadaIngrediente: number;
  /**
   * Multiplica lo que cuesta encontrar cada criatura, sobre la tabla de
   * `dificultadDe`. Más alto, más lejos.
   */
  cuestaEncontrar: number;
};

const FACIL: Numeros = {
  esperaIngrediente: 60 * 60 * 1000,
  esperaCriatura: 4 * 60 * 60 * 1000,
  apareceCriatura: 30_000,
  acerca: 0.006,
  aleja: 0.002,
  cadaIngrediente: 3000,
  cuestaEncontrar: 0.6,
};

const DIFICIL: Numeros = {
  esperaIngrediente: 3 * 60 * 60 * 1000,
  esperaCriatura: 8 * 60 * 60 * 1000,
  apareceCriatura: 120_000,
  acerca: 0.002,
  aleja: 0.0007,
  cadaIngrediente: 3800,
  cuestaEncontrar: 1,
};

/** Todo al alcance de la mano, para probar sentado. Ver `TODO_CERCA`. */
const PROBANDO: Numeros = {
  esperaIngrediente: 60_000,
  esperaCriatura: 60_000,
  apareceCriatura: 60_000,
  acerca: 0.011,
  aleja: 0.004,
  cadaIngrediente: 3800,
  cuestaEncontrar: 1,
};

export function numerosDe(modo: Modo): Numeros {
  if (TODO_CERCA) return PROBANDO;
  return modo === 'facil' ? FACIL : DIFICIL;
}

/** Cuándo termina una espera que empieza ahora, en ISO. */
export const hasta = (cuanto: number, ahora = Date.now()) =>
  new Date(ahora + cuanto).toISOString();

/** Cuánto falta para una espera guardada como "hasta cuándo". Cero si ya pasó. */
export function falta(cuando: string | null | undefined, ahora = Date.now()): number {
  if (!cuando) return 0;
  const fin = Date.parse(cuando);
  return Number.isNaN(fin) ? 0 : Math.max(0, fin - ahora);
}
