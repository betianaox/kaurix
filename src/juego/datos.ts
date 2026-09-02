import { criaturas } from '../art';

/**
 * Los números del juego, todos juntos.
 *
 * Nada de esto es lógica: son las perillas. Están acá para poder ajustar la
 * dificultad sin tocar el código que la aplica, y para que se vea de un vistazo
 * si el juego quedó fácil o imposible.
 */

/** Cuántas vueltas completas tiene el álbum. */
export const NIVELES = 8;

/**
 * El color de cada vuelta.
 *
 * Tiñe el fondo de la colección y la hoja del álbum de ese nivel. **Provisorios
 * hasta que Betiana defina la paleta**: son ocho tonos separados entre sí para
 * poder ver el mecanismo funcionando, no una decisión estética.
 *
 * El armazón —header y footer— no se tiñe: solo el relleno. Es lo que permite
 * cambiar de color ocho veces sin que la app se desarme.
 */
export const COLOR_NIVEL: readonly string[] = [
  '#C9A227', // 1 — amarillo
  '#3F8F5B', // 2 — verde
  '#2F7A96', // 3 — agua
  '#7A4FA3', // 4 — violeta
  '#B5533A', // 5 — ladrillo
  '#2E6BAF', // 6 — azul
  '#A8496F', // 7 — magenta
  '#5B6B7A', // 8 — piedra
];

/** El color de un nivel, 1-indexado como el resto del juego. */
export const colorDeNivel = (nivel: number) =>
  COLOR_NIVEL[Math.max(0, Math.min(COLOR_NIVEL.length - 1, nivel - 1))];

/**
 * La criatura del tutorial.
 *
 * Es siempre la primera que aparece, tiene la receta más barata y su barra no
 * decrece nunca. Nadie tiene que aprender la mecánica perdiendo.
 *
 * Cambiarla es esta línea.
 */
export const TUTORIAL = 'dragon-turquesa';

export type Regla = {
  /**
   * Cuánto pesa en el sorteo, relativo a las demás. Más alto, más seguido
   * aparece.
   */
  peso: number;
  /**
   * Cuántos ingredientes lleva cada receta suya.
   *
   * Tres criaturas van con dos ingredientes —incluida la del tutorial— para que
   * el juego se pueda empezar sin saber nada. El resto pide tres o más.
   */
  ingredientes: number;
};

/**
 * La dificultad de cada criatura.
 *
 * Los nombres siguen siendo los provisorios que se pusieron para poder mostrar
 * algo; cuando cambien, cambian acá y en `art/index.ts` y en ningún otro lado.
 */
export const REGLAS: Record<string, Regla> = {
  'dragon-turquesa': { peso: 100, ingredientes: 2 }, // el tutorial
  'capibara-alado': { peso: 90, ingredientes: 2 },
  'cachorro-miel': { peso: 90, ingredientes: 2 },
  'dragon-musgo': { peso: 55, ingredientes: 3 },
  'lobo-niebla': { peso: 55, ingredientes: 3 },
  'gato-bruma': { peso: 45, ingredientes: 3 },
  fenix: { peso: 18, ingredientes: 4 },
  'oso-dorado': { peso: 14, ingredientes: 4 },
};

const REGLA_POR_DEFECTO: Regla = { peso: 50, ingredientes: 3 };

export const reglaDe = (id: string): Regla => REGLAS[id] ?? REGLA_POR_DEFECTO;

/**
 * Cuánto se encarece todo en cada vuelta.
 *
 * El nivel 1 vale 1; cada vuelta suma un 35%. En la octava hace falta poco más
 * del triple que en la primera, que alcanza para que se note sin volverse una
 * pared.
 */
export const costoDeNivel = (nivel: number) => 1 + (nivel - 1) * 0.35;

/**
 * Qué criatura toca buscar.
 *
 * Reglas, en orden:
 *
 * 1. Si la del tutorial no está hecha en este nivel, es esa. Siempre. La
 *    primera partida de alguien no puede empezar con la criatura más difícil.
 * 2. Del resto, sorteo por peso entre las que faltan.
 * 3. Si no falta ninguna, el nivel está completo y no hay nada que buscar.
 *
 * `azar` se puede reemplazar en una prueba para que el sorteo sea predecible.
 */
export function criaturaABuscar(
  completadas: string[],
  enCrianza: string[],
  azar: () => number = Math.random
): string | null {
  const ocupadas = new Set([...completadas, ...enCrianza]);
  const faltan = criaturas.map((c) => c.id).filter((id) => !ocupadas.has(id));

  if (!faltan.length) return null;
  if (faltan.includes(TUTORIAL)) return TUTORIAL;

  const total = faltan.reduce((s, id) => s + reglaDe(id).peso, 0);
  let tirada = azar() * total;
  for (const id of faltan) {
    tirada -= reglaDe(id).peso;
    if (tirada <= 0) return id;
  }
  return faltan[faltan.length - 1];
}

/**
 * Cuántos intentos fallidos antes de que el huevo rompa. Cambia en cada huevo:
 * el jugador no sabe cuántos le van a tocar, y esa incertidumbre es la mitad de
 * la gracia.
 */
export function fallosAntesDeRomper(azar: () => number = Math.random): number {
  return 2 + Math.floor(azar() * 3);
}
