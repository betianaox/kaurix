import type { ImageSourcePropType } from 'react-native';

import type { ElementId } from '../theme';

/**
 * Las criaturas que se pueden encontrar.
 *
 * Para sumar una: dejá el `.webp` en `assets/criaturas/` y agregá una línea acá.
 * No hay que tocar nada más — el contador, la colección y la búsqueda salen de
 * esta lista.
 *
 * Especificaciones del archivo en `assets/criaturas/LEEME.md`.
 */
export type Criatura = {
  id: string;
  nombre: string;
  /** Define el color con que se la muestra en la colección y al encontrarla. */
  elemento: ElementId;
  arte: ImageSourcePropType;
  /**
   * Qué proporción del video original ocupaba, antes de recortarle el aire.
   *
   * Sin esto todas se verían del mismo ancho y se perdería la relación de
   * tamaño entre ellas: un bicho con las alas abiertas y uno compacto quedarían
   * iguales aunque en el original uno fuera bastante más grande. Lo informa el
   * script de conversión.
   */
  escala: number;
};

export const criaturas: Criatura[] = [
  {
    id: 'dragon-turquesa',
    nombre: 'Dragón turquesa',
    elemento: 'agua',
    arte: require('../../assets/criaturas/dragon-turquesa.webp'),
    escala: 0.573,
  },
  {
    id: 'dragon-musgo',
    nombre: 'Dragón de musgo',
    elemento: 'tierra',
    arte: require('../../assets/criaturas/dragon-musgo.webp'),
    escala: 0.5,
  },
  {
    id: 'capibara-alado',
    nombre: 'Capibara alado',
    elemento: 'tierra',
    arte: require('../../assets/criaturas/capibara-alado.webp'),
    escala: 0.458,
  },
  {
    id: 'conejo-escarcha',
    nombre: 'Conejo de escarcha',
    elemento: 'agua',
    arte: require('../../assets/criaturas/conejo-escarcha.webp'),
    escala: 0.5,
  },
  {
    id: 'gato-bruma',
    nombre: 'Gato de bruma',
    elemento: 'aire',
    arte: require('../../assets/criaturas/gato-bruma.webp'),
    escala: 0.75,
  },
  {
    id: 'fenix',
    nombre: 'Fénix',
    elemento: 'fuego',
    arte: require('../../assets/criaturas/fenix.webp'),
    escala: 0.73,
  },
  {
    id: 'oso-dorado',
    nombre: 'Oso dorado',
    elemento: 'fuego',
    arte: require('../../assets/criaturas/oso-dorado.webp'),
    escala: 0.583,
  },
  {
    id: 'panda-alado',
    nombre: 'Panda alado',
    elemento: 'tierra',
    arte: require('../../assets/criaturas/panda-alado.webp'),
    escala: 0.563,
  },
  {
    id: 'cachorro-miel',
    nombre: 'Cachorro de miel',
    elemento: 'aire',
    arte: require('../../assets/criaturas/cachorro-miel.webp'),
    escala: 0.48,
  },
  {
    id: 'lobo-niebla',
    nombre: 'Lobo de niebla',
    elemento: 'agua',
    arte: require('../../assets/criaturas/lobo-niebla.webp'),
    escala: 0.645,
  },
];

export const porId = (id: string) => criaturas.find((c) => c.id === id);

export function criaturaAlAzar(): Criatura {
  return criaturas[Math.floor(Math.random() * criaturas.length)];
}

/**
 * Una criatura que todavía no esté en la colección, si queda alguna.
 * Encontrar repetidas cuando falta descubrir otras arruina la búsqueda.
 */
export function criaturaNueva(encontradas: string[]): Criatura {
  const faltantes = criaturas.filter((c) => !encontradas.includes(c.id));
  const pozo = faltantes.length ? faltantes : criaturas;
  return pozo[Math.floor(Math.random() * pozo.length)];
}
