import Ionicons from '@expo/vector-icons/Ionicons';
import React from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';

import { porId } from '../art';
import { colorDeNivel } from '../juego/datos';
import { useT } from '../i18n';
import { colors } from '../theme';
import type { Casilla } from './casillas';

/**
 * Una figurita del álbum.
 *
 * **Mockeada por código hasta que llegue el arte.** Se dibuja con la pose fija
 * de la criatura, el color de la vuelta y un marco: alcanza para que el álbum,
 * el pase de hoja y el visor queden terminados y probados antes de que exista
 * una sola carta dibujada. Cuando lleguen, esto pasa a ser una imagen y nada
 * más cambia.
 *
 * La que falta no se dibuja como un hueco vacío: se muestra la silueta y el
 * marco apagado. Ver la forma de lo que falta es lo que da ganas de salir a
 * buscarlo; un rectángulo gris no dice nada.
 */

/** Proporción de una carta, tipo naipe. */
export const RATIO = 1.4;

type Props = {
  casilla: Casilla;
  nivel: number;
  ganada: boolean;
  /** Ancho en puntos. El alto sale del ratio. */
  ancho: number;
};

export function Carta({ casilla, nivel, ganada, ancho }: Props) {
  const t = useT();
  const color = colorDeNivel(nivel);
  const alto = Math.round(ancho * RATIO);

  const criatura = casilla.tipo === 'criatura' ? porId(casilla.criatura) : null;
  const nombre = casilla.tipo === 'legendaria' ? t('album.legendaria') : (criatura?.nombre ?? '');

  return (
    <View
      style={[
        estilos.carta,
        { width: ancho, height: alto, borderColor: ganada ? color : `${color}33` },
        !ganada && estilos.falta,
      ]}
      accessibilityLabel={ganada ? `${nombre}, vuelta ${nivel}` : `${nombre}, sin conseguir`}
    >
      <View style={[estilos.fondo, { backgroundColor: color, opacity: ganada ? 0.16 : 0.05 }]} />

      <View style={estilos.ventana}>
        {casilla.tipo === 'legendaria' ? (
          <Ionicons
            name="diamond"
            size={Math.round(ancho * 0.42)}
            color={ganada ? color : `${color}44`}
          />
        ) : criatura ? (
          <Image
            source={ganada ? criatura.quieto : criatura.sombra}
            style={[estilos.arte, !ganada && estilos.apenas]}
            resizeMode="contain"
            fadeDuration={0}
          />
        ) : null}
      </View>

      <View style={[estilos.banda, { borderTopColor: ganada ? `${color}66` : `${color}22` }]}>
        <Text
          style={[estilos.nombre, { fontSize: Math.max(7, Math.round(ancho * 0.11)) }]}
          numberOfLines={1}
        >
          {ganada ? nombre : '· · ·'}
        </Text>
      </View>
    </View>
  );
}

const estilos = StyleSheet.create({
  carta: {
    borderWidth: 1.5,
    borderRadius: 7,
    backgroundColor: colors.surface,
    overflow: 'hidden',
  },
  /** La que falta se ve apagada, pero se ve: el hueco tiene que dar ganas. */
  falta: { opacity: 0.55 },

  fondo: { ...StyleSheet.absoluteFill },

  ventana: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 4 },
  arte: { width: '100%', height: '100%' },
  /**
   * La silueta de la que falta, apenas insinuada.
   *
   * Tiene que dejar adivinar la forma sin competir con las que ya conseguiste:
   * en una hoja de nueve, ocho siluetas marcadas le ganan a la única a color y
   * el álbum se lee vacío en vez de empezado.
   */
  apenas: { opacity: 0.4 },

  banda: {
    borderTopWidth: 1,
    paddingVertical: 3,
    paddingHorizontal: 3,
    alignItems: 'center',
  },
  nombre: { color: colors.text, letterSpacing: 0.2 },
});
