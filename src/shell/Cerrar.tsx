import React from 'react';
import { Image, StyleSheet } from 'react-native';

/**
 * La ficha de cerrar, para las hojas que se abren encima de lo que estabas
 * haciendo: la ruleta, una receta, dónde se encuentra algo.
 *
 * Es la **misma pieza** que el header usa para su X. Está acá para que no haya
 * dos maneras de cerrar: cuando cada hoja se dibujaba la suya con un ícono de
 * línea, salir de la ruleta y salir del header eran dos gestos que se veían
 * distintos, y en una app donde todo lo demás es volumen, la de línea se leía
 * como parte de otra cosa.
 *
 * Va sin `Pressable` propio: cada hoja la coloca donde le corresponde —arriba
 * a la derecha de la tarjeta, o de la pantalla— y ese posicionamiento es lo
 * único que cambia entre una y otra.
 */

const CERRAR = require('../../assets/ui/cerrar.webp');

type Props = {
  /** Diámetro. Chica adentro de una tarjeta, más grande sobre la pantalla. */
  lado?: number;
};

export function Cerrar({ lado = 34 }: Props) {
  return (
    <Image
      source={CERRAR}
      style={[estilos.ficha, { width: lado, height: lado }]}
      resizeMode="contain"
      fadeDuration={0}
    />
  );
}

const estilos = StyleSheet.create({
  ficha: { width: 34, height: 34 },
});
