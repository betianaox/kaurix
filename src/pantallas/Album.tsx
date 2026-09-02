import React, { useState } from 'react';
import { LayoutChangeEvent, StyleSheet, Text, View } from 'react-native';

import { CartaGrande } from '../album/CartaGrande';
import type { Casilla } from '../album/casillas';
import { Hoja } from '../album/Hoja';
import { Libro } from '../album/Libro';
import { COLOR_NIVEL, NIVELES } from '../juego/datos';
import { useJuego } from '../juego/store';
import { useT } from '../i18n';
import { Pantalla } from '../shell/Pantalla';
import { colors, spacing } from '../theme';

/**
 * El álbum de figuritas.
 *
 * Ocho hojas, una por vuelta, y nueve cartas en cada una: los ocho bichos
 * alrededor y la legendaria en el centro. Se hojea arrastrando.
 *
 * Arranca vacío y se muestra entero desde el primer día. Ver los setenta y dos
 * huecos es lo que da ganas de llenarlos; un álbum que va apareciendo a medida
 * que se completa no le dice a nadie cuánto falta.
 */

export function AlbumScreen() {
  const juego = useJuego((e) => e.juego);

  // Abre en la vuelta en curso, no en la primera: es donde está pasando algo.
  const [indice, setIndice] = useState(() => Math.min(NIVELES, juego.nivel) - 1);
  const [abierta, setAbierta] = useState<{
    casilla: Casilla;
    nivel: number;
    ganada: boolean;
  } | null>(null);

  const t = useT();

  const [caja, setCaja] = useState({ ancho: 0, alto: 0 });
  const medir = (e: LayoutChangeEvent) =>
    setCaja({ ancho: e.nativeEvent.layout.width, alto: e.nativeEvent.layout.height });

  return (
    <Pantalla titulo={t('album.titulo')} seccion="album">
      <View style={estilos.hoja}>
        <View style={estilos.libro} onLayout={medir}>
          {caja.ancho > 0 ? (
            <Libro
              total={NIVELES}
              indice={indice}
              onCambio={setIndice}
              ancho={caja.ancho}
              alto={caja.alto}
              hoja={(i) => (
                <Hoja
                  nivel={i + 1}
                  ganadas={juego.cartas}
                  ancho={caja.ancho}
                  alto={caja.alto}
                  onCarta={(casilla, ganada) => setAbierta({ casilla, nivel: i + 1, ganada })}
                />
              )}
            />
          ) : null}
        </View>

        {/* En qué hoja estás, con el color de cada vuelta. El mismo lenguaje
            que los puntos de la colección: se leen igual en los dos lados. */}
        <View style={estilos.puntos}>
          {COLOR_NIVEL.map((color, i) => (
            <View
              key={i}
              style={[
                estilos.punto,
                { backgroundColor: color },
                i === indice && estilos.puntoActual,
                i !== indice && { opacity: 0.3 },
              ]}
            />
          ))}
        </View>

      </View>

      <CartaGrande abierta={abierta} onCerrar={() => setAbierta(null)} />
    </Pantalla>
  );
}

const estilos = StyleSheet.create({
  hoja: {
    flex: 1,
    paddingHorizontal: spacing.sm,
    paddingTop: spacing.sm,
    // El botón de buscar sobresale por encima de la barra de abajo: sin este
    // aire, los puntos de vuelta le quedan debajo y se cortan.
    paddingBottom: 30,
    gap: spacing.sm,
  },
  libro: { flex: 1 },

  puntos: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 9,
    height: 16,
  },
  punto: { width: 8, height: 8, borderRadius: 4 },
  puntoActual: {
    width: 13,
    height: 13,
    borderRadius: 7,
    borderWidth: 2,
    borderColor: colors.text,
  },

});
