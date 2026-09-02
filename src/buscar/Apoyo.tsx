import React from 'react';
import Svg, { Defs, Ellipse, RadialGradient, Stop } from 'react-native-svg';

/**
 * La sombra sobre la que se apoya algo dibujado encima de la cámara.
 *
 * Es un degradado radial y no una elipse maciza: dos óvalos negros apilados
 * dejan bordes duros y se leen como dos anillos, no como una sombra. Esto se
 * desvanece de verdad hacia afuera.
 *
 * Va aplastado —mucho más ancho que alto— porque es una sombra vista casi desde
 * arriba, que es como está la cámara cuando mirás algo apoyado en el piso.
 */

type Props = {
  ancho: number;
  color?: string;
  /** Qué tan oscura en el centro. */
  fuerza?: number;
};

/** Proporción entre el alto y el ancho. Más bajo, más rasante. */
const APLASTADO = 0.3;

export function Apoyo({ ancho, color = '#000', fuerza = 0.42 }: Props) {
  const alto = Math.round(ancho * APLASTADO);

  return (
    <Svg width={ancho} height={alto} pointerEvents="none">
      <Defs>
        <RadialGradient id="apoyo" cx="50%" cy="50%" rx="50%" ry="50%">
          <Stop offset="0" stopColor={color} stopOpacity={fuerza} />
          <Stop offset="0.55" stopColor={color} stopOpacity={fuerza * 0.55} />
          <Stop offset="1" stopColor={color} stopOpacity="0" />
        </RadialGradient>
      </Defs>
      <Ellipse cx={ancho / 2} cy={alto / 2} rx={ancho / 2} ry={alto / 2} fill="url(#apoyo)" />
    </Svg>
  );
}
