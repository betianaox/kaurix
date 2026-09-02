import React from 'react';
import { Image, StyleSheet, View } from 'react-native';
import Svg, { ClipPath, Defs, Ellipse } from 'react-native-svg';

/**
 * El caldero.
 *
 * El arte es una imagen recortada, así que el caldo no viene con ella: se dibuja
 * encima, adentro de la boca.
 *
 * Va en SVG y no con un `borderRadius`: un radio de borde sobre una caja más
 * ancha que alta da una pastilla, no una elipse, y la boca de un caldero visto
 * de frente es una elipse. Con las esquinas redondeadas se veía como una
 * etiqueta pegada encima.
 *
 * Las medidas están en píxeles de la imagen original, que es lo que hace el
 * `viewBox`: así se pueden volver a medir sobre el archivo cuando entre otro
 * caldero, sin convertir nada a fracciones.
 *
 * **Ojo al ajustar el recorte:** Fast Refresh no lo actualiza, porque
 * react-native-svg se guarda la definición por su `id`. Hay que reiniciar la app
 * o se sigue viendo el recorte viejo mientras uno cree que está probando el
 * nuevo. Perdí tres intentos así.
 */

const ARTE = require('../../assets/olla.png');

/** La imagen mide 806 × 605. */
const ANCHO = 806;
const ALTO = 605;

/**
 * La boca abierta, **medida sobre la imagen y no estimada a ojo**.
 *
 * El borde de este caldero es un toro grueso, así que el hueco oscuro no es toda
 * la boca y recorrer la imagen por luminancia no alcanza: da el hueco, no el
 * canto. Se sacó dibujando elipses candidatas encima del archivo y mirando cuál
 * calzaba con el canto interno. Ese método, para esto, es más rápido y más
 * exacto que cualquier cuenta.
 *
 * Sirve de recorte: todo lo que se dibuje adentro se corta contra esto, así que
 * el borde de adelante tapa lo que le pasa por debajo igual que taparía a un
 * líquido de verdad.
 */
const BOCA = { cx: 395, cy: 68, rx: 228, ry: 33 };

/**
 * El caldo, en píxeles de la imagen.
 *
 * **Es la misma elipse que la boca, corrida hacia abajo.** No es un detalle: el
 * caldero es un cilindro visto desde arriba, y todos sus cortes horizontales se
 * proyectan como la misma elipse, solo que más abajo cuanto más hondo está el
 * corte. Una elipse más chata o más angosta se lee como una mancha apoyada
 * adentro y no como la superficie de un líquido.
 *
 * Lo que pasa del borde de adelante lo corta el recorte. Eso es lo correcto: el
 * canto tapa la parte cercana de la superficie.
 *
 * Bajarlo es llenarlo menos. Subirlo, más.
 */
const CALDO = { cx: 395, cy: 82, rx: 220, ry: 32 };

type Props = {
  ancho: number;
  tinte: string;
  /** Con algo adentro se llena: es la única señal de que está en uso. */
  encendido: boolean;
};

export function Caldero({ ancho, tinte, encendido }: Props) {
  const alto = (ancho * ALTO) / ANCHO;

  return (
    <View style={{ width: ancho, height: alto }}>
      <Image
        source={ARTE}
        style={{ width: ancho, height: alto }}
        resizeMode="contain"
        fadeDuration={0}
      />

      <Svg
        width={ancho}
        height={alto}
        viewBox={`0 0 ${ANCHO} ${ALTO}`}
        style={StyleSheet.absoluteFill}
        pointerEvents="none"
      >
        <Defs>
          <ClipPath id="boca">
            <Ellipse cx={BOCA.cx} cy={BOCA.cy} rx={BOCA.rx} ry={BOCA.ry} />
          </ClipPath>
        </Defs>

        <Ellipse
          cx={CALDO.cx}
          cy={CALDO.cy}
          rx={CALDO.rx}
          ry={CALDO.ry}
          fill={tinte}
          // Translúcido: deja pasar lo que hay abajo, y eso es lo que lo hace
          // parecer líquido en vez de pintura.
          opacity={encendido ? 0.42 : 0}
          clipPath="url(#boca)"
        />
      </Svg>
    </View>
  );
}
