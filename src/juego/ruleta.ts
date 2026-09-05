import { azarCon, porPeso, semillaDe } from './azar';

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

/* ────────────────────────────────────────────────────────────────────────── */

/**
 * QUÉ MUESTRA LA RUEDA
 *
 * La ruleta tiene que servir **siempre**, incluso el primer día, cuando no hay
 * ninguna criatura para impulsar. Por eso los gajos no son las ocho criaturas
 * fijas: son lo que hoy tiene sentido darte.
 *
 * - **Las criaturas que estás criando**, hasta cuatro. Nunca las que todavía no
 *   encontraste: un gajo con una sombra es un gajo que no da nada, y una ruleta
 *   donde cinco de ocho casillas no dan nada no es una ruleta, es una trampa.
 * - **El resto, ingredientes**, que se regalan al caer ahí. Al principio son los
 *   ocho gajos; después van cediendo lugar a los bichos.
 *
 * Y se intercalan. Con los bichos juntos de un lado, media rueda se lee como la
 * mitad buena y la otra como la mitad de relleno.
 */

/** Una casilla de la rueda: o una criatura para impulsar, o un regalo. */
export type Casilla =
  | { tipo: 'bicho'; criatura: string }
  | { tipo: 'ingrediente'; ingrediente: string; cantidad: number };

/** Cuántas criaturas entran en la rueda. El resto de los gajos son regalos. */
export const MAX_BICHOS_EN_RULETA = 4;

/**
 * Desde qué peso un ingrediente se considera común.
 *
 * Los de abajo —los minerales esquivos, los camarones, la ananá— **salen
 * siempre de a uno**. Regalar dos obsidianas de un giro gratis desarma la
 * economía de las pociones, que es justamente la parte cara del juego.
 */
const PESO_COMUN = 60;

/**
 * Cuánto se exagera la ventaja de lo común al sortear.
 *
 * El `peso` del catálogo ya dice qué tan seguido aparece cada cosa, pero
 * usarlo tal cual deja el 6% de los gajos en manos de los esquivos y el peso
 * medio en 79 contra 66 del catálogo: un sesgo que casi no se nota. Al
 * cuadrado, el peso medio sube a 89 y los esquivos bajan al 2%.
 *
 * No a cero: que de vez en cuando caiga un rubí es lo que hace que valga la
 * pena mirar la rueda. Lo que no puede pasar es que sea lo habitual, porque un
 * regalo de algo que no se puede usar todavía no es un regalo.
 */
const SESGO = 2;

/**
 * Qué hay en cada gajo hoy.
 *
 * **No se guarda.** Sale de una semilla hecha con el día y con cuántas veces se
 * pidió cambiarlo, así que se mantiene igual durante todo el día y vuelve a dar
 * lo mismo cada vez que se abre la ruleta. Guardarlo sería escribir en disco
 * algo que se puede volver a calcular.
 *
 * `gajos` es cuántas casillas tiene el dibujo de la rueda.
 */
export function contenidoDeLaRuleta(
  enCrianza: readonly string[],
  ingredientes: readonly { id: string; peso: number }[],
  gajos: number,
  dia: string,
  cambios: number
): Casilla[] {
  const azar = azarCon(semillaDe(`ruleta|${dia}|${cambios}`));

  const bichos: Casilla[] = enCrianza
    .slice(0, MAX_BICHOS_EN_RULETA)
    .map((criatura) => ({ tipo: 'bicho', criatura }));

  // Los regalos se sortean por peso, así que salen sobre todo cosas comunes.
  // Sin repetir: dos gajos con lo mismo se ven como un error del juego.
  const regalos: Casilla[] = [];
  const usados = new Set<string>();
  let intentos = 0;
  while (regalos.length < gajos - bichos.length && intentos < gajos * 20) {
    intentos++;
    const i = porPeso(ingredientes, (x) => Math.pow(x.peso, SESGO), azar);
    if (usados.has(i.id)) continue;
    usados.add(i.id);
    regalos.push({
      tipo: 'ingrediente',
      ingrediente: i.id,
      // Los esquivos, de a uno siempre. Los comunes, uno o dos.
      cantidad: i.peso >= PESO_COMUN && azar() < 0.5 ? 2 : 1,
    });
  }

  return intercalar(bichos, regalos);
}

/**
 * Reparte las dos listas alternando, empezando por la más corta.
 *
 * Empieza por la corta a propósito: así los bichos —que siempre son menos—
 * quedan repartidos por toda la rueda en vez de amontonados al principio.
 */
function intercalar(pocos: Casilla[], muchos: Casilla[]): Casilla[] {
  if (!pocos.length) return muchos;
  const cada = Math.floor((pocos.length + muchos.length) / pocos.length);
  const salida: Casilla[] = [];
  let p = 0;
  let m = 0;
  for (let i = 0; i < pocos.length + muchos.length; i++) {
    if (i % cada === 0 && p < pocos.length) salida.push(pocos[p++]);
    else if (m < muchos.length) salida.push(muchos[m++]);
    else salida.push(pocos[p++]);
  }
  return salida;
}
