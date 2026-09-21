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
 * Si lo que aparece sale de lo que la cámara ve.
 *
 * **Apagado.** Con esto en `false` el juego sortea libre cada tanto, como antes
 * del reconocedor: aparece cualquier cosa sin mirar qué hay enfrente, y la
 * cámara no saca ninguna foto.
 *
 * Está apagado para poder probar todo lo demás —la secuencia, las recetas, el
 * video, la tablet— sin tener que apuntarle a un ladrillo para que pase algo.
 * El reconocedor es lo último que se prueba, y se prueba solo: es el diferencial
 * del juego y merece su propia vuelta, no colarse en las pruebas de otra cosa.
 *
 * **Se enciende** cuando el resto esté andando y toque pulirlo, antes de mandar
 * a testing cerrado. Ahí este flag se borra y se queda solo `disponible`, que es
 * la pregunta de verdad —si este binario trae el reconocedor— y no un
 * interruptor de pruebas.
 */
export const RECONOCEDOR_MANDA = true;

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
