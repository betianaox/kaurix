import type { ImageSourcePropType } from 'react-native';

import type { ElementId } from '../theme';

/**
 * Una animación suelta: el archivo y qué proporción del video original ocupaba.
 *
 * La escala es lo que mantiene la relación de tamaño entre todas las piezas del
 * juego. Sin ella, un bicho con las alas abiertas y uno compacto se verían
 * iguales de ancho aunque en el original uno fuera bastante más grande. Y tiene
 * una propiedad útil: como el recorte encoge la caja y la escala la vuelve a
 * agrandar en la misma proporción, el personaje termina midiendo lo mismo sin
 * importar cuánto aire se le haya sacado alrededor.
 *
 * La informa el script de conversión.
 */
export type Pieza = {
  arte: ImageSourcePropType;
  escala: number;
};

/**
 * Una animación que ocurre una sola vez y después da paso a otra cosa.
 *
 * Hay que saber cuánto dura porque el componente de imagen no avisa cuando
 * termina. Ese número lo informa el script al convertir con `--loops 1`, así
 * que es exacto y no una estimación.
 */
export type Unica = Pieza & {
  /** Milisegundos. */
  duracion: number;
};

export type Criatura = {
  id: string;
  nombre: string;
  /** Define el color con que se la muestra en la colección y al encontrarla. */
  elemento: ElementId;
  /**
   * El bebé flotando: lo que sale del cascarón y lo que se cría.
   *
   * Es el arte que durante el demo se llamó `adulto`, porque entonces la
   * criatura terminaba ahí. Ahora ese es el principio: el adulto es otra pieza
   * y va parado.
   */
  bebe: Pieza;
  /**
   * La pose fija de la colección, y la misma silueta en negro.
   *
   * Salen del **mismo cuadro** de la animación del bebé, con
   * `herramientas/poses.js`. Por eso al encontrar la criatura la sombra se
   * llena de color sin que se mueva un pixel: son la misma forma.
   *
   * Van normalizadas al mismo cuadrado, así que no llevan escala: en la grilla
   * todas tienen que verse del mismo tamaño. La escala relativa entre criaturas
   * importa sobre la cámara, no en un álbum de fichas.
   *
   * Y son fijas y no animadas por una razón medida: ocho WebP animados
   * decodificando a la vez en la misma pantalla hacen que el teléfono se
   * arrastre después de un rato.
   */
  quieto: ImageSourcePropType;
  sombra: ImageSourcePropType;
  /**
   * El adulto, parado. Es el final de la crianza.
   *
   * Opcional mientras el arte no exista: una criatura sin adulto se puede
   * encontrar y criar igual, y al completar la barra se queda esperando la
   * pieza en vez de bloquear el juego entero.
   */
  adulto?: Pieza;
  /**
   * La secuencia completa.
   *
   * Se encuentra el huevo y hay que insistir: cada toque es un intento de salir
   * que falla, hasta que uno rompe el cascarón. Recién el que sale de ahí se
   * puede criar.
   *
   * Es opcional para que una criatura a la que todavía le falta arte pueda
   * aparecer ya nacida, en vez de bloquear todo.
   */
  huevo?: Pieza;
  /** El intento que no lo logra. Se repite entre 2 y 4 veces. */
  falla?: Unica;
  eclosion?: Unica;
};

/**
 * Para sumar una criatura: convertir sus cuatro videos con
 * `node herramientas/tanda.js`, que además escribe el bloque de acá abajo con
 * las escalas y duraciones ya medidas.
 */
