import Ionicons from '@expo/vector-icons/Ionicons';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useT } from '../i18n';
import { armazon, colors, radius } from '../theme';

/**
 * La barra de abajo: una placa apoyada contra el borde inferior, con las
 * esquinas de afuera redondeadas, y **Buscar** como botón redondo que sobresale
 * por arriba en el medio.
 *
 * Buscar no es un item más de una fila de items iguales. Es *la* acción del
 * juego y las otras cuatro son mirar lo que tenés, así que va grande, al centro
 * y bajo el pulgar.
 *
 * Los iconos van sin etiqueta. Son cuatro, dos de cada lado, y siempre los
 * mismos: se aprenden en dos usos y el texto solo hace ruido abajo de todo.
 */

export type Seccion = 'coleccion' | 'inventario' | 'cocina' | 'album';

type Props = {
  activa: Seccion | null;
  onSeccion: (s: Seccion) => void;
  onBuscar: () => void;
  /** El color de la vuelta en curso. Tiñe el relleno, nunca el borde. */
  tinte: string;
};

const ALTO = 60;

/** Diámetro del botón de buscar. */
const BUSCAR = 62;

type Item = {
  seccion: Seccion;
  icono: keyof typeof Ionicons.glyphMap;
  activo: keyof typeof Ionicons.glyphMap;
  /** Clave del diccionario. Solo para lectores de pantalla: en la barra no
   *  se dibuja texto. */
  clave: string;
};

/**
 * El inventario no lleva el matraz: adentro tiene tres pestañas —ingredientes,
 * comidas y pociones— y el matraz es el de las pociones. Si estuviera también
 * acá afuera, el ícono de la sección y el de una de sus pestañas serían el
 * mismo y no se entendería dónde estás parado.
 */
const IZQUIERDA: Item[] = [
  { seccion: 'coleccion', icono: 'paw-outline', activo: 'paw', clave: 'secciones.coleccion' },
  { seccion: 'inventario', icono: 'bag-handle-outline', activo: 'bag-handle', clave: 'secciones.inventario' },
];

const DERECHA: Item[] = [
  { seccion: 'cocina', icono: 'flame-outline', activo: 'flame', clave: 'secciones.cocina' },
  { seccion: 'album', icono: 'book-outline', activo: 'book', clave: 'secciones.album' },
];

export function Footer({ activa, onSeccion, onBuscar, tinte }: Props) {
  const t = useT();
  const insets = useSafeAreaInsets();

  const item = (it: Item) => {
    const puesta = activa === it.seccion;
    return (
      <Pressable
        key={it.seccion}
        onPress={() => onSeccion(it.seccion)}
        hitSlop={8}
        style={({ pressed }) => [estilos.item, pressed && estilos.presionado]}
        accessibilityRole="button"
        accessibilityLabel={t(it.clave)}
      >
        <Ionicons
          name={puesta ? it.activo : it.icono}
          size={26}
          color={puesta ? tinte : colors.textMuted}
        />
      </Pressable>
    );
  };

  return (
    <View style={[estilos.placa, { paddingBottom: insets.bottom, height: ALTO + insets.bottom }]}>
      <View style={[estilos.tinte, { backgroundColor: tinte }]} pointerEvents="none" />

      <View style={estilos.fila}>
        <View style={estilos.grupo}>
          {item(IZQUIERDA[0])}
          {item(IZQUIERDA[1])}
        </View>

        {/* El hueco del botón de buscar, que va absoluto y sobresale. */}
        <View style={{ width: BUSCAR + 12 }} />

        <View style={estilos.grupo}>{DERECHA.map((d) => item(d))}</View>
      </View>

      <Pressable
        onPress={onBuscar}
        style={({ pressed }) => [estilos.buscar, pressed && { transform: [{ scale: 0.93 }] }]}
        accessibilityRole="button"
        accessibilityLabel={t('footer.buscar')}
      >
        <View style={[estilos.buscarCara, { backgroundColor: tinte }]}>
          <Ionicons name="footsteps-outline" size={28} color="#14110C" />
        </View>
      </Pressable>
    </View>
  );
}

const estilos = StyleSheet.create({
  placa: {
    backgroundColor: colors.surface,
    // Las esquinas de afuera: las que dan al borde de la pantalla.
    borderBottomLeftRadius: radius.lg,
    borderBottomRightRadius: radius.lg,
    borderTopWidth: 1,
    borderTopColor: `${armazon.borde}44`,
  },
  tinte: { ...StyleSheet.absoluteFill, opacity: 0.1 },

  fila: {
    height: ALTO,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  grupo: { flex: 1, flexDirection: 'row', justifyContent: 'space-evenly' },

  item: { alignItems: 'center', justifyContent: 'center', paddingHorizontal: 8, height: ALTO },
  presionado: { opacity: 0.55 },


  buscar: {
    position: 'absolute',
    alignSelf: 'center',
    // Sobresale por arriba de la placa: es lo que lo separa de los otros cuatro.
    top: -BUSCAR / 2.6,
    width: BUSCAR,
    height: BUSCAR,
    borderRadius: BUSCAR / 2,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.bg,
  },
  buscarCara: {
    width: BUSCAR - 8,
    height: BUSCAR - 8,
    borderRadius: (BUSCAR - 8) / 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
