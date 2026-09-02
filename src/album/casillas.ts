import { criaturas } from '../art';
import { carta, LEGENDARIA } from '../juego/guardado';

/**
 * Cómo se arma una hoja del álbum.
 *
 * Una hoja por vuelta, grilla de 3x3: los ocho bichos alrededor y **la
 * legendaria en el centro**. Se lee solo — la del medio es la que corona la
 * vuelta— y de paso los nueve entran justos, sin huecos de relleno.
 */

export type Casilla =
  | { tipo: 'criatura'; criatura: string; llave: string }
  | { tipo: 'legendaria'; llave: string };

/** El centro de la grilla, donde va la legendaria. */
const CENTRO = 4;

/** Las nueve casillas de la hoja de un nivel, en orden de lectura. */
export function casillasDe(nivel: number): Casilla[] {
  const salida: Casilla[] = [];
  let siguiente = 0;

  for (let i = 0; i < 9; i++) {
    if (i === CENTRO) {
      salida.push({ tipo: 'legendaria', llave: carta(nivel, LEGENDARIA) });
      continue;
    }
    const c = criaturas[siguiente++];
    salida.push({ tipo: 'criatura', criatura: c.id, llave: carta(nivel, c.id) });
  }

  return salida;
}
