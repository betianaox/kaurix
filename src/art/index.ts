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
  /** El adulto volando. Es lo que hay que tocar para quedársela. */
  arte: ImageSourcePropType;
  escala: number;
  /**
   * La secuencia completa.
   *
   * Se encuentra el huevo y hay que insistir: cada toque es un intento de salir
   * que falla, hasta que uno rompe el cascarón. Recién el que sale de ahí se
   * puede atrapar.
   *
   * Es opcional para que una criatura a la que todavía le falta arte pueda
   * aparecer ya adulta y atraparse de un toque, en vez de bloquear todo.
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
    arte: require('../../assets/criaturas/01-adulto.webp'),
    escala: 0.417,
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
    arte: require('../../assets/criaturas/02-adulto.webp'),
    escala: 0.542,
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
    arte: require('../../assets/criaturas/03-adulto.webp'),
    escala: 0.605,
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
    arte: require('../../assets/criaturas/04-adulto.webp'),
    escala: 0.688,
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
    arte: require('../../assets/criaturas/05-adulto.webp'),
    escala: 0.688,
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
    arte: require('../../assets/criaturas/06-adulto.webp'),
    escala: 0.625,
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
    arte: require('../../assets/criaturas/07-adulto.webp'),
    escala: 0.688,
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
    arte: require('../../assets/criaturas/08-adulto.webp'),
    escala: 0.406,
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

/** El adulto, como pieza suelta. */
export const adulto = (c: Criatura): Pieza => ({ arte: c.arte, escala: c.escala });

/**
 * Fija qué criatura aparece al buscar, para poder repetir la misma secuencia
 * mientras se trabaja sobre ella. `null` devuelve el sorteo entre todas.
 */
export const SOLO: string | null = null;

/**
 * Una criatura que todavía no esté en la colección, si queda alguna.
 * Encontrar repetidas cuando falta descubrir otras arruina la búsqueda.
 */
export function criaturaNueva(encontradas: string[]): Criatura {
  if (SOLO) {
    const fijada = porId(SOLO);
    if (fijada) return fijada;
  }

  const faltantes = criaturas.filter((c) => !encontradas.includes(c.id));
  const pozo = faltantes.length ? faltantes : criaturas;
  return pozo[Math.floor(Math.random() * pozo.length)];
}

/** Cuántos intentos fallidos antes de que rompa. Cambia en cada huevo. */
export function fallosAntesDeRomper(): number {
  return 2 + Math.floor(Math.random() * 3);
}
