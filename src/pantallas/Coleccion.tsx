import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import React from 'react';
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { useT } from '../i18n';
import { criaturas } from '../art';
import { progreso } from '../juego/crianza';
import { COLOR_NIVEL, colorDeNivel } from '../juego/datos';
import { useJuego } from '../juego/store';
import type { Rutas } from '../navegacion/rutas';
import { Pantalla } from '../shell/Pantalla';
import { colors, radius, spacing } from '../theme';

/**
 * La casa: las ocho criaturas, las que faltan en sombra.
 *
 * Es lo primero que se ve al abrir porque lo primero que alguien quiere saber es
 * cuánto le falta. Las sombras se muestran desde el minuto cero: ver los huecos
 * es lo que da ganas de llenarlos.
 *
 * Acá las criaturas van quietas. El bebé animado vive en su ficha, que es donde
 * se lo mira de a una: ocho animaciones a la vez terminan arrastrando el
 * teléfono.
 */

type Props = NativeStackScreenProps<Rutas, 'Coleccion'>;

type EstadoBicho = 'sombra' | 'crianza' | 'completa';

export function ColeccionScreen({ navigation }: Props) {
  const juego = useJuego((e) => e.juego);
  const t = useT();
  const tinte = colorDeNivel(juego.nivel);

  return (
    <Pantalla marca seccion="coleccion">
      <ScrollView contentContainerStyle={estilos.hoja}>
        <Vueltas actual={juego.nivel} />

        <View style={estilos.grilla}>
          {criaturas.map((c) => {
            const crianza = juego.crianza.find((x) => x.criatura === c.id);
            const estado: EstadoBicho = juego.completadas.includes(c.id)
              ? 'completa'
              : crianza
                ? 'crianza'
                : 'sombra';

            return (
              <Pressable
                key={c.id}
                style={({ pressed }) => [estilos.celda, pressed && { opacity: 0.7 }]}
                disabled={estado !== 'crianza'}
                onPress={() => navigation.navigate('Bicho', { criatura: c.id })}
                accessibilityRole="button"
                accessibilityLabel={estado === 'sombra' ? t('coleccion.sinDescubrir') : t(`criaturas.${c.id}`)}
              >
                <View style={[estilos.marco, { borderColor: `${tinte}55` }]}>
                  <Image
                    // La sombra y la pose a color son el mismo cuadro, así que
                    // al encontrarla el color entra sin que nada se mueva.
                    source={estado === 'sombra' ? c.sombra : c.quieto}
                    style={estilos.arte}
                    resizeMode="contain"
                    fadeDuration={0}
                  />

                  {estado === 'completa' ? (
                    <View style={[estilos.sello, { backgroundColor: tinte }]}>
                      <Text style={estilos.selloTexto}>✓</Text>
                    </View>
                  ) : null}
                </View>

                <Text style={estilos.nombre} numberOfLines={1}>
                  {estado === 'sombra' ? t('coleccion.oculta') : t(`criaturas.${c.id}`)}
                </Text>

                <View style={estilos.barra}>
                  {crianza ? (
                    <View
                      style={[
                        estilos.barraLlena,
                        { width: `${Math.round(progreso(crianza) * 100)}%`, backgroundColor: tinte },
                      ]}
                    />
                  ) : null}
                </View>
              </Pressable>
            );
          })}
        </View>
      </ScrollView>
    </Pantalla>
  );
}

/**
 * Las ocho vueltas, como ocho puntos.
 *
 * Cada uno con el color de su vuelta, la actual marcada y agrandada. Dice lo
 * mismo que un "vuelta 1 de 8" pero de un vistazo, y de paso adelanta que los
 * colores que vienen son otros: eso solo ya da ganas de llegar.
 */
function Vueltas({ actual }: { actual: number }) {
  const t = useT();

  return (
    <View style={estilos.vueltas} accessibilityLabel={t('coleccion.vuelta', { actual, total: COLOR_NIVEL.length })}>
      {COLOR_NIVEL.map((color, i) => {
        const nivel = i + 1;
        const esta = nivel === actual;
        const pasada = nivel < actual;
        return (
          <View
            key={nivel}
            style={[
              estilos.punto,
              { backgroundColor: color },
              esta && estilos.puntoActual,
              // Las que faltan se ven apagadas: están ahí, pero todavía no son
              // tuyas.
              !esta && !pasada && { opacity: 0.28 },
            ]}
          />
        );
      })}
    </View>
  );
}

const estilos = StyleSheet.create({
  hoja: { padding: spacing.md, paddingBottom: spacing.xl, gap: spacing.md },

  vueltas: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 10,
    height: 20,
  },
  punto: { width: 9, height: 9, borderRadius: 5 },
  puntoActual: {
    width: 15,
    height: 15,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: colors.text,
  },

  grilla: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  celda: { width: '48%', marginBottom: spacing.md, gap: 6 },

  marco: {
    aspectRatio: 1,
    borderWidth: 1,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  arte: { width: '90%', height: '90%' },

  sello: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  selloTexto: { color: '#14110C', fontSize: 13, fontWeight: '700' },

  nombre: { color: colors.text, fontSize: 13, textAlign: 'center' },

  barra: {
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.surfaceAlt,
    overflow: 'hidden',
  },
  barraLlena: { height: 4, borderRadius: 2 },
});
