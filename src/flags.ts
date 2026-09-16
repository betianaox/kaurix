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
export const RECONOCEDOR_MANDA = false;

/**
 * Todo al alcance de la mano, para probar sentado.
 *
 * **Encendido.** La criatura se acerca en unos tres segundos de tenerla
 * centrada y los ingredientes salen cada 3,8 s: el juego entero cabe en un
 * metro cuadrado. Es lo que permite probar la cocina, las recetas o el cartel
 * de lo que encontrás sin salir a caminar veinte metros por cada prueba.
 *
 * Apagado son las distancias de verdad: la criatura tarda cerca de veinte
 * segundos de seguimiento sostenido y los ingredientes se espacian. Esos son
 * los números que hay que calibrar en la calle, y los que van a producción.
 *
 * **Se apaga** para probar el ritmo real, y antes de mandar a testing cerrado.
 */
export const TODO_CERCA = true;
