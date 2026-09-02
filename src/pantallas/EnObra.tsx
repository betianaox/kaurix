import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { colors, radius, spacing } from '../theme';

/**
 * Una pantalla que todavía no existe, escrita para que se vea qué va a haber y
 * qué falta para poder hacerla.
 *
 * Es a propósito: la navegación entera tiene que poder recorrerse desde el
 * primer día. Un botón que no lleva a ningún lado esconde los problemas de
 * recorrido hasta que ya es caro arreglarlos.
 */
export function EnObra({ que, espera }: { que: string; espera: string }) {
  return (
    <View style={estilos.raiz}>
      <Text style={estilos.que}>{que}</Text>
      <View style={estilos.nota}>
        <Text style={estilos.espera}>{espera}</Text>
      </View>
    </View>
  );
}

const estilos = StyleSheet.create({
  raiz: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.lg, gap: spacing.md },
  que: { color: colors.text, fontSize: 16, textAlign: 'center', lineHeight: 23 },
  nota: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.md,
  },
  espera: { color: colors.textFaint, fontSize: 13, textAlign: 'center', lineHeight: 19 },
});
