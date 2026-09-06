import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { porId } from '../art';
import { bichoDeNivel, colorDeNivel } from '../juego/datos';
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

/**
 * Separación entre cartas, en puntos.
 *
 * Las cartas son ilustraciones saturadas y de marco dorado, y pegadas entre sí
 * se leen como una sola mancha de color. El aire es lo que las devuelve a ser
 * nueve cosas distintas.
 *
 * Bajó de 14 a 9. Con 14, el aire se llevaba 56 puntos de ancho y otros 56 de
 * alto, y como la carta sale de dividir lo que sobra por tres, cada punto de
 * aire le saca un tercio de punto a cada carta en los dos ejes. El marco dorado
 * ya separa bastante por sí solo: no hace falta tanto.
 */
const AIRE = 9;

export function Hoja({ nivel, ganadas, ancho, alto, onCarta }: Props) {
  const t = useT();
  const color = colorDeNivel(nivel);
  // El encabezado lleva el nombre del bicho de la vuelta, no su número: "SERIE
  // 4" no le dice nada a nadie, y el bicho es lo que la hoja tiene de propio.
  const bicho = porId(bichoDeNivel(nivel))?.nombre ?? '';
  const casillas = casillasDe(nivel);
  const tengo = casillas.filter((c) => ganadas.includes(c.llave)).length;

  // La carta se dimensiona por lo que sea que apriete primero: tres de ancho o
  // tres de alto. Sin esto, en una pantalla baja la fila de abajo queda cortada.
  const porAncho = (ancho - AIRE * 4) / 3;
  // Lo que ocupan el nombre del bicho arriba y la cuenta al pie, **con su aire
  // incluido**. El aire es la mayor parte: dieciocho puntos arriba y otros
  // tantos abajo, contra los dos que tenían antes. Pegados a las cartas, los
  // dos renglones se leían como parte de la grilla y no como el título y el pie
  // de una hoja.
  //
  // Sale casi gratis: en un teléfono la carta la limita el ancho, no el alto,
  // así que reservar más acá no le saca ni un punto. En una tablet cuesta
  // cuatro, y una hoja de álbum bien recortada los vale.
  const RESERVA = 62;
  const porAlto = (alto - AIRE * 4 - RESERVA) / 3 / RATIO;
  const anchoCarta = Math.floor(Math.min(porAncho, porAlto));

  return (
    <View style={[estilos.papel, { width: ancho, height: alto, borderColor: `${color}55` }]}>
      <View style={[estilos.tinte, { backgroundColor: color }]} pointerEvents="none" />

      <Text style={[estilos.serie, { color }]}>{bicho.toUpperCase()}</Text>

      {/* La grilla ocupa todo lo que sobra y va centrada: así la hoja queda
          equilibrada sea cual sea el alto de la pantalla. */}
      <View style={estilos.centro}>
        {/* El ancho va calculado y no librado al `wrap`: con cartas angostas
            —las nuevas son más altas que las del mock— en una fila entraban
            cuatro y la hoja dejaba de ser una grilla de tres por tres, que es
            lo que hace que la dorada caiga justo en el centro. */}
        <View
          style={[estilos.grilla, { gap: AIRE, width: anchoCarta * 3 + AIRE * 2 }]}
        >
          {casillas.map((casilla) => {
            const ganada = ganadas.includes(casilla.llave);
            return (
              <Pressable
                key={casilla.llave}
                onPress={() => onCarta?.(casilla, ganada)}
                style={({ pressed }) => pressed && { opacity: 0.7 }}
              >
                <Carta
                  casilla={casilla}
                  nivel={nivel}
                  ganada={ganada}
                  ancho={anchoCarta}
                  lupa={ganada}
                />
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
  serie: { fontSize: 11, letterSpacing: 3, marginBottom: 18 },
  pie: { color: colors.textMuted, fontSize: 11, letterSpacing: 2, marginTop: 18 },

  grilla: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    alignItems: 'center',
  },
});
