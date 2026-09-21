import type { EnCrianza } from './guardado';

/**
 * Las reglas de la crianza: cuánto avanza la barra, cuánto baja sola, y cuándo
 * la criatura está lista para volverse adulta.
 *
 * Son funciones puras sobre el estado guardado. No tocan almacenamiento ni
 * pantallas, así que se pueden probar y ajustar sin abrir el juego.
 */

/**
 * Cuántas criaturas se pueden criar a la vez.
 *
 * En desarrollo no hay tope: probar la crianza con pocas criaturas cuando hay
 * ocho para ver obliga a terminar una para mirar la siguiente. En la app
 * instalada son **cuatro**, que es lo que evita que se junten las ocho y el
 * juego se convierta en administrar una lista.
 *
 * Cuatro y no tres porque es lo que entra en la ruleta: la rueda tiene ocho
 * gajos y les da la mitad a las criaturas, así que el tope de acá y el de allá
 * son el mismo número. Ver `MAX_BICHOS_EN_RULETA`.
 */
export const MAX_CRIANZA = __DEV__ ? 8 : 4;

/**
 * Tramos de la barra de evolución: uno por nivel de preparación.
 *
 * La transición de arte es una sola —bebé a adulto—, pero si la barra se
 * llenara con una sola comida el juego duraría dos minutos.
 *
 * Son tres y no cinco porque tres es lo que hay: las preparaciones tienen tres
 * niveles, y cada tramo pide uno. Con cinco tramos la dificultad subía sin un
 * motivo que se pudiera explicar; así, subir de tramo es literalmente pasar al
 * nivel siguiente de cocina, y la escalera de la barra y la de las recetas son
 * la misma cosa.
 */
export const TRAMOS = 3;

/**
 * ## Acá había un decaimiento y se sacó
 *
 * La barra bajaba sola después de dos días sin atención, salvo la del tutorial.
 * Se sacó **para todas**: es complejidad justo donde el juego ya pide bastante
 * —buscar con la cámara, cocinar la escalera de recetas, seguir varias crianzas
 * a la vez— y lo que agregaba era el miedo a irse, no una decisión interesante.
 *
 * Lo que se avanzó queda. Volver a los tres días es encontrar todo donde estaba.
 */

/** La barra entera, de 0 a 1, para dibujarla de un saque. */
export function progreso(c: EnCrianza): number {
  return Math.min(1, (c.tramo + c.avance) / TRAMOS);
}

/**
 * **Los tramos se comen en orden.**
 *
 * Una criatura solo acepta lo que pide el tramo en curso. Puede pasar —y está
 * bien que pase— que un tramo de más adelante ya esté cubierto mientras al de
 * ahora le falta algo: los pedidos son independientes, y para armar una
 * preparación de nivel 2 hay que armar antes *una* de nivel 1, no
 * necesariamente las que este bicho pide.
 *
 * Eso es stock guardado, no un permiso para saltear. Si se pudiera adelantar, la
 * escalera de tres tramos dejaría de ser una escalera.
 */

/**
 * Le da de comer: suma avance y sube de tramo si se llenó.
 *
 * El sobrante **no** pasa al tramo siguiente. Cada tramo pide su propia
 * preparación, y dejar que una comida muy buena empuje dos tramos de una haría
 * que la receta difícil del tramo cuatro se saltee sola.
 */
export function alimentar(c: EnCrianza, cuanto: number, ahora = Date.now()): EnCrianza {
  const ultimaAtencion = new Date(ahora).toISOString();
  const lleno = c.avance + cuanto >= 1;

  if (!lleno) return { ...c, avance: c.avance + cuanto, ultimaAtencion };

  // El último tramo se completa pero no desborda: de ahí en adelante lo que
  // falta es la poción, no más comida.
  const tramo = Math.min(TRAMOS, c.tramo + 1);
  return { ...c, tramo, avance: 0, ultimaAtencion };
}

/** Le da la poción que habilita el salto final. */
export function darPocion(c: EnCrianza, ahora = Date.now()): EnCrianza {
  return { ...c, pocion: true, ultimaAtencion: new Date(ahora).toISOString() };
}

/**
 * Está listo para volverse adulto: la barra llena **y** la poción tomada.
 *
 * Son dos cosas distintas a propósito. La comida llena la barra; la poción es lo
 * que abre la puerta. Si las dos hicieran lo mismo, tener dos sistemas de
 * combinación sería el mismo sistema escrito dos veces.
 */
export function listoParaAdulto(c: EnCrianza): boolean {
  return c.tramo >= TRAMOS && c.pocion;
}

/** El estado con que arranca una criatura recién salida del cascarón. */
export function recienNacida(criatura: string, ahora = Date.now()): EnCrianza {
  const iso = new Date(ahora).toISOString();
  return {
    criatura,
    tramo: 0,
    avance: 0,
    entregado: {},
    ultimaAtencion: iso,
    pocion: false,
    desde: iso,
  };
}
