import { LinearGradient } from 'expo-linear-gradient';
import React from 'react';
import { StyleSheet, View } from 'react-native';

import { armazon } from '../theme';

/**
 * El canto de la placa: la tapa que le da grosor al header y al footer.
 *
 * Es una franja pegada al borde de **adentro** —el que da a la pantalla— que
 * sobresale un poco de la placa. Tiene tres cosas y las tres hacen falta:
 *
 * - el degradé de claro a gris, que es la curva de la tapa;
 * - el filo brillante del lado de la luz, que es el borde vivo del plástico;
 * - la sombra que tira sobre el cuerpo, que es lo que lo despega.
 *
 * Sin la sombra, la tapa se lee como una franja pintada. Sin el filo, como una
 * tapa mate. Las tres juntas son lo que la vuelve una pieza.
 *
 * Va acá y no repetido en las dos barras porque es *la misma pieza vista de los
 * dos lados*: si una se retoca y la otra no, el armazón deja de leerse como un
 * solo objeto que rodea la pantalla.
 */

/**
 * Espesor de la tapa.
 *
 * Fino a propósito: es el **filo** de la pieza, no una banda. Grueso —a 14 px, como
 * salió la primera vez— dejaba de leerse como el canto de algo y pasaba a ser
 * una franja clara pintada sobre la barra, que es justo lo que no se quería.
 */
const CANTO = 8;

/** Cuánto sobresale de la placa. */
const ASOMA = 3;

/** Alto de la sombra que tira sobre el cuerpo. */
const SOMBRA = 5;

type Props = {
  /**
   * De qué borde de la pantalla cuelga la placa.
   *
   * `abajo` es el footer: la pieza entera —canto y sombra—, porque es la que
   * se toca y la que tiene que sobresalir.
   *
   * `arriba` es el header, y ahí va **solo el canto, sin sombra**. Con las dos
   * capas se leían dos líneas paralelas debajo del título y quedaba como un
   * borde doble; el header no necesita despegarse de nada, alcanza con el filo.
   *
   * **El canto se espeja entero, degradé incluido.** Lo que manda no es de
   * dónde viene la luz sino de qué lado está el borde de afuera: el filo
   * brillante va siempre contra el borde de la pantalla y el degradé se apaga
   * hacia el cuerpo de la placa. Abajo eso es claro arriba y oscuro abajo;
   * arriba, al revés. Así las dos se leen como la misma pieza, una de cada
   * lado, y no como dos molduras distintas.
   */
  lado: 'arriba' | 'abajo';
};

export function Canto({ lado }: Props) {
  const esFooter = lado === 'abajo';

  return (
    <>
      {/* La sombra va primero: tiene que quedar debajo del canto. Solo abajo. */}
      {esFooter ? (
        <LinearGradient
          colors={[armazon.cantoSombra, 'rgba(0,0,0,0)']}
          style={[estilos.sombra, { top: CANTO - ASOMA }]}
          start={{ x: 0.5, y: 0 }}
          end={{ x: 0.5, y: 1 }}
          pointerEvents="none"
        />
      ) : null}

      <View
        style={[
          estilos.canto,
          esFooter
            ? {
                top: -ASOMA,
                borderTopLeftRadius: 8,
                borderTopRightRadius: 8,
                borderBottomLeftRadius: 3,
                borderBottomRightRadius: 3,
              }
            : {
                // Sin asomo: el canto del header cierra la placa al ras, que es
                // lo que lo deja como una sola línea y no como un reborde.
                bottom: 0,
                borderBottomLeftRadius: 3,
                borderBottomRightRadius: 3,
              },
        ]}
        pointerEvents="none"
      >
        <LinearGradient
          colors={
            esFooter
              ? [armazon.cantoAlto, armazon.cantoMedio, armazon.cantoBajo]
              : [armazon.cantoBajo, armazon.cantoMedio, armazon.cantoAlto]
          }
          locations={esFooter ? [0, 0.35, 1] : [0, 0.65, 1]}
          style={StyleSheet.absoluteFill}
        />
        {/* El filo: la línea de luz, contra el borde que da a la pantalla. */}
        <View style={[estilos.filo, esFooter ? { top: 0 } : { bottom: 0 }]} />
      </View>
    </>
  );
}

const estilos = StyleSheet.create({
  canto: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: CANTO,
    overflow: 'hidden',
  },
  filo: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 1.5,
    backgroundColor: armazon.cantoBrillo,
  },
  sombra: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: SOMBRA,
  },
});
