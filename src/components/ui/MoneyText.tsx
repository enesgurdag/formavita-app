import React from 'react';
import { StyleProp, StyleSheet, Text, TextStyle } from 'react-native';
import { formatMoneyTRY } from '@/src/utils/money';
import { colors, typography } from '@/src/theme/tokens';

interface MoneyTextProps {
  cents: number;
  style?: StyleProp<TextStyle>;
  size?: 'body' | 'money' | 'caption';
}

export function MoneyText({ cents, style, size = 'money' }: MoneyTextProps) {
  const base =
    size === 'caption' ? typography.captionMedium : size === 'body' ? typography.bodyMedium : typography.money;
  return (
    <Text
      accessibilityLabel={formatMoneyTRY(cents)}
      style={[base, styles.text, style]}
    >
      {formatMoneyTRY(cents)}
    </Text>
  );
}

const styles = StyleSheet.create({
  text: {
    color: colors.text.primary,
    fontVariant: ['tabular-nums'],
  },
});
