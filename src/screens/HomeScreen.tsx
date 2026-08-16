import { useCameraPermissions } from 'expo-camera';
import React, { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { criaturas } from '../art';
import { borrar, cargar, especies, resumen, type Hallazgo } from '../game/hallazgos';
import { colors, elements, radius, spacing } from '../theme';

type Props = {
  onSearch: () => void;
  refreshKey: number;
};

export function HomeScreen({ onSearch, refreshKey }: Props) {
  const [hallazgos, setHallazgos] = useState<Hallazgo[]>([]);
  const [, requestPermission] = useCameraPermissions();

  useEffect(() => {
    cargar().then(setHallazgos);
  }, [refreshKey]);

  const r = resumen(hallazgos);
  const halladas = especies(hallazgos);
  const completo = r.distintas === r.posibles && r.posibles > 0;

  async function empezar() {
    const perm = await requestPermission();
    if (perm?.granted) onSearch();
  }

  return (
    <ScrollView
      style={styles.root}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.header}>
        <Text style={styles.title}>Kaurix</Text>
        <Text style={styles.subtitle}>Encontrá las criaturas</Text>
      </View>

      <View style={styles.marcador}>
        <Text style={styles.numero}>{r.distintas}</Text>
        <View style={styles.marcadorTexto}>
          <Text style={styles.deTotal}>de {r.posibles}</Text>
          <Text style={styles.marcadorSub}>
            {completo
              ? 'Las encontraste todas'
              : r.distintas === 0
                ? 'Todavía no encontraste ninguna'
                : `Te faltan ${r.posibles - r.distintas}`}
          </Text>
        </View>
      </View>

      <Pressable style={styles.boton} onPress={empezar}>
        <Text style={styles.botonTexto}>
          {completo ? 'Buscar de nuevo' : r.distintas === 0 ? 'Empezar a buscar' : 'Seguir buscando'}
        </Text>
      </Pressable>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Colección</Text>

        {criaturas.map((c) => {
          const encontrada = halladas.includes(c.id);
          const veces = hallazgos.filter((h) => h.criatura === c.id).length;
          const el = elements[c.elemento];

          return (
            <View key={c.id} style={styles.fila}>
              <View
                style={[
                  styles.punto,
                  { backgroundColor: encontrada ? el.color : 'transparent', borderColor: el.color },
                ]}
              />
              <Text style={[styles.filaNombre, !encontrada && styles.filaOculta]}>
                {encontrada ? c.nombre : '· · ·'}
              </Text>
              {veces > 1 ? <Text style={styles.veces}>×{veces}</Text> : null}
            </View>
          );
        })}
      </View>

      {hallazgos.length > 0 ? (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Marcas</Text>
          <Text style={styles.dato}>{r.total} hallazgos en total</Text>
          {r.mejorTiempo !== null ? (
            <Text style={styles.dato}>La más rápida: {r.mejorTiempo} s</Text>
          ) : null}

          <Pressable
            style={styles.limpiar}
            onPress={async () => {
              await borrar();
              setHallazgos([]);
            }}
          >
            <Text style={styles.limpiarTexto}>Empezar de cero</Text>
          </Pressable>
        </View>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  content: {
    padding: spacing.md,
    paddingTop: spacing.xl + spacing.md,
    paddingBottom: spacing.xl,
    gap: spacing.md,
  },

  header: { gap: spacing.xs, marginBottom: spacing.sm },
  title: { color: colors.text, fontSize: 40, letterSpacing: 3 },
  subtitle: { color: colors.textMuted, fontSize: 16 },

  marcador: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radius.lg,
    padding: spacing.md,
  },
  numero: { color: colors.accent, fontSize: 56, lineHeight: 62 },
  marcadorTexto: { flexShrink: 1, gap: 2 },
  deTotal: { color: colors.text, fontSize: 20 },
  marcadorSub: { color: colors.textMuted, fontSize: 15, lineHeight: 21 },

  boton: {
    backgroundColor: colors.accent,
    borderRadius: radius.lg,
    paddingVertical: spacing.md,
    alignItems: 'center',
  },
  botonTexto: { color: '#141020', fontSize: 18 },

  card: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radius.lg,
    padding: spacing.md,
    gap: spacing.sm,
  },
  cardTitle: { color: colors.textMuted, fontSize: 14, letterSpacing: 1 },

  fila: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  punto: { width: 12, height: 12, borderRadius: 6, borderWidth: 1.5 },
  filaNombre: { color: colors.text, fontSize: 16, flexShrink: 1 },
  filaOculta: { color: colors.textFaint, letterSpacing: 3 },
  veces: { color: colors.textFaint, fontSize: 14 },

  dato: { color: colors.textMuted, fontSize: 15, lineHeight: 21 },
  limpiar: { alignSelf: 'flex-start', marginTop: spacing.xs, paddingVertical: spacing.xs },
  limpiarTexto: { color: colors.textFaint, fontSize: 14 },
});
