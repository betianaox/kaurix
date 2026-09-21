/**
 * ───────────────────────────────────────────────────────────────────────────
 * INTERRUPTORES PARA PROBAR EL JUEGO POR PARTES
 * ───────────────────────────────────────────────────────────────────────────
 * Piezas terminadas que se apagan a propósito para poder probar el resto sin
 * pelear con ellas.
 *
 * No son configuración ni tienen que sobrevivir a la primera versión: cada uno
 * dice acá abajo cuándo se enciende y cuándo se borra. Un flag sin fecha de
 * salida se queda para siempre y termina siendo una rama muerta que nadie
 * entiende.
 *
 * Son constantes, no estado: el bundler resuelve el `if` en tiempo de
 * compilación y la rama apagada ni siquiera llega al teléfono.
 */

/**
 * Todo al alcance de la mano, para probar sentado.
 *
 * **Solo en desarrollo**, y por eso no hay nada que acordarse de apagar antes
 * de publicar: en la app instalada es siempre falso y los números salen del
 * modo que se haya elegido, fácil o difícil. Ver `juego/dificultad.ts`.
 *
 * Mientras corre desde la computadora, en cambio, el juego entero cabe en un
 * metro cuadrado: la criatura se acerca en unos segundos, las esperas son de un
 * minuto y los ingredientes salen seguido. Es lo que permite probar la cocina,
 * las recetas o el cartel de lo que encontrás sin salir a caminar veinte metros
 * por cada prueba.
 *
 * La contra, que conviene tener presente: **en desarrollo el modo no se nota**,
 * porque esto lo pisa. Para ver la diferencia entre fácil y difícil hay que
 * probar un build de verdad.
 */
export const TODO_CERCA = __DEV__;
