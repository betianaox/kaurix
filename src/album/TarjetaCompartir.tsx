import React, { forwardRef } from 'react';
import { Image, StyleSheet, Text, View, type ImageSourcePropType } from 'react-native';

import type { CodigoIdioma } from '../i18n/idiomas';
import { colors } from '../theme';
import { Carta } from './Carta';
import type { Casilla } from './casillas';

/**
 * ───────────────────────────────────────────────────────────────────────────
 * LA CARTA, COMO SE COMPARTE
 * ───────────────────────────────────────────────────────────────────────────
 * No se comparte la pantalla: se comparte **esta** vista, que existe solo para
 * ser fotografiada y nunca se ve. Es la carta más un pie mínimo que dice de
 * dónde salió.
 *
 * El pie no es decoración: la carta sola es un dibujo lindo sin autor. Quien la
 * recibe en un chat tiene que poder llegar al juego, y para eso están las dos
 * únicas cosas que lleva abajo: el nombre y la insignia de Google Play.
 *
 * ## Por qué un ancho fijo
 *
 * La foto se saca de lo que está dibujado, así que el tamaño de la imagen que
 * viaja es el tamaño de esta vista. Atado a la pantalla, la misma carta saldría
 * en 320 puntos desde un teléfono chico y en 500 desde una tablet. 760 da una
 * imagen de buena resolución en cualquier equipo, y pesa poco porque es un
 * dibujo plano.
 */

/**
 * La insignia, un archivo por idioma, **de Google y sin tocar**. Las reglas de
 * marca piden usar su arte tal cual: no se recolorea, no se recorta y no se
 * rehace con el texto traducido aunque quedara igual. Los nombres son los que
 * traen al descargarlos, a propósito: renombrarlos invita a que alguien crea
 * que son nuestros.
 *
 * Los cuatro miden 478×142, así que el pie no cambia de forma con el idioma.
 */
const INSIGNIA: Record<CodigoIdioma, ImageSourcePropType> = {
  es: require('../../assets/googleplay/GetItOnGooglePlay_Badge_Web_color_Spanish-LATAM.png'),
  en: require('../../assets/googleplay/GetItOnGooglePlay_Badge_Web_color_English.png'),
  pt: require('../../assets/googleplay/GetItOnGooglePlay_Badge_Web_color_Portuguese-Brazil.png'),
  it: require('../../assets/googleplay/GetItOnGooglePlay_Badge_Web_color_Italian.png'),
};

const LOGO = require('../../assets/icon.png');

/** Ancho de la imagen que se comparte, en puntos. Ver arriba. */
export const ANCHO = 760;

const AIRE = 18;
const ALTO_INSIGNIA = 52;

type Props = {
  casilla: Casilla;
  nivel: number;
  /** El nombre del juego, ya traducido. */
  marca: string;
  /** Idioma puesto: decide en qué idioma va la insignia. */
  idioma: CodigoIdioma;
};

export const TarjetaCompartir = forwardRef<View, Props>(function TarjetaCompartir(
  { casilla, nivel, marca, idioma },
  ref
) {
  return (
    // `collapsable={false}`: sin esto Android puede resolver esta vista como un
    // puro contenedor y no crear la vista nativa, y la foto sale en blanco.
    <View ref={ref} collapsable={false} style={estilos.tarjeta}>
      <Carta casilla={casilla} nivel={nivel} ganada ancho={ANCHO - AIRE * 2} />

      <View style={estilos.pie}>
        <View style={estilos.marca}>
          <Image source={LOGO} style={estilos.logo} resizeMode="contain" />
          <Text style={estilos.nombre}>{marca}</Text>
        </View>
        <Image source={INSIGNIA[idioma]} style={estilos.insignia} resizeMode="contain" />
      </View>
    </View>
  );
});

const estilos = StyleSheet.create({
  tarjeta: {
    width: ANCHO,
    backgroundColor: colors.bg,
    // El mismo aire arriba y a los costados que abajo: la carta pegada a los
    // bordes se leía como una captura recortada, y el pie quedaba colgando de
    // un dibujo a sangre en vez de acompañarlo.
    padding: AIRE,
    // SIN ESQUINAS REDONDEADAS. La imagen no se ve dentro de un marco: se ve
    // sola contra el fondo de otra app, y una esquina redondeada ahí queda como
    // un recorte mal hecho.
  },
  pie: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: AIRE,
  },
  marca: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  logo: { width: 52, height: 52, borderRadius: 12 },
  nombre: {
    color: colors.text,
    fontSize: 26,
    letterSpacing: 2,
    fontWeight: '600',
  },
  insignia: { height: ALTO_INSIGNIA, width: (ALTO_INSIGNIA * 478) / 142 },
});
