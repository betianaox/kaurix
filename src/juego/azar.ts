/**
 * Azar con semilla: el mismo número siempre, para la misma semilla.
 *
 * Vive aparte porque lo usan dos cosas que no se conocen entre sí —el menú de
 * cada criatura y el contenido de la ruleta— y las dos necesitan lo mismo: que
 * el resultado no se guarde en ningún lado y aun así sea idéntico cada vez que
 * se lo vuelve a pedir.
 *
 * Eso es lo que permite que la ruleta muestre lo mismo todo el día sin escribir
 * su contenido en el guardado: la semilla es el día, y el día vuelve a dar lo
 * mismo hasta que cambia.
 */

/**
 * Un número al azar pero siempre el mismo para la misma semilla.
 *
 * Alcanza de sobra para repartir premios y tiene la propiedad que hace falta:
 * dos corridas dan lo mismo, en cualquier teléfono.
 */
export function azarCon(semilla: number): () => number {
  let s = semilla >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Un número a partir de un texto, para poder sembrar con nombres y fechas. */
export function semillaDe(texto: string): number {
  let h = 2166136261;
  for (let i = 0; i < texto.length; i++) {
    h ^= texto.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/**
 * Baraja una copia de la lista, de forma estable para la semilla.
 *
 * Fisher–Yates: toma cada lugar una vez y no favorece a ninguno.
 */
export function barajar<T>(lista: readonly T[], azar: () => number): T[] {
  const copia = [...lista];
  for (let i = copia.length - 1; i > 0; i--) {
    const j = Math.floor(azar() * (i + 1));
    [copia[i], copia[j]] = [copia[j], copia[i]];
  }
  return copia;
}

/**
 * Elige uno de la lista con probabilidad proporcional a su peso.
 *
 * Es lo que hace que en la ruleta salgan sobre todo cosas comunes: la harina
 * pesa 130 y la obsidiana 10, así que la harina sale trece veces más seguido
 * sin que haya que separar las listas en fáciles y difíciles a mano.
 */
export function porPeso<T>(lista: readonly T[], peso: (x: T) => number, azar: () => number): T {
  const total = lista.reduce((s, x) => s + peso(x), 0);
  let n = azar() * total;
  for (const x of lista) {
    n -= peso(x);
    if (n <= 0) return x;
  }
  return lista[lista.length - 1];
}
