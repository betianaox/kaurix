import { PREMIO_SIEMPRE } from '../flags';
import type { LugarId } from './ingredientes';

/**
 * ───────────────────────────────────────────────────────────────────────────
 * EL CAMINO DE LOS DÍAS
 * ───────────────────────────────────────────────────────────────────────────
 * Siete pasos, uno por día, cada uno con un premio mejor que el anterior. Al
 * llegar al séptimo vuelve a empezar, así que no se termina nunca.
 *
 * ## Cada día abre DOS premios, y son dos caminos distintos
 *
 * Uno gratis y uno por video. **No son dos formas de cobrar lo mismo**: son dos
 * colas que avanzan por separado. Tomar el gratis no consume el del video, y no
 * tomar el del video no frena al gratis.
 *
 * Por eso el estado son dos contadores y no uno: `gratis` y `videos`, cada uno
 * apuntando a cuántos premios de esa cola se llevaron. Con un solo contador
 * —como estuvo— cobrar de un lado apagaba el otro, que es exactamente lo que no
 * tiene que pasar.
 *
 * ## Lo que no se cobró no se pierde
 *
 * Los días se abren solos; los premios esperan. Quien tomó el gratis del día 1 y
 * no miró el video, al día siguiente tiene tres cosas para cobrar: el video del
 * 1, y el gratis y el video del 2.
 *
 * Es la misma decisión que se tomó con la crianza cuando se le sacó el
 * decaimiento: **lo que agregaba era el miedo a irse, no una decisión
 * interesante**. Un premio que caduca a la medianoche castiga por no haber
 * entrado, y en un juego que se juega apuntando la cámara a la cocina de tu
 * casa, el que se siente vigilado desinstala.
 *
 * ## Dentro de lo abierto, en el orden que sea
 *
 * Lo que no se puede saltear son los **días**, y de eso ya se encarga
 * `abiertos`: la poción del séptimo no se toca hasta que pasen siete jornadas,
 * se haya cobrado lo anterior o no.
 *
 * Cada cola estuvo obligada a cobrarse en orden encima de eso, y no agregaba
 * nada: dentro de lo ya abierto se van a cobrar todos igual, así que forzar la
 * secuencia solo dejaba premios a la vista que no respondían al tocarlos. Lo
 * que se ve entero y a color se puede tocar; lo que todavía no llegó, no.
 *
 * ## Se abre un día por jornada, no uno por día ausente
 *
 * Quien vuelve después de una semana encuentra **un** día nuevo, no siete. El
 * camino espera, pero no acumula: si acumulara, no entrar sería la mejor forma
 * de jugar, y volver una vez al mes daría treinta premios de un saque.
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
 * Por cuánto se multiplica el premio si se mira un video.
 *
 * **Dos, y no tres como en la ruleta o en la cámara.** Allá el video da lo mismo
 * por tres y nada más; acá da el doble **y además otra cosa distinta**, porque
 * la segunda columna muestra otro ingrediente. Dos cosas a la vez pesan más que
 * una sola por tres, y triplicar encima de la variedad convertía la columna
 * gratis en algo que nadie tocaría.
 */
export const MULTIPLICADOR = 2;

/**
 * Lo que da un paso.
 *
 * `ingredientes` da **cosas distintas de un mismo lugar**: `cuantos` cuenta
 * cuántas clases salen, una unidad de cada una, y `lugar` de dónde salen.
 *
 * Un lugar distinto por día —fruta, flores, verdura, despensa— para que la
 * semana no sea siete veces lo mismo con otro número. Sorteando entre los
 * setenta y cuatro, todos los días daban una mezcla parecida: un poco de todo y
 * nada en particular. Con el lugar fijo, el día de las flores es el día de las
 * flores, y quien necesita flores sabe cuándo vuelve.
 *
 * Fue al revés —uno solo, repetido— con el argumento de que tres frutillas
 * sirven para una receta y tres cosas sueltas no. **Era al revés.** Ninguna de
 * las cincuenta y dos recetas repite ingrediente: todas piden tres cosas
 * distintas. Tres frutillas no cocinan absolutamente nada; tres cosas distintas
 * son, exactamente, la forma de una receta.
 *
 * `comida` y `pocion` piden una preparación de ese nivel. Cuál sale exactamente
 * es cosa del store, que es el que sortea: acá solo se dice qué clase de premio
 * toca.
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
  /**
   * El dibujo de la columna del video.
   *
   * Otro distinto del de la izquierda, a propósito. Las dos columnas dan la
   * misma clase de cosa —lo que cambia es cuánta— pero con el mismo dibujo en
   * las dos el escalón se veía como una cosa duplicada en vez de como dos
   * premios. Y de paso el camino entero muestra catorce ingredientes en vez de
   * siete, que es media despensa a la vista.
   *
   * Igual que `muestra`, es **de muestra**: lo que sale de verdad se sortea al
   * cobrarlo.
   */
  otra: string;
} & (
  | {
      tipo: 'ingredientes';
      cuantos: number;
      /**
       * De dónde salen. Nunca pide más clases de las que hay en ese lugar: la
       * tierra tiene dos y las plantas cinco, así que no dan días de seis.
       */
      lugar: LugarId;
    }
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
  { tipo: 'ingredientes', lugar: 'fruta', cuantos: 3, muestra: 'manzana', otra: 'frutilla' },
  { tipo: 'ingredientes', lugar: 'flor', cuantos: 4, muestra: 'manzanilla', otra: 'lavanda' },
  { tipo: 'ingredientes', lugar: 'verdura', cuantos: 6, muestra: 'zanahoria', otra: 'morron' },
  { tipo: 'comida', nivel: 1, muestra: 'pan-molde', otra: 'sopa-verduras' },
  { tipo: 'ingredientes', lugar: 'despensa', cuantos: 8, muestra: 'queso', otra: 'huevo' },
  { tipo: 'comida', nivel: 2, muestra: 'sandwich', otra: 'tarta-manzana' },
  { tipo: 'pocion', muestra: 'savia', otra: 'ambar' },
];

