import { StatusBar } from 'expo-status-bar';
import React, { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { DetectorScreen } from './src/screens/DetectorScreen';
import { HomeScreen } from './src/screens/HomeScreen';
import { SearchScreen } from './src/screens/SearchScreen';
import { colors } from './src/theme';

type Screen = 'home' | 'buscar' | 'detector';

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
        <HomeScreen
          refreshKey={refreshKey}
          onSearch={() => setScreen('buscar')}
          onDetector={() => setScreen('detector')}
        />
      ) : screen === 'detector' ? (
        <DetectorScreen onBack={goHome} />
      ) : (
        <SearchScreen onBack={goHome} onSaved={goHome} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
});
