import { StatusBar } from 'expo-status-bar';
import React, { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { HomeScreen } from './src/screens/HomeScreen';
import { SearchScreen } from './src/screens/SearchScreen';
import { colors } from './src/theme';

type Screen = 'home' | 'buscar';

export default function App() {
  const [screen, setScreen] = useState<Screen>('home');
  const [refreshKey, setRefreshKey] = useState(0);

  function goHome() {
    setRefreshKey((n) => n + 1);
    setScreen('home');
  }

  return (
    // Sin SafeAreaView a propósito: la búsqueda va a pantalla completa y el home
    // ya reserva aire arriba. Evita un componente deprecado y una librería
    // nativa extra.
    <View style={styles.root}>
      <StatusBar style="light" />

      {screen === 'home' ? (
        <HomeScreen refreshKey={refreshKey} onSearch={() => setScreen('buscar')} />
      ) : (
        <SearchScreen onBack={goHome} onSaved={goHome} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
});
