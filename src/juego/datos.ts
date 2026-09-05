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
 * EL ORDEN DE LAS VUELTAS.
 *
 * Cada vuelta es **un bicho**, y esta lista dice cuál va en cada una. De acá
 * salen las dos cosas que definen una vuelta: su color y su dificultad. Cambiar
 * el orden es cambiar esta lista y nada más — no hay que renumerar arte ni
 * tocar las reglas de ninguna criatura.
 *
 * **No es una lista aparte: es el orden de `criaturas`.** Tener el orden
 * escrito dos veces —una acá y otra en el arte— era garantía de que en algún
 * reordenamiento quedaran peleadas y la vuelta 4 mostrara el bicho de la 6.
 *
 * Y los archivos de arte llevan **el número de la vuelta**: la criatura de la
 * vuelta 3 usa `03-*` y sus cards son `assets/cards/03-*.webp`. Una sola
 * numeración para todo. Reordenar es mover un bloque en `art/index.ts` y
 * renumerar sus archivos.
 *
 * El dragón turquesa abre porque es la cara del branding, y el cocodrilo
 * cierra.
 */
export const ORDEN_DE_VUELTAS: readonly string[] = criaturas.map((c) => c.id);

/**
 * El color de cada bicho, y por lo tanto el de su vuelta.
 *
 * Sale del arte: es el tono dominante de su pose fija, llevado a una
 * luminosidad que se lee sobre el papel claro sin perder el matiz. Un color
 * medido y no elegido a ojo es lo que hace que la vuelta se sienta del bicho y
 * no de una escala inventada.
 *
 * Tres están a revisar, y con el orden puesto se ve por qué: el del cocodrilo
 * sale oliva porque su dominante tira a amarillo, y los del perro, el oso y el
 * capibara son el mismo tostado en las vueltas 4, 5 y 7 — dos de ellas
 * seguidas. Un color medido es un buen punto de partida, no una sentencia:
 * estos tres piden elegirse a mano para que las ocho vueltas se distingan.
 */
export const COLOR_DE_BICHO: Record<string, string> = {
  'dragon-turquesa': '#1B7C84',
  'dragon-musgo': '#72732B',
  'capibara-alado': '#73402B',
  'lobo-niebla': '#2B4973',
  'gato-bruma': '#4A2B73',
  fenix: '#7E2720',
  'oso-dorado': '#8D4911',
  'cachorro-miel': '#7B4C23',
};

/** Por si entra un bicho sin color asignado: gris piedra, que no miente. */
const COLOR_POR_DEFECTO = '#5B6B7A';

/** Qué bicho le toca a una vuelta. 1-indexado como el resto del juego. */
export const bichoDeNivel = (nivel: number) =>
  ORDEN_DE_VUELTAS[Math.max(0, Math.min(ORDEN_DE_VUELTAS.length - 1, nivel - 1))];

/**
 * El color de una vuelta: el de su bicho.
 *
 * Tiñe el fondo de la colección y la hoja del álbum de ese nivel. El armazón
 * —header y footer— no se tiñe. Es lo que permite cambiar de color ocho veces
 * sin que la app se desarme.
 */
export const colorDeNivel = (nivel: number) =>
  COLOR_DE_BICHO[bichoDeNivel(nivel)] ?? COLOR_POR_DEFECTO;

/** Los ocho colores en orden de vuelta. Lo usa el rosario de puntos. */
export const COLOR_NIVEL: readonly string[] = ORDEN_DE_VUELTAS.map(
  (id) => COLOR_DE_BICHO[id] ?? COLOR_POR_DEFECTO
);

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
   *
   * Es lo único propio de cada criatura. **Cuántos ingredientes lleva ya no**:
   * eso sale de la vuelta en que aparece, con `ingredientesDeNivel`. Estuvo
   * escrito acá y era una segunda verdad sobre la misma cosa; reordenar las
   * vueltas dejaba las dos peleadas y nadie se enteraba hasta jugarlo.
   */
  peso: number;
};

/**
 * La dificultad de cada criatura.
 *
 * Los nombres siguen siendo los provisorios que se pusieron para poder mostrar
 * algo; cuando cambien, cambian acá y en `art/index.ts` y en ningún otro lado.
 */
export const REGLAS: Record<string, Regla> = {
  'dragon-turquesa': { peso: 100 }, // el tutorial
  'capibara-alado': { peso: 90 },
  'cachorro-miel': { peso: 90 },
  'dragon-musgo': { peso: 55 },
  'lobo-niebla': { peso: 55 },
  'gato-bruma': { peso: 45 },
  fenix: { peso: 18 },
  'oso-dorado': { peso: 14 },
};

const REGLA_POR_DEFECTO: Regla = { peso: 50 };

export const reglaDe = (id: string): Regla => REGLAS[id] ?? REGLA_POR_DEFECTO;

/**
 * Cuánto se encarece todo en cada vuelta.
 *
 * El nivel 1 vale 1; cada vuelta suma un 35%. En la octava hace falta poco más
 * del triple que en la primera, que alcanza para que se note sin volverse una
 * pared.
 *
 * **La dificultad la da el lugar en `ORDEN_DE_VUELTAS`, no el bicho.** Un bicho
 * no es difícil por sí mismo: es difícil el momento del juego en que aparece.
 * Con la dificultad escrita por criatura, reordenar las vueltas dejaba una
 * pared en la tercera o un regalo en la séptima sin que nadie lo notara hasta
 * jugarlo.
 */
export const costoDeNivel = (nivel: number) => 1 + (nivel - 1) * 0.35;

/**
 * Cuántos ingredientes lleva cada receta de esta vuelta.
 *
 * También sale del orden: las dos primeras vueltas van con dos —se puede
 * empezar sin saber nada—, las cuatro del medio con tres y las dos últimas con
 * cuatro.
 */
export const ingredientesDeNivel = (nivel: number) => (nivel <= 2 ? 2 : nivel <= 6 ? 3 : 4);

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
