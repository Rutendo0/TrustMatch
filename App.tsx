import React, { useEffect, useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { enableScreens } from 'react-native-screens';
import { AppNavigator } from './src/navigation/AppNavigator';
import { api } from './src/services/api';
import { socketService } from './src/services/socketService';
import { ThemeProvider, useTheme } from './src/context/ThemeContext';

enableScreens(true);

function AppContent() {
  const { isDark } = useTheme();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    // Load token then connect socket
    api.init().finally(async () => {
      setReady(true);
      await socketService.connect();
    });
    return () => { socketService.disconnect(); };
  }, []);

  if (!ready) return null;

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <StatusBar style={isDark ? 'light' : 'dark'} />
        <AppNavigator />
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <AppContent />
    </ThemeProvider>
  );
}
