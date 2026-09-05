import type { ImageSourcePropType } from 'react-native';

/**
 * El arte de las figuritas.
 *
 * Una serie por vuelta, nueve cartas cada una: las ocho acciones en orden de
 * lectura y **la dorada al final**, que es la que va al centro de la hoja y la
 * que se gana al hacerla crecer.
 *
 * Los archivos son `assets/cards/SS-NN.webp` —serie y número—, todos de 500×762
 * después de pasar por `herramientas/cards.js`.
 *
 * La novena, la dorada, lleva **al bicho ya crecido**: es la que se gana al
 * hacerlo crecer, así que es la única de la serie donde no se lo ve de bebé.
 *
 * ## Por qué el listado va escrito y no armado
 *
 * `require` necesita la ruta literal: el empaquetador resuelve los assets al
 * compilar y no sabe leer una ruta armada en tiempo de ejecución. Así que cada
 * serie nueva se agrega acá a mano, y es el único lugar donde hay que tocar.
 *
 * ## Cuando falta una serie
 *
 * `cardDe` devuelve `null` y la carta dibuja el icono de su acción en lugar
 * del arte, igual que hace con una carta que todavía no conseguiste. Ya están
 * dibujadas las ocho, pero el hueco sigue siendo lo que se ve mientras no la
 * conseguiste, así que el camino no se borra.
 */

/** Las nueve cartas de una serie, en el orden de la hoja. */
type Serie = ImageSourcePropType[];

const SERIES: Record<number, Serie> = {
  1: [
    require('../../assets/cards/01-01.webp'),
    require('../../assets/cards/01-02.webp'),
    require('../../assets/cards/01-03.webp'),
    require('../../assets/cards/01-04.webp'),
    require('../../assets/cards/01-05.webp'),
    require('../../assets/cards/01-06.webp'),
    require('../../assets/cards/01-07.webp'),
    require('../../assets/cards/01-08.webp'),
    require('../../assets/cards/01-09.webp'),
  ],
  2: [
    require('../../assets/cards/02-01.webp'),
    require('../../assets/cards/02-02.webp'),
    require('../../assets/cards/02-03.webp'),
    require('../../assets/cards/02-04.webp'),
    require('../../assets/cards/02-05.webp'),
    require('../../assets/cards/02-06.webp'),
    require('../../assets/cards/02-07.webp'),
    require('../../assets/cards/02-08.webp'),
    require('../../assets/cards/02-09.webp'),
  ],
  3: [
    require('../../assets/cards/03-01.webp'),
    require('../../assets/cards/03-02.webp'),
    require('../../assets/cards/03-03.webp'),
    require('../../assets/cards/03-04.webp'),
    require('../../assets/cards/03-05.webp'),
    require('../../assets/cards/03-06.webp'),
    require('../../assets/cards/03-07.webp'),
    require('../../assets/cards/03-08.webp'),
    require('../../assets/cards/03-09.webp'),
  ],
  4: [
    require('../../assets/cards/04-01.webp'),
    require('../../assets/cards/04-02.webp'),
    require('../../assets/cards/04-03.webp'),
    require('../../assets/cards/04-04.webp'),
    require('../../assets/cards/04-05.webp'),
    require('../../assets/cards/04-06.webp'),
    require('../../assets/cards/04-07.webp'),
    require('../../assets/cards/04-08.webp'),
    require('../../assets/cards/04-09.webp'),
  ],
  5: [
    require('../../assets/cards/05-01.webp'),
    require('../../assets/cards/05-02.webp'),
    require('../../assets/cards/05-03.webp'),
    require('../../assets/cards/05-04.webp'),
    require('../../assets/cards/05-05.webp'),
    require('../../assets/cards/05-06.webp'),
    require('../../assets/cards/05-07.webp'),
    require('../../assets/cards/05-08.webp'),
    require('../../assets/cards/05-09.webp'),
  ],
  6: [
    require('../../assets/cards/06-01.webp'),
    require('../../assets/cards/06-02.webp'),
    require('../../assets/cards/06-03.webp'),
    require('../../assets/cards/06-04.webp'),
    require('../../assets/cards/06-05.webp'),
    require('../../assets/cards/06-06.webp'),
    require('../../assets/cards/06-07.webp'),
    require('../../assets/cards/06-08.webp'),
    require('../../assets/cards/06-09.webp'),
  ],
  7: [
    require('../../assets/cards/07-01.webp'),
    require('../../assets/cards/07-02.webp'),
    require('../../assets/cards/07-03.webp'),
    require('../../assets/cards/07-04.webp'),
    require('../../assets/cards/07-05.webp'),
    require('../../assets/cards/07-06.webp'),
    require('../../assets/cards/07-07.webp'),
    require('../../assets/cards/07-08.webp'),
    require('../../assets/cards/07-09.webp'),
  ],
  8: [
    require('../../assets/cards/08-01.webp'),
    require('../../assets/cards/08-02.webp'),
    require('../../assets/cards/08-03.webp'),
    require('../../assets/cards/08-04.webp'),
    require('../../assets/cards/08-05.webp'),
    require('../../assets/cards/08-06.webp'),
    require('../../assets/cards/08-07.webp'),
    require('../../assets/cards/08-08.webp'),
    require('../../assets/cards/08-09.webp'),
  ],
};

/**
 * El arte de una carta, o `null` si esa serie todavía no está dibujada.
 *
 * `indice` es el lugar en la serie, de 0 a 8: las ocho acciones y la dorada
 * última.
 */
export function cardDe(nivel: number, indice: number): ImageSourcePropType | null {
  return SERIES[nivel]?.[indice] ?? null;
}

/**
 * La proporción de las cartas, medida sobre el arte: 500 × 762.
 *
 * Empezaron más altas —865—, se rediseñaron más anchas para que las nueve
 * entren en la hoja con aire entre ellas, y el redibujo final las dejó en esta
 * medida. Todo lo que dibuja una carta sale de acá, así que un cambio de forma
 * se hace en este número y nada más.
 */
export const RATIO = 762 / 500;

/**
 * El radio de las esquinas, en fracción del ancho.
 *
 * No es un número elegido: el marco dorado viene dibujado con la esquina
 * redondeada y el borde del naipe recortado en el alfa. Midiendo ese recorte
 * sobre el arte da un arco de 33 px en una carta de 500 de ancho, y por eso
 * `0.066` y no un valor redondo.
 *
 * Lo usan las dos caras de la carta: **el hueco tiene que tener exactamente la
 * misma esquina que el arte**, si no la hoja se lee como si mezclara dos
 * mazos. Al ir en fracción del ancho, vale igual en la miniatura de la hoja y
 * en la carta abierta a pantalla completa.
 */
export const RADIO = 0.066;
