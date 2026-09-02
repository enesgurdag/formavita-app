import React from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { AppProvider, useApp } from '@/src/context/AppContext';
import { LoadingScreen, ErrorScreen } from '@/src/components/ui/LoadingScreen';
import { Button } from '@/src/components/ui/Button';
import { BrandLockup } from '@/src/components/brand/BrandMark';
import { colors, spacing, typography } from '@/src/theme/tokens';
import { StyleSheet, Text, View, Platform } from 'react-native';
import OnboardingScreen from './onboarding';

export { ErrorBoundary } from 'expo-router';

export const unstable_settings = {
  initialRouteName: '(tabs)',
};

function RootNav() {
  const { ready, error, unlocked, settings, unlock, onboardingDone } = useApp();

  if (!ready) return <LoadingScreen message="NotesPlus hazırlanıyor…" />;
  if (error) return <ErrorScreen message={error} />;

  if (!onboardingDone) {
    return <OnboardingScreen />;
  }

  if (settings?.faceIdEnabled && !unlocked) {
    return (
      <View style={styles.lock}>
        <BrandLockup size="lg" wordmarkWidth={200} caption="Devam etmek için Face ID veya cihaz şifresi kullanın." />
        <Button title="Kilidi aç" onPress={() => void unlock()} style={styles.lockBtn} />
      </View>
    );
  }

  return (
    <>
      <StatusBar style="dark" />
      <Stack
        screenOptions={{
          headerTintColor: colors.brand.violet,
          headerTitleStyle: {
            ...typography.heading,
            color: colors.text.primary,
          },
          headerStyle: { backgroundColor: colors.background },
          headerShadowVisible: false,
          headerBackTitle: 'Geri',
          headerBackButtonDisplayMode: 'default',
          contentStyle: { backgroundColor: colors.background },
          ...(Platform.OS === 'ios'
            ? {
                headerLargeTitleShadowVisible: false,
              }
            : {}),
        }}
      >
        <Stack.Screen name="(tabs)" options={{ headerShown: false, title: 'Ana Sayfa' }} />
        <Stack.Screen
          name="onboarding"
          options={{ headerShown: false, animation: 'fade' }}
        />
        <Stack.Screen
          name="people/index"
          options={{
            title: 'Kişiler',
            headerBackTitle: 'Ana Sayfa',
          }}
        />
        <Stack.Screen
          name="people/[id]"
          options={{
            title: 'Kişi detayı',
            headerBackTitle: 'Kişiler',
          }}
        />
        <Stack.Screen
          name="people/form"
          options={{ title: 'Kişi', presentation: 'modal', headerBackTitle: 'Kapat' }}
        />
        <Stack.Screen
          name="packages/form"
          options={{ title: 'Paket', presentation: 'modal', headerBackTitle: 'Kapat' }}
        />
        <Stack.Screen
          name="appointments/form"
          options={{ title: 'Randevu', presentation: 'modal', headerBackTitle: 'Kapat' }}
        />
        <Stack.Screen
          name="notes/form"
          options={{ title: 'Not', presentation: 'modal', headerBackTitle: 'Kapat' }}
        />
        <Stack.Screen
          name="payments/form"
          options={{ title: 'Ödeme', presentation: 'modal', headerBackTitle: 'Kapat' }}
        />
      </Stack>
    </>
  );
}

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <AppProvider>
        <RootNav />
      </AppProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  lock: {
    flex: 1,
    backgroundColor: colors.brand.lilac,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
    gap: spacing.lg,
  },
  lockBtn: {
    minWidth: 200,
    marginTop: spacing.sm,
  },
});
