import ImageLabeling, { type Label } from '@react-native-ml-kit/image-labeling';
import { CameraView, useCameraPermissions } from 'expo-camera';
import React, { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, elements, radius, spacing } from '../theme';

/**
 * Banco de pruebas del reconocimiento de imágenes.
 *
 * No es parte del juego: sirve para ver qué reconoce el modelo de Google
 * apuntando a cosas reales, y con qué confianza. De acá sale la decisión de qué
 * etiquetas pedirle al jugador.
 *
 * Funciona sacando una foto cada tanto y clasificándola. No es tiempo real:
 * clasificar cuadro a cuadro necesitaría otro enfoque y mucha más batería, y
 * para decidir "estás mirando pasto" con una lectura por segundo alcanza.
 */

/** Qué buscamos que el jugador encuentre. En minúscula, sin acentos. */
const INTERESANTES = [
  'grass',
  'plant',
  'flower',
  'tree',
  'leaf',
  'garden',
  'lawn',
  'forest',
  'soil',
  'water',
  'sky',
  'wood',
];

const INTERVALO = 1200;

type Props = { onBack: () => void };

export function DetectorScreen({ onBack }: Props) {
  const [permission, requestPermission] = useCameraPermissions();
  const [labels, setLabels] = useState<Label[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [lecturas, setLecturas] = useState(0);
  const [ms, setMs] = useState(0);

  const camera = useRef<CameraView>(null);
  const ocupado = useRef(false);
  const vivo = useRef(true);

  useEffect(() => {
    vivo.current = true;
    if (!permission?.granted) return;

    const timer = setInterval(async () => {
      if (ocupado.current || !camera.current) return;
      ocupado.current = true;
      const arranque = Date.now();

      try {
        const foto = await camera.current.takePictureAsync({
          quality: 0.4,
          skipProcessing: true,
          shutterSound: false,
        });

        if (foto?.uri && vivo.current) {
          const resultado = await ImageLabeling.label(foto.uri);
          if (vivo.current) {
            setLabels(resultado);
            setMs(Date.now() - arranque);
            setLecturas((n) => n + 1);
            setError(null);
          }
        }
      } catch (e) {
        if (vivo.current) setError(String((e as Error)?.message ?? e));
      } finally {
        ocupado.current = false;
      }
    }, INTERVALO);

    return () => {
      vivo.current = false;
      clearInterval(timer);
    };
  }, [permission?.granted]);

  if (!permission?.granted) {
    return (
      <View style={styles.centrado}>
        <Text style={styles.texto}>Hace falta la cámara para probar el reconocimiento.</Text>
        <Pressable style={styles.boton} onPress={requestPermission}>
          <Text style={styles.botonTexto}>Dar permiso</Text>
        </Pressable>
        <Pressable style={styles.boton} onPress={onBack}>
          <Text style={styles.botonTexto}>Volver</Text>
        </Pressable>
      </View>
    );
  }

  const hayAlgo = labels.some((l) => INTERESANTES.includes(l.text.toLowerCase()));

  return (
    <View style={styles.root}>
      <CameraView ref={camera} style={StyleSheet.absoluteFill} facing="back" />

      <View style={styles.panel} pointerEvents="box-none">
        <Text style={styles.titulo}>
          {error ? 'Error' : hayAlgo ? 'Hay algo de la naturaleza' : 'Mirando…'}
        </Text>

        {error ? (
          <Text style={styles.error}>{error}</Text>
        ) : labels.length === 0 ? (
          <Text style={styles.vacio}>
            {lecturas === 0 ? 'Primera lectura en camino…' : 'No reconoce nada acá'}
          </Text>
        ) : (
          labels.map((l) => {
            const interesa = INTERESANTES.includes(l.text.toLowerCase());
            return (
              <View key={l.text} style={styles.fila}>
                <Text style={[styles.etiqueta, interesa && styles.etiquetaOk]}>{l.text}</Text>
                <Text style={styles.confianza}>{Math.round(l.confidence * 100)}%</Text>
              </View>
            );
          })
        )}

        <Text style={styles.pie}>
          {lecturas} lecturas · {ms} ms la última
        </Text>
      </View>

      <Pressable style={styles.salir} onPress={onBack}>
        <Text style={styles.botonTexto}>Salir</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  panel: {
    position: 'absolute',
    top: spacing.xl,
    left: spacing.md,
    right: spacing.md,
    backgroundColor: 'rgba(11, 10, 18, 0.82)',
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    gap: spacing.xs,
  },
  titulo: { color: colors.text, fontSize: 18, marginBottom: spacing.xs },
  fila: { flexDirection: 'row', justifyContent: 'space-between', gap: spacing.sm },
  etiqueta: { color: colors.textMuted, fontSize: 16, flexShrink: 1 },
  etiquetaOk: { color: elements.aire.color },
  confianza: { color: colors.textFaint, fontSize: 15 },
  vacio: { color: colors.textFaint, fontSize: 15 },
  error: { color: elements.fuego.color, fontSize: 14, lineHeight: 20 },
  pie: { color: colors.textFaint, fontSize: 13, marginTop: spacing.sm },

  salir: {
    position: 'absolute',
    bottom: spacing.lg,
    alignSelf: 'center',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: 'rgba(21, 19, 31, 0.85)',
  },
  centrado: {
    flex: 1,
    backgroundColor: colors.bg,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.lg,
    gap: spacing.md,
  },
  texto: { color: colors.text, fontSize: 17, textAlign: 'center', lineHeight: 25 },
  boton: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceAlt,
  },
  botonTexto: { color: colors.text, fontSize: 15 },
});
