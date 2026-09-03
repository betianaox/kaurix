/**
 * La ruleta del centro de la colección.
 *
 * Una vez por día se gira gratis, cae en una de las ocho criaturas, y esa
 * criatura queda **impulsada** unas horas: cada preparación que le des cuenta
 * doble, así que llena los tramos con la mitad de comida.
 *
 * Si cae en una que no te sirve —porque no la estás criando, o porque no tenés
 * nada cocinado— se puede volver a girar mirando un video, las veces que haga
 * falta. Ahí está la segunda pata: el giro diario da un motivo para abrir el
 * juego todos los días, y el regiro da un motivo para mirar un anuncio.
 *
 * ## Hay un solo impulso a la vez
 *
 * Girar de nuevo PISA el anterior. Es lo que hace que el regiro sea una
 * decisión y no una acumulación: si se sumaran, mirar diez videos dejaría a los
 * tres bichos al doble para siempre y el sistema dejaría de significar algo.
 */

/**
 * Cuánto multiplica cada entrega mientras dura.
 *
 * Es una perilla de balance: con 2 el tramo que pedía cuatro preparaciones se
 * llena con dos, que es un salto que se ve. Bajarlo a 1.5 lo hace más suave
 * —y más difícil de notar, porque los pedidos son de pocas unidades—.
 */
export const FACTOR = 2;

/** Cuánto dura el impulso desde que se gira. */
export const DURACION_HORAS = 3;

export type Impulso = {
  /** A qué criatura le tocó. */
  criatura: string;
  /** Hasta cuándo, en ISO. */
  hasta: string;
};

const HORA_MS = 60 * 60 * 1000;

/** El día del calendario de una fecha, para comparar giros. */
const dia = (ms: number) => new Date(ms).toDateString();

/**
 * Se puede girar gratis: nunca se giró, o el último giro fue otro día.
 *
 * Se compara el DÍA y no "hace 24 horas" a propósito. Con las 24 horas, quien
 * juega a las nueve de la noche tiene que jugar cada vez más tarde para no
 * perder el giro, y termina castigado por ser puntual. Con el día del
 * calendario, el giro de mañana está disponible mañana y listo.
 */
export function puedeGirarGratis(ultimoGiro: string | null, ahora = Date.now()): boolean {
  if (!ultimoGiro) return true;
  const cuando = Date.parse(ultimoGiro);
  if (Number.isNaN(cuando)) return true;
  return dia(cuando) !== dia(ahora);
}

/** El impulso, si todavía está vigente. Si venció, `null`. */
export function impulsoVigente(impulso: Impulso | null, ahora = Date.now()): Impulso | null {
  if (!impulso) return null;
  const hasta = Date.parse(impulso.hasta);
  if (Number.isNaN(hasta) || hasta <= ahora) return null;
  return impulso;
}

/** Arma el impulso que deja un giro. */
export function nuevoImpulso(criatura: string, ahora = Date.now()): Impulso {
  return { criatura, hasta: new Date(ahora + DURACION_HORAS * HORA_MS).toISOString() };
}

/**
 * Por cuánto se multiplica lo que se le da a esta criatura.
 *
 * Devuelve 1 cuando no hay impulso, o cuando el impulso es de otra: así quien
 * llama no tiene que preguntar nada, multiplica y ya.
 */
export function multiplicadorDe(
  impulso: Impulso | null,
  criatura: string,
  ahora = Date.now()
): number {
  const vigente = impulsoVigente(impulso, ahora);
  return vigente && vigente.criatura === criatura ? FACTOR : 1;
}

/**
 * Cuántos milisegundos le quedan al impulso. 0 si no hay o ya venció.
 *
 * Es lo que necesita el contador de la pantalla, y se calcula acá para que la
 * cuenta viva con las reglas y no repartida por la interfaz.
 */
export function restanteMs(impulso: Impulso | null, ahora = Date.now()): number {
  const vigente = impulsoVigente(impulso, ahora);
  return vigente ? Math.max(0, Date.parse(vigente.hasta) - ahora) : 0;
}

/** "2:45" — lo que queda, para mostrar. */
export function comoReloj(ms: number): string {
  const total = Math.ceil(ms / 60000);
  const horas = Math.floor(total / 60);
  const minutos = total % 60;
  return `${horas}:${String(minutos).padStart(2, '0')}`;
}
