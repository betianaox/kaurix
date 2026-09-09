import {
  DefaultTheme,
  NavigationContainer,
  useNavigationContainerRef,
  type Theme,
} from '@react-navigation/native';
import { NavigationBar } from 'expo-navigation-bar';
import { StatusBar } from 'expo-status-bar';
import * as SystemUI from 'expo-system-ui';
import React, { useEffect } from 'react';
import { AppState, StyleSheet, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { useJuego } from './src/juego/store';
import { Navegacion } from './src/navegacion';
import type { Rutas } from './src/navegacion/rutas';
import { Bienvenida } from './src/shell/Bienvenida';
import { colors } from './src/theme';

/**
 * En Expo 57 (edge-to-edge) la barra de navegación de Android es transparente.
 * El velo blanco que Android le pone a la barra de tres botones se saca **solo**
 * con `enforceContrast: false` en el plugin `expo-navigation-bar` de
 * `app.json`, que actúa al compilar.
 *
 * El **color de los botones** es otra cosa y sí se puede en tiempo de
 * ejecución: el `<NavigationBar style="dark" />` de más abajo los pone
 * oscuros, que es lo que hace falta ahora que el fondo de atrás es claro. En
 * `app.json` está el mismo valor, pero ese solo entra al recompilar y el
 * componente lo arregla ya.
 *
 * Este fondo claro es lo que queda detrás de la barra transparente.
 */
SystemUI.setBackgroundColorAsync(colors.bg).catch(() => {});

/**
 * El tema de la navegación.
 *
 * Sin esto, react-navigation pinta de blanco el fondo de cada pantalla mientras
 * hace la transición, y se ve un destello claro entre pantalla y pantalla.
 */
const tema: Theme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
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
  const saludado = useJuego((e) => e.juego.saludado);
  const saludar = useJuego((e) => e.saludar);

  /**
   * La referencia al navegador, solo para el saludo.
   *
   * El diálogo vive **afuera** del navegador —tiene que poder aparecer encima de
   * cualquier pantalla y antes de que se elija ninguna—, así que no puede usar
   * `useNavigation`. La referencia es la manera de que su botón de ayuda lleve
   * a algún lado.
   */
  const navegador = useNavigationContainerRef<Rutas>();

  // Se lee el disco una sola vez, al arrancar. Es también el momento en que se
  // cobra el tiempo que pasó con la app cerrada.
  useEffect(() => {
    void iniciar();
  }, [iniciar]);

  /**
   * Los tres botones de Android, oscuros. Y **cada vez que se vuelve a la app**.
   *
   * El `<NavigationBar style="dark" />` de abajo los pone así al arrancar, pero
   * Android se queda con lo suyo cuando la app pasa a segundo plano y vuelve
   * —salir a otra app, apagar y prender la pantalla, volver de la cámara— y los
   * deja blancos otra vez. Blancos, sobre el papel claro que asoma detrás de la
   * barra transparente, no se ven.
   *
   * Por eso el componente no alcanza y hace falta volver a pedirlo en cada
   * regreso a primer plano.
   */
  useEffect(() => {
    const poner = () => NavigationBar.setStyle('dark');
    poner();
    const sub = AppState.addEventListener('change', (estado) => {
      if (estado === 'active') poner();
    });
    return () => sub.remove();
  }, []);

  return (
    <SafeAreaProvider>
      <View style={estilos.raiz}>
        <StatusBar style="dark" />
        {/* Los tres botones de Android, oscuros: la barra es transparente y
            atrás está el papel. El efecto de arriba los repone al volver. */}
        <NavigationBar style="dark" />
        {/* Hasta que el guardado no está leído no se dibuja nada: mostrar la
            colección vacía y llenarla un cuadro después se ve como si se
            hubiera perdido el progreso. */}
        {cargado ? (
          <NavigationContainer theme={tema} ref={navegador}>
            <Navegacion />

            {/* EL SALUDO DE LA PRIMERA VEZ.

                Va acá y no adentro de una pantalla: no es de la colección ni de
                ninguna otra, es de la app. Y se dibuja después del navegador
                para quedar por encima de lo que haya.

                Las dos salidas lo dan por visto. La de la ayuda además abre la
                ayuda, que es lo único que hace falta saber para arrancar. */}
            <Bienvenida
              visible={!saludado}
              onCerrar={saludar}
              onAyuda={() => {
                saludar();
                navegador.navigate('Ayuda');
              }}
            />
          </NavigationContainer>
        ) : null}
      </View>
    </SafeAreaProvider>
  );
}

const estilos = StyleSheet.create({
  raiz: { flex: 1, backgroundColor: colors.bg },
});
