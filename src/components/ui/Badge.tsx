import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors, radius, spacing, typography } from '@/src/theme/tokens';

type Tone = 'neutral' | 'diet' | 'pilates' | 'warning' | 'success' | 'danger';

interface BadgeProps {
  label: string;
  tone?: Tone;
}

const tones: Record<Tone, { bg: string; fg: string }> = {
  neutral: { bg: colors.surfaceMuted, fg: colors.text.secondary },
  diet: { bg: colors.diet.soft, fg: colors.diet.main },
  pilates: { bg: colors.pilates.soft, fg: colors.pilates.main },
  warning: { bg: colors.warning.soft, fg: colors.warning.main },
  success: { bg: '#D1FAE5', fg: colors.text.success },
  danger: { bg: colors.danger.soft, fg: colors.danger.main },
};

export function Badge({ label, tone = 'neutral' }: BadgeProps) {
  const t = tones[tone];
  return (
    <View style={[styles.badge, { backgroundColor: t.bg }]} accessibilityRole="text">
      <Text style={[styles.text, { color: t.fg }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 5,
    borderRadius: radius.full,
    alignSelf: 'flex-start',
  },
  text: {
    ...typography.small,
    letterSpacing: 0.2,
  },
});
