import React from 'react';
import {
  StyleProp,
  StyleSheet,
  Text,
  TextInput,
  TextInputProps,
  View,
  ViewStyle,
} from 'react-native';
import { colors, radius, spacing, touchTarget, typography } from '@/src/theme/tokens';

interface InputProps extends TextInputProps {
  label: string;
  error?: string;
  containerStyle?: StyleProp<ViewStyle>;
}

export function Input({ label, error, containerStyle, style, ...rest }: InputProps) {
  return (
    <View style={[styles.wrap, containerStyle]}>
      <Text style={styles.label} accessibilityRole="text">
        {label}
      </Text>
      <TextInput
        placeholderTextColor={colors.text.muted}
        style={[styles.input, error ? styles.inputError : null, style]}
        {...rest}
      />
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginBottom: spacing.md,
  },
  label: {
    ...typography.captionMedium,
    color: colors.text.secondary,
    marginBottom: spacing.xs,
  },
  input: {
    minHeight: touchTarget,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    ...typography.body,
    color: colors.text.primary,
  },
  inputError: {
    borderColor: colors.danger.main,
    backgroundColor: colors.danger.soft,
  },
  error: {
    ...typography.small,
    color: colors.danger.main,
    marginTop: spacing.xxs,
  },
});
