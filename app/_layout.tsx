import 'react-native-reanimated';
import React from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import * as SplashScreen from 'expo-splash-screen';
import { AppProvider } from '@/src/context/AppContext';
import { AppGate } from '@/src/components/AppGate';
import { colors } from '@/src/theme/tokens';

SplashScreen.setOptions({ fade: true, duration: 350 });
void SplashScreen.preventAutoHideAsync();

export { ErrorBoundary } from 'expo-router';

export const unstable_settings = {
  initialRouteName: '(tabs)',
};

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: colors.background }}>
      <AppProvider>
        <AppGate />
      </AppProvider>
    </GestureHandlerRootView>
  );
}
