import React from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useT } from '../i18n';
import { Canto } from './Canto';
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
 * redondeadas. La placa es lisa a propósito —lo que se mira son las criaturas—;
 * el volumen está en las tres fichas, que son las mismas de la barra de abajo.
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
  /**
   * Muestra la campana de avisos.
   *
   * En las hojas que se abren encima —la ayuda, los avisos mismos, la ficha de
   * un bicho— no va: ahí lo único que se puede hacer es salir, y una segunda
   * salida hacia otro lado la contradice. La campana vive en las secciones,
   * que es de donde se sale a mirar un aviso.
   */
  avisos?: boolean;
};

/**
 * El logo, para la pantalla de casa.
 *
 * El archivo es una silueta blanca sobre transparencia: sobre el papel claro
 * desaparecería, así que se pinta con `tintColor` del color de la tinta. Si
 * algún día el logo pasa a tener colores propios, hay que sacar el tinte.
 */
const LOGO = require('../../assets/logo.png');

/**
 * Las tres fichas del header, del mismo juego que las de la barra de abajo.
 *
 * Son dibujos y no íconos de línea por lo mismo que abajo: al lado de las
 * criaturas, un ícono de sistema se lee como el control de otra app pegado
 * arriba.
 */
const AVISOS = require('../../assets/ui/avisos.webp');
const CERRAR = require('../../assets/ui/cerrar.webp');
const AYUDA = require('../../assets/ui/ayuda.webp');

const ALTO = 74;
const BOTON = 50;

/** Diámetro de la ficha adentro del botón. */
const FICHA = 42;

export function Header({
  titulo,
  marca,
  accion,
  onAccion,
  pendientes,
  onPendientes,
  avisos = true,
}: Props) {
  const insets = useSafeAreaInsets();
  const t = useT();

  return (
    <View style={[estilos.placa, { paddingTop: insets.top, height: ALTO + insets.top }]}>
      <Canto lado="arriba" />

      <View style={estilos.fila}>
        {avisos ? (
          <Pressable
            onPress={onPendientes}
            hitSlop={10}
            style={({ pressed }) => [estilos.boton, pressed && estilos.presionado]}
            accessibilityRole="button"
            accessibilityLabel={
              pendientes ? t('header.avisosPendientes', { cantidad: pendientes }) : t('header.avisos')
            }
          >
            <Image source={AVISOS} style={estilos.ficha} resizeMode="contain" fadeDuration={0} />
            {pendientes ? (
              <View style={estilos.globo}>
                <Text style={estilos.globoTexto}>{pendientes > 9 ? '9+' : pendientes}</Text>
              </View>
            ) : null}
          </Pressable>
        ) : (
          // El hueco de la campana, para que el título siga centrado.
          <View style={estilos.boton} />
        )}

        {marca ? (
          <Image
            source={LOGO}
            style={estilos.logo}
            tintColor={colors.text}
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
          <Image
            source={accion === 'ayuda' ? AYUDA : CERRAR}
            style={estilos.ficha}
            resizeMode="contain"
            fadeDuration={0}
          />
        </Pressable>
      </View>
    </View>
  );
}

const estilos = StyleSheet.create({
  /** El mismo plano gris que la barra de abajo. Ver `Footer` para el porqué. */
  placa: {
    backgroundColor: armazon.plano,
    // Las esquinas de afuera: las que dan al borde de la pantalla.
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
  },

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
  presionado: { opacity: 0.55 },

  ficha: { width: FICHA, height: FICHA },

  globo: {
    position: 'absolute',
    top: 5,
    right: 5,
    minWidth: 17,
    paddingHorizontal: 4,
    paddingVertical: 2,
    borderRadius: 999,
    backgroundColor: armazon.borde,
    alignItems: 'center',
    justifyContent: 'center',
  },
  globoTexto: {
    color: armazon.sobreBorde,
    fontSize: 11,
    fontWeight: '700',
    lineHeight: 13,
    includeFontPadding: false,
    textAlignVertical: 'center',
  },
  hueco: { flex: 1 },

  /** Alto fijo y ancho libre: el logo es apaisado y se centra solo. */
  logo: { flex: 1, height: 42 },

  titulo: {
    flex: 1,
    textAlign: 'center',
    color: colors.text,
    fontSize: 16,
    letterSpacing: 2.5,
  },
});