/**
 * Lo que se llevó al cobrar, ya resuelto a cosas concretas.
 *
 * `null` cuando no había nada que cobrar. Lo arma el store, que es el que
 * sortea: acá vive el tipo para que la pantalla y el store hablen de lo mismo.
 */
export type Reclamo =
  /**
   * Varias clases distintas, cada una con su cuenta.
   *
   * Una lista y no un id suelto porque el premio de ingredientes no es una cosa
   * repetida: son tres, cuatro o seis clases diferentes. Con el video, las
   * mismas clases con el doble de unidades cada una.
   */
  | { tipo: 'ingredientes'; cosas: { id: string; cuantos: number }[] }
  // Las preparaciones también llevan cuenta: con el video salen dos de la
  // misma, y el cartel tiene que poder decirlo.
  | { tipo: 'comida'; id: string; cuantos: number }
  | { tipo: 'pocion'; id: string; cuantos: number }
  | null;

/** En qué punto va cada una de las dos colas. */
export type Sendero = {
  /**
   * Cuántos días se abrieron. Uno el primero, y uno más por cada jornada.
   *
   * **No es cuántos se cobraron.** Es cuántos premios llegó a haber de cada
   * lado; lo que se llevó de cada cola lo cuentan `gratis` y `videos`.
   */
  abiertos: number;
  /**
   * El día calendario en que se abrió el último, como `2026-09-10`.
   *
   * Se guarda la fecha y no un booleano porque un booleano habría que limpiarlo,
   * y limpiarlo obliga a saber cuándo empieza el día: con la fecha guardada, la
   * pregunta se contesta comparando contra hoy y no hay nada que mantener.
   */
  ultimo: string | null;
  /**
   * El primer día del que todavía se debe algo.
   *
   * Todo lo anterior está cobrado de los dos lados. Existe para poder **tirar**
   * los días viejos de las listas sin perder la memoria de que se cobraron: sin
   * este número, un día podado se volvía a leer como no cobrado y reaparecía
   * cobrable, con la ventana saltando para atrás.
   */
  base: number;
  /**
   * Qué días cobraron su premio gratis, de `base` en adelante.
   *
   * La lista de días y no cuántos: al poder cobrarse en cualquier orden, un
   * contador no alcanza —cobrar el 3 con el 1 pendiente no es "llevo uno"—.
   * Se podan los de vueltas cerradas; ver `podar`.
   */
  gratis: number[];
  /** Igual, para los que se cobraron mirando un video. */
  videos: number[];
};

export const senderoNuevo = (): Sendero => ({
  abiertos: 1,
  ultimo: null,
  base: 1,
  gratis: [],
  videos: [],
});

/** El premio que le toca a un día. El ciclo de siete se repite. */
export const premioDe = (dia: number): Premio => CAMINO[(dia - 1) % PASOS];

/**
 * El día calendario de una fecha, en la zona del teléfono.
 *
 * Se compara por día y no por horas: quien entró anoche a las 23 y vuelve hoy a
 * las 8 hizo dos días, aunque hayan pasado nueve horas. Es la misma cuenta que
 * usa el giro gratis de la ruleta.
 */
const diaDe = (ms: number) => new Date(ms).toLocaleDateString('sv');

/**
 * El sendero con el día de hoy abierto, si correspondía abrirlo.
 *
 * Se llama al arrancar y antes de cada cobro: alcanza con eso, porque lo único
 * que puede cambiar sin que nadie toque nada es la fecha. Devuelve **el mismo
 * objeto** cuando no hay nada que abrir, así que llamarlo de más no ensucia el
 * estado ni escribe disco.
 *
 * Abre **uno**, no uno por día ausente. El porqué está arriba.
 */
export function abrirElDia(s: Sendero, ahora = Date.now()): Sendero {
  const hoy = diaDe(ahora);
  if (s.ultimo === hoy) return s;
  // La primera vez solo se anota la fecha: el día uno ya viene abierto.
  if (s.ultimo === null) return { ...s, ultimo: hoy };
  return { ...s, abiertos: s.abiertos + 1, ultimo: hoy };
}

