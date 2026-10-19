import Ionicons from '@expo/vector-icons/Ionicons';
import React, { useRef, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';

import { useT } from '../i18n';
import { useJuego } from '../juego/store';
import { colors, spacing } from '../theme';
import { Carta, RATIO } from './Carta';
import type { Casilla } from './casillas';
import { compartirCarta } from './compartir';
import { TarjetaCompartir } from './TarjetaCompartir';

/**
 * Una figurita a pantalla completa.
 *
 * Lo más grande que entre respetando la proporción, y se cierra tocando en
 * cualquier lado. Es el mismo visor que en Oráculos: cuando el arte de las
 * cartas exista, esta es la pantalla donde se va a mirar.
 *
 * **Y es desde donde se comparte.** El botón va sobre la carta y solo si la
 * tenés: compartir un hueco no es compartir nada. Lo que se manda no es esta
 * pantalla sino `TarjetaCompartir`, que es la misma carta con el nombre del
 * juego y la insignia de Play abajo.
 */

type Props = {
  abierta: { casilla: Casilla; nivel: number; ganada: boolean } | null;
  onCerrar: () => void;
};

export function CartaGrande({ abierta, onCerrar }: Props) {
  const t = useT();
  const idioma = useJuego((e) => e.juego.idioma);
  const { width, height } = useWindowDimensions();
  // Lo más grande que entre dejando un respiro alrededor: la carta abierta es
  // el momento de mirarla, y con márgenes anchos se veía apenas más grande que
  // en la hoja, que es como no haberla abierto.
  const ancho = Math.floor(Math.min(width * 0.92, (height * 0.88) / RATIO));

  const tarjeta = useRef<View>(null);
  const [compartiendo, setCompartiendo] = useState(false);

  async function compartir() {
    if (!abierta) return;
    setCompartiendo(true);
    try {
      // La llave es `criatura-accion`: con eso el archivo que recibe la otra
      // persona se llama, por ejemplo, `Kaurix-gatodebrumavolar.png`.
      await compartirCarta(tarjeta, abierta.casilla.llave, t('album.compartir'));
    } catch {
      // Si la captura o el menú fallan no hay nada que hacer ni nada que
      // contar: no se compartió, y la carta sigue en pantalla intacta.
    } finally {
      setCompartiendo(false);
    }
  }

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
            <View>
              <Carta
                casilla={abierta.casilla}
                nivel={abierta.nivel}
                ganada={abierta.ganada}
                ancho={ancho}
              />

              {abierta.ganada ? (
                // Encima de la carta y no debajo: abajo compite con el borde
                // dorado del arte, y arriba a la derecha es donde ya está el
                // pulgar de quien acaba de abrirla.
                //
                // El toque no tiene que llegar al fondo, que cierra el visor:
                // sin esto, compartir cerraba la carta en el mismo gesto.
                <Pressable
                  style={estilos.compartir}
                  onPress={() => void compartir()}
                  disabled={compartiendo}
                  accessibilityRole="button"
                  accessibilityLabel={t('album.compartir')}
                  hitSlop={10}
                >
                  {compartiendo ? (
                    <ActivityIndicator color="#fff" size="small" />
                  ) : (
                    <Ionicons name="share-social" size={20} color="#fff" />
                  )}
                </Pressable>
              ) : null}
            </View>

            {!abierta.ganada ? (
              <Text style={estilos.falta}>{t('album.noLaTienes')}</Text>
            ) : null}

            {/*
             * Lo que se fotografía. Corrida fuera de la pantalla, pero montada
             * y medida como cualquier otra vista: escondida con `display:
             * none` o con `opacity: 0`, la foto sale en blanco.
             */}
            {abierta.ganada ? (
              <View style={estilos.fueraDePantalla} pointerEvents="none">
                <TarjetaCompartir
                  ref={tarjeta}
                  casilla={abierta.casilla}
                  nivel={abierta.nivel}
                  marca={t('header.logo')}
                  idioma={idioma}
                />
              </View>
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
  /**
   * El disco de compartir, arriba a la derecha de la carta.
   *
   * **El mismo disco que la lupa**, que es el otro botón que se dibuja sobre el
   * arte: negro al 42% con el icono blanco. Ver `estilos.lupa` en `Carta`. Uno
   * oscuro y el otro claro se leían como dos cosas de sistemas distintos, y
   * además el claro se perdía sobre las cartas de fondo claro.
   *
   * Más grande que la lupa, eso sí: la lupa solo avisa y se toca la carta
   * entera, este hay que acertarle.
   */
  compartir: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.42)',
  },
  fueraDePantalla: { position: 'absolute', top: 0, left: -3000 },
});
