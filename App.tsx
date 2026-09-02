import { DarkTheme, NavigationContainer, type Theme } from '@react-navigation/native';
import { StatusBar } from 'expo-status-bar';
import * as SystemUI from 'expo-system-ui';
import React, { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { useJuego } from './src/juego/store';
import { Navegacion } from './src/navegacion';
import { colors } from './src/theme';

/**
 * En Expo 57 (edge-to-edge) la barra de navegación de Android es transparente.
 * El velo blanco que Android le pone a la barra de tres botones se saca **solo**
 * con el plugin `expo-navigation-bar` —`enforceContrast: false` y
 * `style: "light"` en `app.json`, iconos claros porque el fondo de atrás es
 * oscuro—, que actúa al compilar. El componente de runtime no se usa: no puede
 * desactivar el velo y lo empeora.
 *
 * Este fondo oscuro es lo que queda detrás de la barra transparente.
 */
SystemUI.setBackgroundColorAsync(colors.bg).catch(() => {});

/**
 * El tema de la navegación.
 *
 * Sin esto, react-navigation pinta de blanco el fondo de cada pantalla mientras
 * hace la transición, y se ve un destello claro entre pantalla y pantalla.
 */
const tema: Theme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    background: colors.bg,
    card: colors.surface,
    text: colors.text,
    border: colors.border,
    primary: colors.accent,
  },
};

export default function App() {
  const iniciar = useJuego((e) => e.iniciar);
  const cargado = useJuego((e) => e.cargado);

  // Se lee el disco una sola vez, al arrancar. Es también el momento en que se
  // cobra el tiempo que pasó con la app cerrada.
  useEffect(() => {
    void iniciar();
  }, [iniciar]);

  return (
    <SafeAreaProvider>
      <View style={estilos.raiz}>
        <StatusBar style="light" />
        {/* Hasta que el guardado no está leído no se dibuja nada: mostrar la
            colección vacía y llenarla un cuadro después se ve como si se
            hubiera perdido el progreso. */}
        {cargado ? (
          <NavigationContainer theme={tema}>
            <Navegacion />
          </NavigationContainer>
        ) : null}
      </View>
    </SafeAreaProvider>
  );
}

const estilos = StyleSheet.create({
  raiz: { flex: 1, backgroundColor: colors.bg },
});
