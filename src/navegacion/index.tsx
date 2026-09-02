import { createNativeStackNavigator } from '@react-navigation/native-stack';
import React from 'react';

import { AlbumScreen } from '../pantallas/Album';
import { AyudaScreen } from '../pantallas/Ayuda';
import { BichoScreen } from '../pantallas/Bicho';
import { BuscarScreen } from '../pantallas/Buscar';
import { ColeccionScreen } from '../pantallas/Coleccion';
import { InventarioScreen } from '../pantallas/Inventario';
import { PendientesScreen } from '../pantallas/Pendientes';
import { CocinaScreen } from '../pantallas/Cocina';
import type { Rutas } from './rutas';

const Stack = createNativeStackNavigator<Rutas>();

export function Navegacion() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false, animation: 'fade' }}>
      <Stack.Screen name="Coleccion" component={ColeccionScreen} />
      <Stack.Screen name="Bicho" component={BichoScreen} />
      <Stack.Screen name="Inventario" component={InventarioScreen} />
      <Stack.Screen name="Cocina" component={CocinaScreen} />
      <Stack.Screen name="Album" component={AlbumScreen} />
      {/* La búsqueda va a pantalla completa: la cámara ocupa todo y el armazón
          taparía justo lo que hay que mirar. */}
      <Stack.Screen name="Buscar" component={BuscarScreen} />
      <Stack.Screen
        name="Pendientes"
        component={PendientesScreen}
        options={{ presentation: 'modal', animation: 'slide_from_bottom' }}
      />
      <Stack.Screen
        name="Ayuda"
        component={AyudaScreen}
        options={{ presentation: 'modal', animation: 'slide_from_bottom' }}
      />
    </Stack.Navigator>
  );
}
