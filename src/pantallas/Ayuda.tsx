import Ionicons from '@expo/vector-icons/Ionicons';
import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { useT } from '../i18n';
import { IDIOMAS } from '../i18n/idiomas';
import { colorDeNivel } from '../juego/datos';
import { useJuego } from '../juego/store';
import { Pantalla } from '../shell/Pantalla';
import { colors, radius, spacing } from '../theme';
import { EnObra } from './EnObra';

/**
 * Cómo se juega, y el idioma. Vive detrás del `?`, que va siempre arriba a la
 * derecha.
 *
 * ## El idioma va acá y no en una pantalla propia
 *
 * Es el mismo lugar que en Oráculos, y a propósito: **es un estándar entre las
 * apps de Imago**. Quien usa una y después la otra busca el idioma donde ya lo
 * encontró una vez. Una pantalla de ajustes aparte sería más ordenada en el
 * papel y peor de encontrar, para una app que tiene exactamente un ajuste.
 *
 * La lista también sigue el patrón: un rótulo, un grupo con borde, una fila por
 * idioma y un tilde en la puesta. **Cada idioma se nombra en sí mismo** —
 * "Português", no "Portugués"—, porque quien lo busca lo reconoce por cómo se
 * ve, no traducido a un idioma que no lee. Ese es el único texto de la app que
 * no pasa por el diccionario, y es correcto que no pase.
 */
export function AyudaScreen() {
  const t = useT();
  const idioma = useJuego((e) => e.juego.idioma);
  const nivel = useJuego((e) => e.juego.nivel);
  const setIdioma = useJuego((e) => e.setIdioma);
  const tinte = colorDeNivel(nivel);

  return (
    <Pantalla titulo={t('ayuda.titulo')} encima>
      <ScrollView contentContainerStyle={estilos.hoja}>
        <EnObra que={t('ayuda.que')} espera={t('ayuda.espera')} />

        <Text style={estilos.rotulo}>{t('ajustes.idioma')}</Text>
        <View style={estilos.grupo}>
          {IDIOMAS.map((item, i) => {
            const puesto = item.codigo === idioma;
            return (
              <Pressable
                key={item.codigo}
                onPress={() => setIdioma(item.codigo)}
                style={({ pressed }) => [
                  estilos.fila,
                  i > 0 && estilos.filaBorde,
                  pressed && estilos.filaPresionada,
                ]}
                accessibilityRole="button"
                accessibilityState={{ selected: puesto }}
                accessibilityLabel={item.etiqueta}
              >
                <Text style={estilos.filaTitulo}>{item.etiqueta}</Text>
                {puesto ? <Ionicons name="checkmark" size={20} color={tinte} /> : null}
              </Pressable>
            );
          })}
        </View>
      </ScrollView>
    </Pantalla>
  );
}

const estilos = StyleSheet.create({
  hoja: { padding: spacing.md, paddingBottom: spacing.xl, gap: spacing.sm },

  rotulo: {
    color: colors.textFaint,
    fontSize: 10.5,
    letterSpacing: 2,
    marginTop: spacing.md,
  },

  grupo: {
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    // Recorta las filas contra las esquinas redondeadas: sin esto, la de arriba
    // y la de abajo pintan sus rectángulos por encima de la curva al tocarlas.
    overflow: 'hidden',
  },
  fila: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
  },
  // Separador entre filas, no marco: la primera no lo lleva.
  filaBorde: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border },
  filaPresionada: { backgroundColor: colors.surfaceAlt },
  filaTitulo: { flex: 1, color: colors.text, fontSize: 16 },
});
