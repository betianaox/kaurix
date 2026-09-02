import { POCIONES, recetaPorId, type Receta } from './recetas';
import { COMIDAS } from './comidas';

/**
 * Qué le pide cada criatura para crecer.
 *
 * ## Por qué un menú y no "cualquier comida"
 *
 * Si sirviera cualquier preparación del nivel, se armaría siempre la más barata
 * y las otras treinta y ocho no las miraría nadie. Todo el arte, todas las
 * recetas y la escalera entera quedarían como un menú que se abre una vez.
 *
 * Y pedir *todas* es imposible: son diecisiete de nivel 1.
 *
 * Así que cada criatura pide **una lista corta y propia**. Eso hace tres cosas
 * al mismo tiempo: criar al dragón deja de ser igual que criar al capibara,
 * entre las ocho criaturas se termina usando casi todo el catálogo, y el
 * objetivo se lee de un vistazo.
 *
 * ## Cuánto
 *
 * En la primera vuelta son **3 preparaciones de nivel 1, 2 de nivel 2 y 1 de
 * nivel 3**, más la poción que abre el salto a adulto. En cada vuelta siguiente
 * se pide **la misma lista pero más veces**: en la vuelta 5, cinco de cada una.
 *
 * La lista no crece, crece la cantidad. Es a propósito: seis renglones distintos
 * no entran en pantalla, pero "×6" al lado de uno sí, y se entiende igual.
 *
 * ## Por qué es estable
 *
 * El menú sale de un sorteo con semilla, no de guardarlo. Dos aperturas de la
 * misma ficha dan lo mismo siempre, y no ocupa un byte en el guardado. Cambiar
 * de vuelta cambia la semilla, así que la vuelta 2 pide otra cosa — que es lo
 * que evita que ocho vueltas se sientan la misma.
 */

export type Pedido = {
  receta: Receta;
  /** Cuántas hacen falta. Crece con la vuelta. */
  cantidad: number;
};

/** Cuántas preparaciones distintas pide cada tramo. */
const CUANTAS = [3, 2, 1];

/**
 * Un número al azar pero siempre el mismo para la misma semilla.
 *
 * Alcanza de sobra para repartir menús y tiene la propiedad que hace falta: dos
 * corridas dan lo mismo, en cualquier teléfono.
 */
function azarCon(semilla: number) {
  let s = semilla >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Un número a partir de un texto, para poder sembrar con nombres. */
function semillaDe(texto: string) {
  let h = 2166136261;
  for (let i = 0; i < texto.length; i++) {
    h ^= texto.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/** Elige `cuantas` de la lista, sin repetir, de forma estable. */
function elegir<T>(pozo: T[], cuantas: number, azar: () => number): T[] {
  const copia = [...pozo];
  // Barajado de Fisher–Yates: toma cada lugar una vez y no favorece a ninguno,
  // que es lo que hace falta para que ninguna receta quede fuera del juego.
  for (let i = copia.length - 1; i > 0; i--) {
    const j = Math.floor(azar() * (i + 1));
    [copia[i], copia[j]] = [copia[j], copia[i]];
  }
  return copia.slice(0, Math.min(cuantas, copia.length));
}

/**
 * Las comidas que pide una criatura en un tramo.
 *
 * `tramo` va de 0 a 2 y se corresponde con el nivel de las preparaciones.
 */
export function menuDe(criatura: string, tramo: number, vuelta: number): Pedido[] {
  const nivel = tramo + 1;
  const pozo = COMIDAS.filter((c) => c.nivel === nivel);
  const azar = azarCon(semillaDe(`${criatura}|comida|${nivel}|${vuelta}`));

  return elegir(pozo, CUANTAS[tramo] ?? 1, azar)
    .map((c) => ({ receta: recetaPorId(c.id)!, cantidad: vuelta }))
    .filter((p) => !!p.receta);
}

/**
 * La poción que abre el salto a adulto.
 *
 * Siempre una sola y siempre de nivel 3: es el último paso y tiene que
 * sentirse como tal. Lo que cambia con la vuelta es cuántas hacen falta.
 */
export function pocionDe(criatura: string, vuelta: number): Pedido | null {
  const pozo = POCIONES.filter((p) => p.nivel === 3);
  if (!pozo.length) return null;

  const azar = azarCon(semillaDe(`${criatura}|pocion|${vuelta}`));
  const [elegida] = elegir(pozo, 1, azar);
  return { receta: elegida, cantidad: vuelta };
}

/**
 * Cuánto falta de un pedido.
 *
 * Se mide contra lo **entregado**, no contra lo que hay en el morral: tener la
 * comida guardada no es habérsela dado.
 */
export const faltanDe = (p: Pedido, entregado: Record<string, number>) =>
  Math.max(0, p.cantidad - (entregado[p.receta.id] ?? 0));

/** El tramo está completo: se entregó todo lo que pedía. */
export const tramoCompleto = (pedidos: Pedido[], entregado: Record<string, number>) =>
  pedidos.every((p) => faltanDe(p, entregado) === 0);

/** Cuánto lleva entregado el tramo, de 0 a 1. Es lo que dibuja la barra. */
export function avanceDe(pedidos: Pedido[], entregado: Record<string, number>) {
  const pide = pedidos.reduce((s, p) => s + p.cantidad, 0);
  if (!pide) return 0;
  const dado = pedidos.reduce(
    (s, p) => s + Math.min(p.cantidad, entregado[p.receta.id] ?? 0),
    0
  );
  return dado / pide;
}
