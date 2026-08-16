import React from 'react';
import { Image } from 'react-native';

import { criaturas, type Criatura } from '../art';

type Props = {
  /** Ancho en puntos. El alto sale de la proporción del archivo. */
  size: number;
  criatura: Criatura;
};

/**
 * Dibuja una criatura respetando la proporción de su archivo.
 *
 * No agrega ninguna animación propia: el movimiento vive adentro del WebP, y
 * el desplazamiento por la pantalla lo maneja quien la usa.
 */
export function CriaturaView({ size, criatura }: Props) {
  const { width, height } = medida(size, criatura);
  return (
    <Image
      source={criatura.arte}
      style={{ width, height }}
      resizeMode="contain"
      fadeDuration={0}
    />
  );
}

/**
 * La criatura más ancha del juego. Es la que va a ocupar el tamaño pedido; el
 * resto se dibuja proporcionalmente más chico, respetando la relación que
 * tenían en sus videos originales.
 */
const ESCALA_MAYOR = Math.max(...criaturas.map((c) => c.escala));

/** Ancho y alto que va a ocupar, para poder centrarla en pantalla. */
export function medida(size: number, criatura: Criatura) {
  const resuelto = Image.resolveAssetSource(criatura.arte);
  const proporcion = resuelto?.width ? resuelto.height / resuelto.width : 1;
  const ancho = Math.round((size * criatura.escala) / ESCALA_MAYOR);
  return { width: ancho, height: Math.round(ancho * proporcion) };
}
