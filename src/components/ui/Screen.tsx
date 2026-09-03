import React, { useRef } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleProp,
  StyleSheet,
  View,
  ViewStyle,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { FadeInView } from '@/src/components/ui/FadeInView';
import { useApp } from '@/src/context/AppContext';
import { colors, spacing } from '@/src/theme/tokens';

interface ScreenProps {
  children: React.ReactNode;
  scroll?: boolean;
  style?: StyleProp<ViewStyle>;
  padded?: boolean;
  /** Modal ekranlarda giriş animasyonunu kapatır */
  fadeIn?: boolean;
}

export function Screen({
  children,
  scroll = true,
  style,
  padded = true,
  fadeIn = true,
}: ScreenProps) {
  const { onboardingTransitioning } = useApp();
  const skipFadeInRef = useRef(onboardingTransitioning);
  const fadeWrapStyle = scroll ? undefined : styles.flex;
  const contentBody =
    fadeIn && !skipFadeInRef.current ? (
      <FadeInView style={fadeWrapStyle}>{children}</FadeInView>
    ) : (
      children
    );

  const content = scroll ? (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={[padded && styles.pad, style]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {contentBody}
      </ScrollView>
    </KeyboardAvoidingView>
  ) : (
    <View style={[styles.flex, padded && styles.pad, style]}>{contentBody}</View>
  );

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      {content}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.background,
  },
  flex: { flex: 1 },
  pad: {
    padding: spacing.md,
    paddingBottom: spacing.xxl,
  },
});
