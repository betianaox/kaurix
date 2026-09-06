import Ionicons from '@expo/vector-icons/Ionicons';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import React from 'react';
import { Image, StyleSheet, View, type ImageSourcePropType } from 'react-native';

import { porId } from '../art';
import { colorDeNivel } from '../juego/datos';
import { useT } from '../i18n';
import { colors } from '../theme';
import { cardDe, RADIO, RATIO as RATIO_CARD } from './cards';
import type { Accion, Casilla } from './casillas';

/**
 * El icono de cada acción, para la carta que todavía no conseguiste.
 *
 * Van todos acá y no armados con el nombre porque `require` necesita la ruta
 * literal: el empaquetador resuelve los assets al compilar y no sabe leer una
 * ruta armada en tiempo de ejecución.
 */
const ICONO: Record<Accion, ImageSourcePropType> = {
  dormir: require('../../assets/album/dormir.webp'),
  nadar: require('../../assets/album/nadar.webp'),
  comer: require('../../assets/album/comer.webp'),
  cantar: require('../../assets/album/cantar.webp'),
  buscar: require('../../assets/album/buscar.webp'),
  estrella: require('../../assets/album/estrella.webp'),
  construir: require('../../assets/album/construir.webp'),
  volar: require('../../assets/album/volar.webp'),
};

/**
 * Una figurita del álbum.
 *
 * **Cuando hay arte, la carta es el arte y nada más**: se dibuja a sangre,
 * sin marco ni fondo teñido, porque la carta ya trae su propio marco dorado
 * dibujado.
 *
 * Cuando no lo hay —una serie que todavía no se dibujó, o una carta que no
 * conseguiste— va el icono de su acción, apagado. **Nunca la pose de la
 * criatura**: una carta no es el bicho recortado sobre un fondo de color, y
 * mostrarlo así daba por buena una carta que no existe. El hueco tiene que
 * verse como un hueco.
 *
 * **Sin banda de nombre.** Las cards dibujadas no lo llevan —el nombre está en
 * el dibujo o no está—, y una banda con puntos suspensivos abajo de cada hueco
 * eran nueve renglones que no decían nada. El nombre sigue donde hace falta: en
 * la etiqueta que lee un lector de pantalla.
 *
 * El icono no deja el hueco mudo: dice **qué** falta conseguir. La silueta del
 * bicho no servía para eso, porque con una carta por acción es la misma en las
 * ocho; un rectángulo gris, tampoco.
 */

/**
 * Proporción de una carta. Sale del arte —500 × 762— y no de un número elegido:
 * si las cartas se redibujan con otra forma, cambia allá y acá se entera.
 */
export const RATIO = RATIO_CARD;

type Props = {
  casilla: Casilla;
  nivel: number;
  ganada: boolean;
  /** Ancho en puntos. El alto sale del ratio. */
  ancho: number;
  /**
   * Muestra la lupa que avisa que se puede abrir.
   *
   * La pone la hoja y no la carta sola, porque la carta no sabe si quien la
   * dibuja la hizo tocable: abierta en grande es la misma carta y ahí la lupa
   * no va.
   */
  lupa?: boolean;
};

export function Carta({ casilla, nivel, ganada, ancho, lupa = false }: Props) {
  const t = useT();
  const color = colorDeNivel(nivel);
  const alto = Math.round(ancho * RATIO);
  // La esquina, en puntos. Se calcula una vez y la usan el arte y el hueco: son
  // la misma carta vista de los dos lados y tienen que recortar igual.
  const esquina = Math.round(ancho * RADIO);

  const nombre =
    casilla.tipo === 'legendaria' ? t('album.legendaria') : t(`acciones.${casilla.accion}`);

  /** El arte de esta carta, si la serie está dibujada y ya la conseguiste. */
  const arte = ganada ? cardDe(nivel, casilla.indice) : null;

  if (arte) {
    return (
      <View accessibilityLabel={`${nombre}, ciclo ${nivel}`}>
        <Image
          source={arte}
          style={{ width: ancho, height: alto, borderRadius: esquina }}
          resizeMode="contain"
          fadeDuration={0}
        />
        {/* La lupa avisa que la carta se puede abrir. Va solo acá —en la que
            conseguiste— porque es la única que se abre; sobre un hueco sería
            prometer algo que no pasa.

            En la esquina y no al centro, que es donde la pone Oráculos: allá la
            pieza es un naipe casi liso y acá es una ilustración con la criatura
            en el medio, así que centrada le taparía la cara. */}
        {lupa ? (
          <View style={estilos.lupa}>
            <MaterialCommunityIcons name="magnify-plus-outline" size={16} color="#fff" />
          </View>
        ) : null}
      </View>
    );
  }

  return (
    <View
      style={[
        estilos.carta,
        {
          width: ancho,
          height: alto,
          borderRadius: esquina,
          borderColor: ganada ? color : `${color}33`,
        },
        !ganada && estilos.falta,
      ]}
      accessibilityLabel={ganada ? `${nombre}, ciclo ${nivel}` : `${nombre}, sin conseguir`}
    >
      <View style={[estilos.fondo, { backgroundColor: color, opacity: ganada ? 0.16 : 0.05 }]} />

      <View style={estilos.ventana}>
        {casilla.tipo === 'legendaria' ? (
          <Ionicons
            name="diamond"
            size={Math.round(ancho * 0.42)}
            color={ganada ? color : `${color}44`}
          />
        ) : (
          <Image
            source={ICONO[casilla.accion]}
            // Alto y ancho explícitos, no `aspectRatio`: los iconos vienen en un
            // cuadrado de 128 y sin las dos medidas la imagen se dibuja a su
            // tamaño natural, que en una carta de esta escala la desborda.
            style={[
              estilos.icono,
              { width: Math.round(ancho * 0.38), height: Math.round(ancho * 0.38) },
            ]}
            resizeMode="contain"
            fadeDuration={0}
          />
        )}
      </View>

    </View>
  );
}

const estilos = StyleSheet.create({
  /** El disco de la lupa, abajo a la derecha de la carta. */
  lupa: {
    position: 'absolute',
    right: 6,
    bottom: 6,
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: 'rgba(0,0,0,0.42)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  /**
   * El hueco. **Sin `borderRadius` acá**: la esquina la pone quien dibuja, con
   * la medida del arte —ver `RADIO` en `cards.ts`— y en puntos, porque un
   * radio fijo se veía cuadrado al lado del arte en la hoja y romo al lado de
   * la carta abierta a pantalla completa.
   */
  carta: {
    borderWidth: 1.5,
    backgroundColor: colors.surface,
    overflow: 'hidden',
  },
  /** La que falta se ve apagada, pero se ve: el hueco tiene que dar ganas. */
  falta: { opacity: 0.55 },

  fondo: { ...StyleSheet.absoluteFill },

  ventana: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 4 },
  arte: { width: '100%', height: '100%' },
  /**
   * El icono de la que falta: gris y chico.
   *
   * Tiene que decir qué falta sin competir con las que ya conseguiste: en una
   * hoja de nueve, ocho iconos marcados le ganan a la única carta de verdad y
   * el álbum se lee vacío en vez de empezado.
   *
   * Cuadrado —la medida la pone quien lo dibuja— porque los ocho vienen
   * normalizados al mismo cuadro y así ninguno pesa más que otro.
   */
  icono: { opacity: 0.3, tintColor: colors.textFaint },

});
