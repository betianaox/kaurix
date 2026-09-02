import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colorDeNivel } from '../juego/datos';
import { useT } from '../i18n';
import { colors, radius } from '../theme';
import { Carta, RATIO } from './Carta';
import { casillasDe, type Casilla } from './casillas';

/**
 * Una hoja del álbum: la vuelta entera en una grilla de 3x3.
 *
 * El papel toma el color de su vuelta, muy diluido, y lo mismo el destello del
 * borde. Son ocho hojas de ocho colores: recorrerlas de punta a punta tiene que
 * dejar ver que el juego cambia de piel cada vez.
 */

type Props = {
  nivel: number;
  /** Las llaves de las cartas ya conseguidas. */
  ganadas: string[];
  ancho: number;
  alto: number;
  onCarta?: (casilla: Casilla, ganada: boolean) => void;
};

/** Separación entre cartas, en puntos. */
const AIRE = 8;

export function Hoja({ nivel, ganadas, ancho, alto, onCarta }: Props) {
  const t = useT();
  const color = colorDeNivel(nivel);
  const casillas = casillasDe(nivel);
  const tengo = casillas.filter((c) => ganadas.includes(c.llave)).length;

  // La carta se dimensiona por lo que sea que apriete primero: tres de ancho o
  // tres de alto. Sin esto, en una pantalla baja la fila de abajo queda cortada.
  const porAncho = (ancho - AIRE * 4) / 3;
  const porAlto = (alto - AIRE * 4 - 50) / 3 / RATIO;
  const anchoCarta = Math.floor(Math.min(porAncho, porAlto));

  return (
    <View style={[estilos.papel, { width: ancho, height: alto, borderColor: `${color}55` }]}>
      <View style={[estilos.tinte, { backgroundColor: color }]} pointerEvents="none" />

      <Text style={[estilos.serie, { color }]}>SERIE {nivel}</Text>

      {/* La grilla ocupa todo lo que sobra y va centrada: así la hoja queda
          equilibrada sea cual sea el alto de la pantalla. */}
      <View style={estilos.centro}>
        <View style={[estilos.grilla, { gap: AIRE }]}>
          {casillas.map((casilla) => {
            const ganada = ganadas.includes(casilla.llave);
            return (
              <Pressable
                key={casilla.llave}
                onPress={() => onCarta?.(casilla, ganada)}
                style={({ pressed }) => pressed && { opacity: 0.7 }}
              >
                <Carta casilla={casilla} nivel={nivel} ganada={ganada} ancho={anchoCarta} />
              </Pressable>
            );
          })}
        </View>
      </View>

      {/*
        La cuenta va acá adentro y no debajo del libro: es un dato de esta hoja
        —cuánto te falta de esta serie— y afuera se leía como si hablara del
        álbum entero. Y al pie y no junto al título porque es el resultado de
        mirar la hoja: se lee después de las cartas, no antes.
      */}
      <Text style={estilos.pie}>
        {t('album.cuantas', { tiene: tengo, total: casillas.length })}
      </Text>
    </View>
  );
}

const estilos = StyleSheet.create({
  papel: {
    borderWidth: 1,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    alignItems: 'center',
    // Mismo aire arriba y abajo: la hoja tiene que verse equilibrada.
    paddingVertical: 8,
    overflow: 'hidden',
  },
  // Cada vuelta tiene que verse de otro color, si no las ocho hojas parecen la
  // misma y pasar de una a otra no se nota.
  tinte: { ...StyleSheet.absoluteFill, opacity: 0.16 },

  centro: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  serie: { fontSize: 11, letterSpacing: 3, marginBottom: 2 },
  pie: { color: colors.textMuted, fontSize: 11, letterSpacing: 2, marginTop: 2 },

  grilla: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    alignItems: 'center',
  },
});
