import type { ImageSourcePropType } from 'react-native';

/**
 * Lo que queda cuando cocinaste cualquier cosa.
 *
 * Son doce y salen al azar. No están atados al catálogo de ingredientes a
 * propósito: son el resultado de una mezcla que no era nada, y hacer que
 * coincidieran con lo que tiraste obligaría a explicar por qué se quemó una
 * zanahoria si vos habías puesto albahaca. Es una broma visual, no una
 * consecuencia lógica.
 *
 * Y es la razón para que sean doce y no uno: la gracia de quemar algo se gasta
 * en el segundo intento si siempre aparece lo mismo. Doce alcanzan para que
 * quemar a propósito sea un chiste que se sostiene un rato.
 *
 * Las rutas van escritas enteras. El empaquetador resuelve los `require`
 * mirando el texto literal, así que uno armado con el id no existe cuando hace
 * falta y la app no arranca. Ya pasó una vez.
 */

export type Quemado = { id: string; arte: ImageSourcePropType };

export const QUEMADOS: Quemado[] = [
  { id: 'banana', arte: require('../../assets/quemados/banana.webp') },
  { id: 'morron', arte: require('../../assets/quemados/morron.webp') },
  { id: 'cebolla', arte: require('../../assets/quemados/cebolla.webp') },
  { id: 'tomate', arte: require('../../assets/quemados/tomate.webp') },
  { id: 'maiz', arte: require('../../assets/quemados/maiz.webp') },
  { id: 'aji', arte: require('../../assets/quemados/aji.webp') },
  { id: 'hierbas', arte: require('../../assets/quemados/hierbas.webp') },
  { id: 'naranja', arte: require('../../assets/quemados/naranja.webp') },
  { id: 'brocoli', arte: require('../../assets/quemados/brocoli.webp') },
  { id: 'ajo', arte: require('../../assets/quemados/ajo.webp') },
  { id: 'zanahoria', arte: require('../../assets/quemados/zanahoria.webp') },
  { id: 'hojas', arte: require('../../assets/quemados/hojas.webp') },
];

/**
 * Uno al azar, **nunca el mismo que la vez anterior**.
 *
 * Al azar de verdad, dos quemadas seguidas repiten una de cada doce veces, y
 * justo esa vez parece que la broma es siempre la misma. Descartar el anterior
 * cuesta una línea y saca esa impresión del medio.
 */
export function otroQuemado(anterior: Quemado | null): Quemado {
  const pozo = anterior ? QUEMADOS.filter((q) => q.id !== anterior.id) : QUEMADOS;
  return pozo[Math.floor(Math.random() * pozo.length)];
}
