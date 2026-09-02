import Ionicons from '@expo/vector-icons/Ionicons';
import React from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useT } from '../i18n';
import { armazon, colors, radius } from '../theme';

/**
 * El header de toda la app: la campana de avisos a la izquierda, título
 * centrado, y a la derecha el `?` o la X.
 *
 * La campana va acá y no en la barra de abajo porque es un **aviso**: algo que
 * aparece solo y reclama atención. Abajo viven los **lugares**, sitios a los
 * que uno decide ir. Mezclar las dos cosas hace que ninguna se lea bien.
 *
 * Es una placa apoyada contra el borde de arriba, con las esquinas de afuera
 * redondeadas. Nada de siluetas ni degradés: la forma tiene que ser simple para
 * que lo que se mire sean las criaturas.
 */

/**
 * Qué muestra el botón de la derecha.
 *
 * `ayuda` en las secciones; la X solo en las hojas que se abren encima. La
 * ayuda tiene que estar disponible desde donde sea que estés, y la salida
 * siempre en el mismo lugar.
 */
export type Accion = 'ayuda' | 'cerrar';

type Props = {
  titulo?: string;
  /**
   * Muestra el logo en vez del título.
   *
   * Va solo en la colección: es la marca de la app, no el nombre de una
   * pantalla. En el resto el lugar del medio dice dónde estás parado.
   */
  marca?: boolean;
  accion: Accion;
  onAccion: () => void;
  /**
   * Cuántos pendientes se pueden resolver **ahora**.
   *
   * Solo los accionables. Si contara también lo que exige salir a buscar, el
   * número no bajaría nunca y en una semana nadie lo miraría: se comporta como
   * lista de tareas, no como correo sin leer.
   */
  pendientes: number;
  onPendientes: () => void;
  /** El color de la vuelta en curso. Tiñe el relleno, nunca el borde. */
  tinte: string;
};

/** El logo, para la pantalla de casa. Es blanco sobre transparencia. */
const LOGO = require('../../assets/logo.png');

const ALTO = 52;
const BOTON = 44;

export function Header({ titulo, marca, accion, onAccion, pendientes, onPendientes, tinte }: Props) {
  const insets = useSafeAreaInsets();
  const t = useT();

  return (
    <View style={[estilos.placa, { paddingTop: insets.top, height: ALTO + insets.top }]}>
      <View style={[estilos.tinte, { backgroundColor: tinte }]} pointerEvents="none" />

      <View style={estilos.fila}>
        <Pressable
          onPress={onPendientes}
          hitSlop={10}
          style={({ pressed }) => [estilos.boton, pressed && estilos.presionado]}
          accessibilityRole="button"
          accessibilityLabel={
            pendientes ? t('header.avisosPendientes', { cantidad: pendientes }) : t('header.avisos')
          }
        >
          <Ionicons
            name={pendientes ? 'notifications' : 'notifications-outline'}
            size={22}
            color={pendientes ? armazon.borde : colors.text}
          />
          {pendientes ? (
            <View style={estilos.globo}>
              <Text style={estilos.globoTexto}>{pendientes > 9 ? '9+' : pendientes}</Text>
            </View>
          ) : null}
        </Pressable>

        {marca ? (
          <Image
            source={LOGO}
            style={estilos.logo}
            resizeMode="contain"
            accessibilityLabel={t('header.logo')}
          />
        ) : titulo ? (
          <Text style={estilos.titulo} numberOfLines={1}>
            {titulo}
          </Text>
        ) : (
          <View style={estilos.hueco} />
        )}

        <Pressable
          onPress={onAccion}
          hitSlop={10}
          style={({ pressed }) => [estilos.boton, pressed && estilos.presionado]}
          accessibilityRole="button"
          accessibilityLabel={t(accion === 'ayuda' ? 'header.ayuda' : 'header.cerrar')}
        >
          <Ionicons
            name={accion === 'ayuda' ? 'help-circle-outline' : 'close'}
            size={accion === 'ayuda' ? 25 : 26}
            color={colors.text}
          />
        </Pressable>
      </View>
    </View>
  );
}

const estilos = StyleSheet.create({
  placa: {
    backgroundColor: colors.surface,
    // Las esquinas de afuera: las que dan al borde de la pantalla.
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
    borderBottomWidth: 1,
    borderBottomColor: `${armazon.borde}44`,
    overflow: 'hidden',
  },
  /** El color de la vuelta, muy diluido. El borde nunca se tiñe. */
  tinte: { ...StyleSheet.absoluteFill, opacity: 0.1 },

  fila: {
    height: ALTO,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 10,
  },
  boton: {
    width: BOTON,
    height: BOTON,
    borderRadius: BOTON / 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  presionado: { backgroundColor: colors.surfaceAlt },

  globo: {
    position: 'absolute',
    top: 5,
    right: 5,
    minWidth: 17,
    height: 17,
    paddingHorizontal: 4,
    borderRadius: 9,
    backgroundColor: armazon.borde,
    alignItems: 'center',
    justifyContent: 'center',
  },
  globoTexto: { color: '#2A2114', fontSize: 11, fontWeight: '700' },
  hueco: { flex: 1 },

  /** Alto fijo y ancho libre: el logo es apaisado y se centra solo. */
  logo: { flex: 1, height: 34 },

  titulo: {
    flex: 1,
    textAlign: 'center',
    color: colors.text,
    fontSize: 16,
    letterSpacing: 2.5,
  },
});
