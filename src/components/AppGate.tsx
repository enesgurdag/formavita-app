import React, { useCallback, useEffect, useState } from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withDelay, withTiming } from 'react-native-reanimated';
import { useApp } from '@/src/context/AppContext';
import { LoadingScreen, ErrorScreen } from '@/src/components/ui/LoadingScreen';
import { Button } from '@/src/components/ui/Button';
import { BrandLockup } from '@/src/components/brand/BrandMark';
import { colors, spacing, typography } from '@/src/theme/tokens';
import OnboardingScreen from '../../app/onboarding';
import { motion } from '@/src/theme/motion';

export function AppGate() {
  const {
    ready,
    error,
    unlocked,
    settings,
    unlock,
    onboardingDone,
    completeOnboarding,
    setOnboardingTransitioning,
  } = useApp();

  const [onboardingMounted, setOnboardingMounted] = useState(!onboardingDone);
  const overlayOpacity = useSharedValue(onboardingDone ? 0 : 1);
  const mainOpacity = useSharedValue(onboardingDone ? 1 : 0);
  const mainTranslateY = useSharedValue(onboardingDone ? 0 : motion.appEnterSlidePx);

  useEffect(() => {
    if (!onboardingDone) {
      setOnboardingMounted(true);
      overlayOpacity.value = 1;
      mainOpacity.value = 0;
      mainTranslateY.value = motion.appEnterSlidePx;
    }
  }, [onboardingDone, mainOpacity, mainTranslateY, overlayOpacity]);

  const handleCompleteOnboarding = useCallback(async () => {
    setOnboardingTransitioning(true);
    mainOpacity.value = 0;
    mainTranslateY.value = motion.appEnterSlidePx;
    await completeOnboarding();

    overlayOpacity.value = withTiming(0, {
      duration: motion.appEnterMs,
      easing: Easing.out(Easing.cubic),
    });
    mainOpacity.value = withDelay(
      motion.appEnterDelayMs,
      withTiming(1, { duration: motion.appEnterMs, easing: Easing.out(Easing.cubic) }),
    );
    mainTranslateY.value = withDelay(
      motion.appEnterDelayMs,
      withTiming(0, { duration: motion.appEnterMs, easing: Easing.out(Easing.cubic) }),
    );

    await new Promise((resolve) =>
      setTimeout(resolve, motion.appEnterMs + motion.appEnterDelayMs + 48),
    );
    setOnboardingMounted(false);
    setOnboardingTransitioning(false);
  }, [
    completeOnboarding,
    mainOpacity,
    mainTranslateY,
    overlayOpacity,
    setOnboardingTransitioning,
  ]);

  const overlayStyle = useAnimatedStyle(() => ({
    opacity: overlayOpacity.value,
  }));

  const mainStyle = useAnimatedStyle(() => ({
    opacity: mainOpacity.value,
    transform: [{ translateY: mainTranslateY.value }],
  }));

  if (!ready) return <LoadingScreen message="FormaVita hazırlanıyor…" />;
  if (error) return <ErrorScreen message={error} />;

  const showLock = onboardingDone && settings?.faceIdEnabled && !unlocked;

  return (
    <View style={styles.root}>
      <StatusBar style="dark" />
      <Animated.View style={[styles.main, mainStyle]}>
        {showLock ? (
          <View style={styles.lock}>
            <BrandLockup
              size="lg"
              wordmarkWidth={200}
              caption="Devam etmek için Face ID veya cihaz şifresi kullanın."
            />
            <Button title="Kilidi aç" onPress={() => void unlock()} style={styles.lockBtn} />
          </View>
        ) : onboardingDone ? (
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
              animation: 'slide_from_right',
              ...(Platform.OS === 'ios'
                ? {
                    headerLargeTitleShadowVisible: false,
                  }
                : {}),
            }}
          >
            <Stack.Screen name="(tabs)" options={{ headerShown: false, title: 'Ana Sayfa', animation: 'none' }} />
            <Stack.Screen name="onboarding" options={{ headerShown: false, animation: 'fade' }} />
            <Stack.Screen
              name="people/index"
              options={{ title: 'Kişiler', headerBackTitle: 'Ana Sayfa' }}
            />
            <Stack.Screen
              name="people/[id]"
              options={{ title: 'Kişi detayı', headerBackTitle: 'Kişiler' }}
            />
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
        ) : null}
      </Animated.View>

      {onboardingMounted ? (
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
