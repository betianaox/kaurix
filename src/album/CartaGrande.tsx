import React from 'react';
import { Modal, Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';

import { useT } from '../i18n';
import { colors, spacing } from '../theme';
import { Carta, RATIO } from './Carta';
import type { Casilla } from './casillas';

/**
 * Una figurita a pantalla completa.
 *
 * Lo más grande que entre respetando la proporción, y se cierra tocando en
 * cualquier lado. Es el mismo visor que en Oráculos: cuando el arte de las
 * cartas exista, esta es la pantalla donde se va a mirar.
 */

type Props = {
  abierta: { casilla: Casilla; nivel: number; ganada: boolean } | null;
  onCerrar: () => void;
};

export function CartaGrande({ abierta, onCerrar }: Props) {
  const t = useT();
  const { width, height } = useWindowDimensions();
  // Lo más grande que entre dejando un respiro alrededor: la carta abierta es
  // el momento de mirarla, y con márgenes anchos se veía apenas más grande que
  // en la hoja, que es como no haberla abierto.
  const ancho = Math.floor(Math.min(width * 0.92, (height * 0.88) / RATIO));

  return (
    <Modal
      visible={!!abierta}
      transparent
      animationType="fade"
      onRequestClose={onCerrar}
      statusBarTranslucent
    >
      <Pressable style={estilos.fondo} onPress={onCerrar}>
        {abierta ? (
          <>
            <Carta
              casilla={abierta.casilla}
              nivel={abierta.nivel}
              ganada={abierta.ganada}
              ancho={ancho}
            />
            {!abierta.ganada ? (
              <Text style={estilos.falta}>{t('album.noLaTienes')}</Text>
            ) : null}
          </>
        ) : null}
      </Pressable>
    </Modal>
  );
}

const estilos = StyleSheet.create({
  fondo: {
    flex: 1,
    backgroundColor: colors.velo,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
  },
  falta: { color: colors.textMuted, fontSize: 14 },
});