/**
 * Si ese día ya cobró su premio gratis.
 *
 * Lo anterior a `base` está cobrado por definición: por eso quedó atrás.
 */
export const gratisCobrado = (s: Sendero, dia: number): boolean =>
  dia < s.base || s.gratis.includes(dia);

/** Si ese día ya cobró su premio por video. */
export const videoCobrado = (s: Sendero, dia: number): boolean =>
  dia < s.base || s.videos.includes(dia);

/**
 * Si ese día abrió y todavía no cobró lo suyo.
 *
 * Las dos preguntas son la misma sobre colas distintas: el día llegó y no se
 * tomó. Un día que abrió se puede cobrar en el momento que sea, en el orden que
 * sea; uno que no abrió, nunca. Ver arriba.
 */
export const gratisDisponible = (s: Sendero, dia: number): boolean =>
  dia <= s.abiertos && !gratisCobrado(s, dia);

export const videoDisponible = (s: Sendero, dia: number): boolean =>
  dia <= s.abiertos && !videoCobrado(s, dia);

/** El sendero después de cobrar el gratis de un día. Toca esa cola y solo esa. */
export const cobradoGratis = (s: Sendero, dia: number): Sendero =>
  podar({ ...s, gratis: [...s.gratis, dia] });

/** El sendero después de cobrar el video de un día. */
export const cobradoVideo = (s: Sendero, dia: number): Sendero =>
  podar({ ...s, videos: [...s.videos, dia] });

/**
 * Corre la base hasta el primer día que todavía deba algo, y tira lo de atrás.
 *
 * Sin esto las dos listas crecen para siempre: un año jugando son setecientos
 * números que nadie va a volver a mirar. Solo se tiran los días **cobrados de
 * los dos lados**; uno con el video pendiente frena la base y se queda, por
 * viejo que sea. Es lo que hace que no se pierda nada.
 */
function podar(s: Sendero): Sendero {
  let base = s.base;
  while (s.gratis.includes(base) && s.videos.includes(base)) base++;
  if (base === s.base) return s;
  return {
    ...s,
    base,
    gratis: s.gratis.filter((d) => d >= base),
    videos: s.videos.filter((d) => d >= base),
  };
}

/**
 * Desde qué día arranca lo que se muestra.
 *
 * **La vuelta entera, siempre**, no lo que queda por cobrar. Los días ya
 * cobrados se siguen viendo con su tilde: el camino es una escalera y una
 * escalera de la que se van borrando los escalones de atrás no deja ver cuánto
 * se subió, que es la mitad de lo que tiene para contar.
 *
 * La vuelta la marca **la cola más atrasada**. Si la marcara la del gratis, un
 * video sin cobrar de la vuelta anterior quedaría fuera de pantalla: disponible
 * y sin forma de tocarlo.
 */
export function primerDiaVisible(s: Sendero): number {
  // El primero que todavía deba algo, o el de hoy si no queda nada.
  let pendiente = Math.max(s.base, 1);
  while (pendiente < s.abiertos && gratisCobrado(s, pendiente) && videoCobrado(s, pendiente)) {
    pendiente++;
  }
  return Math.floor((pendiente - 1) / PASOS) * PASOS + 1;
}

/**
 * Cuántos días se dibujan. Siete, salvo que haga falta estirar.
 *
 * Las dos colas pueden separarse más de una vuelta: quien cobra los gratis todos
 * los días y no mira un solo video, después de dos semanas tiene el gratis en el
 * día 15 y el video en el 1. Con siete escalones fijos, el gratis que se puede
 * cobrar quedaría fuera de la lista y esa cola se vería trabada, que es
 * justamente lo que no puede pasar: **no cobrar de un lado no frena el otro**.
 *
 * Así que la lista se estira hasta alcanzar al más adelantado. Es raro y se ve
 * raro —una escalera más larga de lo normal— y está bien que se vea: es la
 * pantalla diciendo que hay una cola muy atrasada.
 */
export function diasVisibles(s: Sendero): number {
  const desde = primerDiaVisible(s);
  return Math.max(PASOS, s.abiertos - desde + 1);
}

/**
 * Cuántas cosas hay para cobrar ahora mismo.
 *
 * Las dos colas suman: lo que quedó abierto de un lado más lo del otro. Quien
 * tomó solo el gratis del día 1 ve un 3 al día siguiente —el video del 1, y el
 * gratis y el video del 2—, que es la cuenta que tiene que ver.
 */
export const pendientesDe = (s: Sendero, ahora = Date.now()): number => {
  const a = abrirElDia(s, ahora);
  // Lo cobrado son los que quedaron atrás de la base más los de la lista.
  const hechos = (cola: readonly number[]) => a.base - 1 + cola.length;
  return a.abiertos - hechos(a.gratis) + (a.abiertos - hechos(a.videos));
};
