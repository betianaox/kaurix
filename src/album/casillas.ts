import { carta, LEGENDARIA } from '../juego/guardado';

/**
 * Cómo se arma una hoja del álbum.
 *
 * **Una hoja por bicho**, grilla de 3x3: las ocho acciones de ese bicho
 * alrededor y su dorada en el centro. Es como está dibujado el arte —la serie 1
 * es el dragón turquesa durmiendo, nadando, comiendo…— y por eso una hoja se
 * lee como el álbum de una sola criatura.
 *
 * Las ocho hojas se llenan **al mismo tiempo**, no una por vuelta. Al hacer
 * crecer cualquier bicho sale una carta de cualquier hoja, así que el álbum
 * avanza a los saltos por todos lados en vez de completarse de a una página. Ver
 * `sorteo.ts`.
 */

/**
 * Las ocho acciones de la hoja, en orden de lectura y salteando el centro.
 *
 * Una por casilla, siempre la misma en el mismo lugar: la hoja del fénix tiene
 * el mismo orden que la del dragón. Es lo que deja reconocer un hueco de lejos
 * —"me falta la de dormir"— sin leer nada.
 *
 * Los nombres son los archivos de `assets/album/`, que salen de
 * `herramientas/categorias.js`, y también el orden de la serie de cards: la
 * acción `i` es la carta `i` de la serie del bicho.
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
 *
 * Todas llevan `criatura` porque una hoja entera es de un solo bicho: es de
 * quién es la carta, y con eso se resuelve el arte, el nombre y la dorada.
 */
export type Casilla = { indice: number; criatura: string } & (
  | { tipo: 'accion'; accion: Accion; llave: string }
  | { tipo: 'legendaria'; llave: string }
);

/** El centro de la grilla, donde va la dorada. */
const CENTRO = 4;

/** Las nueve casillas de la hoja de un bicho, en orden de lectura. */
export function casillasDe(criatura: string): Casilla[] {
  const salida: Casilla[] = [];
  let siguiente = 0;

  for (let i = 0; i < 9; i++) {
    if (i === CENTRO) {
      // La dorada: al centro de la hoja, última de la serie.
      salida.push({
        tipo: 'legendaria',
        criatura,
        indice: 8,
        llave: carta(criatura, LEGENDARIA),
      });
      continue;
    }

    const accion = ACCIONES[siguiente];
    salida.push({
      tipo: 'accion',
      criatura,
      accion,
      indice: siguiente,
      llave: carta(criatura, accion),
    });
    siguiente++;
  }

  return salida;
}

/** Las ocho llaves de acción de un bicho. Sin la dorada, que no se sortea. */
export const accionesDe = (criatura: string): string[] =>
  ACCIONES.map((a) => carta(criatura, a));

/** Si están las ocho acciones de ese bicho. La dorada se gana con esto. */
export const hojaCompleta = (criatura: string, ganadas: readonly string[]): boolean =>
  accionesDe(criatura).every((llave) => ganadas.includes(llave));
