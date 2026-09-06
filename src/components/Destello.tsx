import React from 'react';
import { StyleSheet } from 'react-native';
import Svg, { Path } from 'react-native-svg';

/**
 * La estrella irregular que va detrás de algo que se ganó.
 *
 * Reemplaza al halo redondo cuando lo que hay adelante **no es redondo**. Un
 * círculo detrás de una carta rectangular deja las cuatro esquinas afuera y se
 * lee como una mancha mal puesta.
 *
 * ## Por qué irregular y no una estrella de manual
 *
 * Una estrella de puntas iguales se lee como un símbolo —lo que dibuja un chico,
 * o el icono de "favorito"— y compite con la carta en vez de sostenerla. Con las
 * puntas desparejas deja de ser un símbolo y pasa a ser un estallido: se
 * reconoce el brillo sin que el ojo se detenga a mirarlo.
 *
 * La irregularidad **está escrita, no sorteada**: la misma forma en todas las
 * cartas y en todas las partidas. Sorteada, cada premio tendría un fondo
 * distinto y se notaría que es un adorno generado.
 */
export function Destello({
  lado,
  proporcion = 1,
  color,
  intensidad = 1,
}: {
  /** El ancho que ocupa. Conviene bastante más que lo que va adelante. */
  lado: number;
  /**
   * Alto sobre ancho. En 1 es una estrella pareja; más alto, estirada.
   *
   * Se le pasa la proporción de lo que va delante. Detrás de una carta —que es
   * media vez más alta que ancha— una estrella pareja deja mucho aire arriba y
   * abajo y aprieta a los costados: no acompaña la forma, la contradice.
   * Estirada, las puntas de arriba y abajo son las largas y el conjunto se lee
   * como el resplandor **de esa carta**.
   */
  proporcion?: number;
  color: string;
  /**
   * Cuánto se ve, sobre la opacidad base.
   *
   * Va tenue a propósito: lo que se mira es la carta, y un fondo fuerte le
   * compite en vez de sostenerla.
   */
  intensidad?: number;
}) {
  const alto = lado * proporcion;
  /** Los dos radios: el de la vuelta horizontal y el de la vertical. */
  const rx = lado / 2;
  const ry = alto / 2;

  /**
   * Qué tan larga es cada punta, en fracción del radio.
   *
   * **Dieciséis y no catorce**, que es lo que pone una punta justo en cada uno
   * de los cuatro ejes: 360 dividido dieciséis da 22,5°, y 90 es múltiplo de
   * eso. Con catorce, arriba y abajo caían en punta pero los costados quedaban
   * en el hueco entre dos, y la figura se veía descolgada hacia los lados.
   *
   * Los cuatro ejes llevan 1 —la punta entera— y el resto va desparejo. Es lo
   * único que hace la forma: el resto es la vuelta completa.
   *
   * Van todos cerca de 1 —entre 0,86 y 1— a propósito. Con un rango ancho las
   * puntas se alargaban mucho y la figura se volvía una araña; lo que se busca
   * es una masa con el borde irregular, no una estrella de puntas largas.
   */
  const PUNTAS = [
    1, 0.88, 0.95, 0.87, // arriba → derecha
    1, 0.89, 0.96, 0.86, // derecha → abajo
    1, 0.9, 0.94, 0.87, // abajo → izquierda
    1, 0.88, 0.96, 0.86, // izquierda → arriba
  ];

  /**
   * Hasta dónde se hunde entre punta y punta.
   *
   * **Es lo que le da cuerpo.** En 0,42 los valles llegaban casi al centro y
   * quedaban catorce triángulos flacos apuntando hacia afuera; en 0,74 se
   * llenaba tanto que casi no se notaba que era una estrella. Acá en el medio.
   */
  const VALLE = 0.62;

  const paso = 360 / PUNTAS.length;
  /**
   * Un punto de la vuelta, a `parte` del radio.
   *
   * Cada eje usa su propio radio, así que el mismo ángulo cae más lejos arriba
   * y abajo que a los costados. Es lo que estira la figura sin deformar las
   * puntas: siguen saliendo del centro, solo que el borde está más lejos.
   */
  const punto = (grados: number, parte: number) => {
    const a = ((grados - 90) * Math.PI) / 180;
    return `${(rx + rx * parte * Math.cos(a)).toFixed(1)} ${(ry + ry * parte * Math.sin(a)).toFixed(1)}`;
  };

  // Se recorre la vuelta alternando punta y valle, y se cierra sola.
  const d =
    PUNTAS.map((largo, i) => {
      const cabeza = punto(i * paso, largo);
      const hueco = punto(i * paso + paso / 2, VALLE);
      return `${i === 0 ? 'M' : 'L'} ${cabeza} L ${hueco}`;
    }).join(' ') + ' Z';

  return (
    <Svg width={lado} height={alto} style={estilos.raiz} pointerEvents="none">
      {/* Una sola capa. Tuvo dos —una ancha y otra chica encima— y sobre el
          blanco se leían como dos formas superpuestas en vez de un resplandor.
          Con una sola y apenas visible, la estrella se adivina y no se mira:
          sostiene la carta desde atrás en vez de competirle. */}
      <Path d={d} fill={color} opacity={0.15 * intensidad} />
    </Svg>
  );
}

const estilos = StyleSheet.create({
  /** Detrás de todo y sin ocupar lugar: lo que manda el tamaño es el dibujo. */
  raiz: { position: 'absolute' },
});
