import React, { useCallback, useEffect } from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { useApp } from '@/src/context/AppContext';
import { ErrorScreen } from '@/src/components/ui/LoadingScreen';
import { Button } from '@/src/components/ui/Button';
import { BrandLockup } from '@/src/components/brand/BrandMark';
import { colors, spacing, typography } from '@/src/theme/tokens';
import OnboardingScreen from '../../app/onboarding';
import { motion } from '@/src/theme/motion';

const stackScreenOptions = {
  headerTintColor: colors.brand.violet,
  headerTitleStyle: {
    ...typography.heading,
    color: colors.text.primary,
  },
  headerStyle: { backgroundColor: colors.background },
  headerShadowVisible: false,
  headerBackTitle: 'Geri',
  headerBackButtonDisplayMode: 'default' as const,
  contentStyle: { backgroundColor: colors.background },
  animation: 'slide_from_right' as const,
  ...(Platform.OS === 'ios'
    ? {
        headerLargeTitleShadowVisible: false,
      }
    : {}),
};

function AppStack() {
  return (
    <Stack screenOptions={stackScreenOptions}>
      <Stack.Screen name="(tabs)" options={{ headerShown: false, title: 'Ana Sayfa', animation: 'none' }} />
      <Stack.Screen name="onboarding" options={{ headerShown: false, animation: 'fade' }} />
      <Stack.Screen name="people/index" options={{ title: 'Kişiler', headerBackTitle: 'Ana Sayfa' }} />
      <Stack.Screen name="people/[id]" options={{ title: 'Kişi detayı', headerBackTitle: 'Kişiler' }} />
      <Stack.Screen
        name="people/form"
        options={{
          title: 'Kişi',
          presentation: 'modal',
          animation: 'slide_from_bottom',
          headerBackTitle: 'Kapat',
        }}
      />
      <Stack.Screen
        name="packages/form"
        options={{
          title: 'Paket',
          presentation: 'modal',
          animation: 'slide_from_bottom',
          headerBackTitle: 'Kapat',
        }}
      />
      <Stack.Screen
        name="appointments/form"
        options={{
          title: 'Randevu',
          presentation: 'modal',
          animation: 'slide_from_bottom',
          headerBackTitle: 'Kapat',
        }}
      />
      <Stack.Screen
        name="notes/form"
        options={{
          title: 'Not',
          presentation: 'modal',
          animation: 'slide_from_bottom',
          headerBackTitle: 'Kapat',
        }}
      />
      <Stack.Screen
        name="payments/form"
        options={{
          title: 'Ödeme',
          presentation: 'modal',
          animation: 'slide_from_bottom',
          headerBackTitle: 'Kapat',
        }}
      />
      <Stack.Screen
        name="notifications/index"
        options={{ title: 'Bildirimler', headerBackTitle: 'Ana Sayfa' }}
      />
    </Stack>
  );
}

export function AppGate() {
  const {
    ready,
    error,
    unlocked,
    settings,
    unlock,
    onboardingDone,
    onboardingTransitioning,
    completeOnboarding,
    setOnboardingTransitioning,
  } = useApp();

  const overlayOpacity = useSharedValue(0);
  const showMainApp = ready && (onboardingDone || onboardingTransitioning);
  const showOnboardingOverlay = ready && (!onboardingDone || onboardingTransitioning);

  useEffect(() => {
    if (!ready) return;
    void SplashScreen.hideAsync();
  }, [ready]);

  useEffect(() => {
    if (!ready) return;
    overlayOpacity.value = showOnboardingOverlay && !onboardingTransitioning ? 1 : overlayOpacity.value;
    if (onboardingDone && !onboardingTransitioning) {
      overlayOpacity.value = 0;
    }
  }, [ready, showOnboardingOverlay, onboardingDone, onboardingTransitioning, overlayOpacity]);

  const handleCompleteOnboarding = useCallback(async () => {
    setOnboardingTransitioning(true);
    await completeOnboarding();

    overlayOpacity.value = withTiming(0, {
      duration: motion.appEnterMs,
      easing: Easing.out(Easing.cubic),
    });

    await new Promise((resolve) => setTimeout(resolve, motion.appEnterMs + 48));
    setOnboardingTransitioning(false);
  }, [completeOnboarding, overlayOpacity, setOnboardingTransitioning]);

  const overlayStyle = useAnimatedStyle(() => ({
    opacity: overlayOpacity.value,
  }));

  if (!ready) return null;
  if (error) return <ErrorScreen message={error} />;

  const showLock = onboardingDone && settings?.faceIdEnabled && !unlocked;

  return (
    <View style={styles.root}>
      <StatusBar style="dark" />
      {showMainApp ? (
        <View style={styles.main}>
          {showLock ? (
            <View style={styles.lock}>
              <BrandLockup
                size="lg"
                wordmarkWidth={200}
                caption="Devam etmek için Face ID veya cihaz şifresi kullanın."
              />
              <Button title="Kilidi aç" onPress={() => void unlock()} style={styles.lockBtn} />
            </View>
          ) : (
            <AppStack />
          )}
        </View>
      ) : null}

      {showOnboardingOverlay ? (
        <Animated.View style={[styles.overlay, overlayStyle]}>
          <OnboardingScreen onComplete={handleCompleteOnboarding} />
        </Animated.View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.background,
  },
  main: {
    flex: 1,
  },
  overlay: {
    ...StyleSheet.absoluteFill,
    zIndex: 10,
  },
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
