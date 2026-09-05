import { criaturas } from '../art';
import { carta, LEGENDARIA } from '../juego/guardado';

/**
 * Cómo se arma una hoja del álbum.
 *
 * Una hoja por vuelta, grilla de 3x3: los ocho bichos alrededor y **la
 * legendaria en el centro**. Se lee solo — la del medio es la que corona la
 * vuelta— y de paso los nueve entran justos, sin huecos de relleno.
 */

/**
 * Las ocho acciones de la hoja, en orden de lectura y salteando el centro.
 *
 * Una por casilla, siempre la misma en el mismo lugar: la hoja de la vuelta 3
 * tiene el mismo orden que la de la 1. Es lo que deja reconocer un hueco de
 * lejos —"me falta la de dormir"— sin leer nada.
 *
 * Los nombres son los archivos de `assets/album/`, que salen de
 * `herramientas/categorias.js`.
 */
export const ACCIONES = [
  'dormir',
  'nadar',
  'comer',
  'cantar',
  'buscar',
  'estrella',
  'construir',
  'volar',
] as const;

export type Accion = (typeof ACCIONES)[number];

/**
 * Una casilla de la hoja.
 *
 * `indice` es el lugar que ocupa en la serie de arte —de 0 a 8—, y no es lo
 * mismo que el lugar en la grilla: la dorada va **última en la serie** y **al
 * centro en la grilla**. Con un solo número los dos órdenes se mezclaban y la
 * hoja mostraba la carta de al lado.
 */
export type Casilla = { indice: number } & (
  | { tipo: 'criatura'; criatura: string; accion: Accion; llave: string }
  | { tipo: 'legendaria'; llave: string }
);

/** El centro de la grilla, donde va la legendaria. */
const CENTRO = 4;

/** Las nueve casillas de la hoja de un nivel, en orden de lectura. */
export function casillasDe(nivel: number): Casilla[] {
  const salida: Casilla[] = [];
  let siguiente = 0;

  for (let i = 0; i < 9; i++) {
    if (i === CENTRO) {
      // La dorada: al centro de la hoja, última de la serie.
      salida.push({ tipo: 'legendaria', indice: 8, llave: carta(nivel, LEGENDARIA) });
      continue;
    }
    const c = criaturas[siguiente];
    salida.push({
      tipo: 'criatura',
      criatura: c.id,
      accion: ACCIONES[siguiente],
      indice: siguiente,
      llave: carta(nivel, c.id),
    });
    siguiente++;
  }

  return salida;
}
