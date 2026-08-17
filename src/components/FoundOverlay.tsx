import React from 'react';
import { Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';

import { CriaturaView } from './CriaturaView';
import { adulto, type Criatura } from '../art';
import { colors, elements, radius, spacing } from '../theme';

type Props = {
  criatura: Criatura;
  segundos: number;
  /** Cuántas especies distintas lleva, sobre el total posible. */
  distintas: number;
  posibles: number;
  /** Si es la primera vez que aparece esta criatura. */
  esNueva: boolean;
  onSeguir: () => void;
  onVolver: () => void;
};

export function FoundOverlay({
  criatura,
  segundos,
  distintas,
  posibles,
  esNueva,
  onSeguir,
  onVolver,
}: Props) {
  const { width } = useWindowDimensions();
  const el = elements[criatura.elemento];

  return (
    <View style={styles.backdrop}>
      <CriaturaView
        size={Math.round(width * 0.62)}
        pieza={adulto(criatura)}
        nombre={criatura.nombre}
        elemento={criatura.elemento}
      />

      <View style={styles.card}>
        <Text style={styles.kicker}>{esNueva ? 'Nueva criatura' : 'La encontraste de nuevo'}</Text>
        <Text style={[styles.nombre, { color: el.color }]}>{criatura.nombre}</Text>

        <Text style={styles.meta}>
          {segundos} s · {distintas} de {posibles} criaturas
        </Text>

        {distintas >= posibles ? (
          <Text style={styles.completo}>Las encontraste todas</Text>
        ) : null}

        <Pressable style={[styles.button, styles.buttonPrimary]} onPress={onSeguir}>
          <Text style={styles.buttonPrimaryText}>
            {distintas >= posibles
              ? 'Buscar otra vez'
              : `Buscar la siguiente · faltan ${posibles - distintas}`}
          </Text>
        </Pressable>

        <Pressable style={styles.button} onPress={onVolver}>
          <Text style={styles.buttonText}>Volver</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(11, 10, 18, 0.9)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.md,
  },
  card: {
    width: '100%',
    maxWidth: 420,
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  kicker: {
    color: colors.textMuted,
    fontSize: 14,
    letterSpacing: 1,
  },
  nombre: {
    fontSize: 26,
    textAlign: 'center',
  },
  meta: {
    color: colors.textMuted,
    fontSize: 15,
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  button: {
    width: '100%',
    paddingVertical: spacing.sm + 2,
    paddingHorizontal: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceAlt,
    alignItems: 'center',
  },
  buttonPrimary: {
    backgroundColor: colors.accent,
    borderColor: colors.accent,
  },
  buttonPrimaryText: { color: '#141020', fontSize: 16, textAlign: 'center' },
  completo: {
    color: colors.accent,
    fontSize: 17,
    textAlign: 'center',
    marginBottom: spacing.xs,
  },
  buttonText: { color: colors.text, fontSize: 16 },
});
