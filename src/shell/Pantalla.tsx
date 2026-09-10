import { CommonActions, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import React from 'react';
import { StyleSheet, View } from 'react-native';

import { colorDeNivel } from '../juego/datos';
import { avisosDe } from '../juego/avisos';
import { useJuego } from '../juego/store';
import type { Rutas } from '../navegacion/rutas';
import { colors } from '../theme';
import { Footer, type Seccion } from './Footer';
import { Header } from './Header';

/**
 * El marco común: header arriba, footer abajo, y lo que sea en el medio.
 *
 * Está acá y no repetido en cada pantalla para que el color de la vuelta, el
 * número de pendientes y la sección abierta se lean de un solo lugar. Son
 * cosas que tienen que decir lo mismo en todas las pantallas y que es muy
 * fácil que se desincronicen si cada una las arma por su cuenta.
 */

type Props = {
  titulo?: string;
  /** Muestra el logo en lugar del título. Solo la colección lo usa. */
  marca?: boolean;
  /** Cuál de las secciones del footer está abierta, para marcarla. */
  seccion?: Seccion | null;
  /**
   * Una hoja que se abre **encima** de lo que estabas haciendo: la ayuda, los
   * avisos, la ficha de un bicho.
   *
   * Ahí va la X y no va la barra de abajo. No son lugares donde se vive: se
   * abren, se hace algo y se cierran para volver a lo de antes. Las secciones
   * son las cuatro de la barra, y ahí el botón de la derecha es siempre el
   * `?`: la ayuda tiene que estar disponible desde donde sea que estés.
   *
   * Las dos cosas van juntas a propósito. Una hoja con la X **y** con la barra
   * abajo dice dos cosas a la vez: "salí de acá" y "esto es una sección más".
   */
  encima?: boolean;
  children: React.ReactNode;
};

/**
 * A qué pantalla lleva cada botón de la barra de abajo.
 *
 * Los nombres van literales y no como `keyof Rutas`: la navegación necesita
 * saber que ninguna de estas cuatro recibe parámetros, y con el tipo ancho no
 * puede.
 */
const DESTINO: Record<Seccion, 'Coleccion' | 'Inventario' | 'Cocina' | 'Album'> = {
  coleccion: 'Coleccion',
  inventario: 'Inventario',
  cocina: 'Cocina',
  album: 'Album',
};

export function Pantalla({ titulo, marca, seccion = null, encima = false, children }: Props) {
  /**
   * Cuántas cosas hay para hacer, para el globo de la campana.
   *
   * Se lee acá y no en cada pantalla porque el armazón es el mismo en todas: el
   * aviso tiene que verse desde donde sea que estés, igual que la ayuda.
   */
  const nav = useNavigation<NativeStackNavigationProp<Rutas>>();
  const juego = useJuego((e) => e.juego);
  const pendientes = avisosDe(juego);
  const tinte = colorDeNivel(juego.nivel);

  return (
    <View style={estilos.raiz}>
      <Header
        titulo={titulo}
        marca={marca}
        accion={encima ? 'cerrar' : 'ayuda'}
        onAccion={() => (encima ? cerrar(nav) : nav.navigate('Ayuda'))}
        // Cuántos hay lo decide `avisos.ts`, que es el que sabe mirar a la vez
        // el camino de los días y el álbum. Cuando haya más avisos —un bicho
        // listo, una receta que ya se puede armar— se suman allá y acá no hay
        // que tocar nada.
        pendientes={pendientes}
        onPendientes={() => nav.navigate('Pendientes')}
        // En una hoja que se abre encima, la única acción del header es salir.
        avisos={!encima}
      />

      <View style={estilos.cuerpo}>{children}</View>

      {encima ? null : (
        <Footer
          activa={seccion}
          onSeccion={(s) => irASeccion(nav, DESTINO[s])}
          onBuscar={() => nav.navigate('Buscar')}
          tinte={tinte}
        />
      )}
    </View>
  );
}

/**
 * Cambiar de sección reemplaza, no apila.
 *
 * Con `navigate` a secas, ir de bichos a bolso a álbum deja las tres una
 * encima de la otra y el botón de atrás las va destapando de a una. No es lo
 * que nadie espera de una barra de secciones: ahí se cambia de lugar, no se
 * entra más adentro.
 *
 * Se reconstruye la pila entera, con la colección siempre abajo. Así queda una
 * sola sección viva y atrás vuelve a la colección en vez de cerrar la app.
 */
function irASeccion(nav: NativeStackNavigationProp<Rutas>, destino: keyof Rutas) {
  nav.dispatch(
    CommonActions.reset(
      destino === 'Coleccion'
        ? { index: 0, routes: [{ name: 'Coleccion' }] }
        : { index: 1, routes: [{ name: 'Coleccion' }, { name: destino }] }
    )
  );
}

/**
 * Cerrar siempre lleva a algún lado.
 *
 * Se puede llegar a la ayuda sin pasar por la casa —desde un aviso, por
 * ejemplo— y ahí no hay atrás. Cuando no lo hay, la X va a la colección, que es
 * de donde se sale a todo lo demás.
 */
function cerrar(nav: NativeStackNavigationProp<Rutas>) {
  if (nav.canGoBack()) nav.goBack();
  else irASeccion(nav, 'Coleccion');
}

const estilos = StyleSheet.create({
  raiz: { flex: 1, backgroundColor: colors.bg },
  cuerpo: { flex: 1 },
});