export const criaturas: Criatura[] = [
  {
    id: 'dragon-turquesa',
    nombre: 'Dragón turquesa',
    elemento: 'agua',
    bebe: { arte: require('../../assets/criaturas/01-bebe.webp'), escala: 0.417 },
    quieto: require('../../assets/criaturas/01-quieto.webp'),
    sombra: require('../../assets/criaturas/01-sombra.webp'),
    huevo: { arte: require('../../assets/criaturas/01-huevo.webp'), escala: 0.698 },
    falla: {
      arte: require('../../assets/criaturas/01-falla.webp'),
      escala: 0.781,
      duracion: 2000,
    },
    eclosion: {
      arte: require('../../assets/criaturas/01-eclosion.webp'),
      escala: 1.0,
      duracion: 2000,
    },
  },
  {
    id: 'dragon-musgo',
    nombre: 'Dragón de musgo',
    elemento: 'tierra',
    bebe: { arte: require('../../assets/criaturas/02-bebe.webp'), escala: 0.542 },
    quieto: require('../../assets/criaturas/02-quieto.webp'),
    sombra: require('../../assets/criaturas/02-sombra.webp'),
    huevo: { arte: require('../../assets/criaturas/02-huevo.webp'), escala: 0.688 },
    falla: {
      arte: require('../../assets/criaturas/02-falla.webp'),
      escala: 0.73,
      duracion: 2000,
    },
    eclosion: {
      arte: require('../../assets/criaturas/02-eclosion.webp'),
      escala: 1.0,
      duracion: 2000,
    },
  },
  {
    id: 'capibara-alado',
    nombre: 'Capibara alado',
    elemento: 'tierra',
    bebe: { arte: require('../../assets/criaturas/03-bebe.webp'), escala: 0.605 },
    quieto: require('../../assets/criaturas/03-quieto.webp'),
    sombra: require('../../assets/criaturas/03-sombra.webp'),
    huevo: { arte: require('../../assets/criaturas/03-huevo.webp'), escala: 0.802 },
    falla: {
      arte: require('../../assets/criaturas/03-falla.webp'),
      escala: 0.77,
      duracion: 2000,
    },
    eclosion: {
      arte: require('../../assets/criaturas/03-eclosion.webp'),
      escala: 1.0,
      duracion: 2000,
    },
  },
  {
    id: 'lobo-niebla',
    nombre: 'Lobo de niebla',
    elemento: 'agua',
    bebe: { arte: require('../../assets/criaturas/04-bebe.webp'), escala: 0.688 },
    quieto: require('../../assets/criaturas/04-quieto.webp'),
    sombra: require('../../assets/criaturas/04-sombra.webp'),
    huevo: { arte: require('../../assets/criaturas/04-huevo.webp'), escala: 0.75 },
    falla: {
      arte: require('../../assets/criaturas/04-falla.webp'),
      escala: 0.75,
      duracion: 2000,
    },
    eclosion: {
      arte: require('../../assets/criaturas/04-eclosion.webp'),
      escala: 1.0,
      duracion: 2000,
    },
  },
  {
    id: 'gato-bruma',
    nombre: 'Gato de bruma',
    elemento: 'aire',
    bebe: { arte: require('../../assets/criaturas/05-bebe.webp'), escala: 0.688 },
    quieto: require('../../assets/criaturas/05-quieto.webp'),
    sombra: require('../../assets/criaturas/05-sombra.webp'),
    huevo: { arte: require('../../assets/criaturas/05-huevo.webp'), escala: 0.73 },
    falla: {
      arte: require('../../assets/criaturas/05-falla.webp'),
      escala: 0.73,
      duracion: 2000,
    },
    eclosion: {
      arte: require('../../assets/criaturas/05-eclosion.webp'),
      escala: 1.0,
      duracion: 2000,
    },
  },
  {
    id: 'fenix',
    nombre: 'Fénix',
    elemento: 'fuego',
    bebe: { arte: require('../../assets/criaturas/06-bebe.webp'), escala: 0.625 },
    quieto: require('../../assets/criaturas/06-quieto.webp'),
    sombra: require('../../assets/criaturas/06-sombra.webp'),
    huevo: { arte: require('../../assets/criaturas/06-huevo.webp'), escala: 0.708 },
    falla: {
      arte: require('../../assets/criaturas/06-falla.webp'),
      escala: 0.833,
      duracion: 2000,
    },
    eclosion: {
      arte: require('../../assets/criaturas/06-eclosion.webp'),
      escala: 1.0,
      duracion: 2000,
    },
  },
  {
    id: 'oso-dorado',
    nombre: 'Oso dorado',
    elemento: 'fuego',
    bebe: { arte: require('../../assets/criaturas/07-bebe.webp'), escala: 0.688 },
    quieto: require('../../assets/criaturas/07-quieto.webp'),
    sombra: require('../../assets/criaturas/07-sombra.webp'),
    huevo: { arte: require('../../assets/criaturas/07-huevo.webp'), escala: 0.75 },
    falla: {
      arte: require('../../assets/criaturas/07-falla.webp'),
      escala: 0.895,
      duracion: 2000,
    },
    eclosion: {
      arte: require('../../assets/criaturas/07-eclosion.webp'),
      escala: 1.0,
      duracion: 2000,
    },
  },
  {
    id: 'cachorro-miel',
    nombre: 'Cachorro de miel',
    elemento: 'aire',
    bebe: { arte: require('../../assets/criaturas/08-bebe.webp'), escala: 0.406 },
    quieto: require('../../assets/criaturas/08-quieto.webp'),
    sombra: require('../../assets/criaturas/08-sombra.webp'),
    huevo: { arte: require('../../assets/criaturas/08-huevo.webp'), escala: 0.77 },
    falla: {
      arte: require('../../assets/criaturas/08-falla.webp'),
      escala: 0.583,
      duracion: 2000,
    },
    eclosion: {
      arte: require('../../assets/criaturas/08-eclosion.webp'),
      escala: 1.0,
      duracion: 2000,
    },
  },
];

export const porId = (id: string) => criaturas.find((c) => c.id === id);
