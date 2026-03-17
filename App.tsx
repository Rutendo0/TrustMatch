import React, { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { enableScreens } from 'react-native-screens';
import { AppNavigator } from './src/navigation/AppNavigator';
import { api } from './src/services/api';

enableScreens(true);

export default function App() {
  // Restore the saved auth token from SecureStore on every app launch.
  // Without this, this.token stays null after a Metro reload and every
  // authenticated request returns 401.
  useEffect(() => {
    api.init();
  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <StatusBar style="auto" />
        <AppNavigator />
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
