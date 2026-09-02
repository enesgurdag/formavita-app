import React from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { BrandIcon, BrandWordmark } from '@/src/components/brand/BrandMark';
import { colors, spacing, typography } from '@/src/theme/tokens';

export function LoadingScreen({ message = 'Yükleniyor…' }: { message?: string }) {
  return (
    <View style={styles.wrap} accessibilityLabel={message}>
      <BrandIcon size="lg" />
      <BrandWordmark width={160} style={styles.wordmark} />
      <ActivityIndicator size="small" color={colors.brand.violet} style={styles.spinner} />
      <Text style={styles.text}>{message}</Text>
    </View>
  );
}

export function ErrorScreen({ message }: { message: string }) {
  return (
    <View style={styles.wrap}>
      <BrandIcon size="md" />
      <Text style={styles.errorTitle}>Bir sorun oluştu</Text>
      <Text style={styles.text}>{message}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.brand.lilac,
    padding: spacing.lg,
  },
  wordmark: {
    marginTop: spacing.md,
  },
  spinner: {
    marginTop: spacing.lg,
  },
  text: {
    ...typography.body,
    color: colors.text.secondary,
    marginTop: spacing.sm,
    textAlign: 'center',
  },
  errorTitle: {
    ...typography.heading,
    color: colors.danger.main,
    marginTop: spacing.md,
  },
});
