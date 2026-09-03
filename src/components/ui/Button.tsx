import React from 'react';
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  ViewStyle,
  StyleProp,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { AnimatedPressable } from '@/src/components/ui/AnimatedPressable';
import { colors, radius, spacing, touchTarget, typography } from '@/src/theme/tokens';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'diet' | 'pilates';
type Size = 'md' | 'sm';

interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: Variant;
  size?: Size;
  disabled?: boolean;
  loading?: boolean;
  style?: StyleProp<ViewStyle>;
  accessibilityLabel?: string;
}

const bg: Record<Variant, string> = {
  primary: colors.brand.violet,
  secondary: colors.surface,
  ghost: 'transparent',
  danger: colors.danger.main,
  diet: colors.diet.main,
  pilates: colors.pilates.main,
};

const fg: Record<Variant, string> = {
  primary: colors.text.inverse,
  secondary: colors.text.primary,
  ghost: colors.brand.violet,
  danger: colors.text.inverse,
  diet: colors.text.inverse,
  pilates: colors.text.inverse,
};

export function Button({
  title,
  onPress,
  variant = 'primary',
  size = 'md',
  disabled,
  loading,
  style,
  accessibilityLabel,
}: ButtonProps) {
  return (
    <AnimatedPressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? title}
      disabled={disabled || loading}
      onPress={() => {
        void Haptics.selectionAsync();
        onPress();
      }}
      style={[
        styles.base,
        size === 'sm' && styles.sm,
        {
          backgroundColor: bg[variant],
          opacity: disabled ? 0.4 : 1,
        },
        variant === 'ghost' && styles.ghost,
        variant === 'secondary' && styles.secondary,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={fg[variant]} />
      ) : (
        <Text
          numberOfLines={1}
          adjustsFontSizeToFit
          minimumFontScale={0.85}
          style={[styles.label, size === 'sm' && styles.labelSm, { color: fg[variant] }]}
        >
          {title}
        </Text>
      )}
    </AnimatedPressable>
  );
}

const styles = StyleSheet.create({
  base: {
    minHeight: touchTarget,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sm: {
    minHeight: 40,
    paddingHorizontal: spacing.md,
    borderRadius: radius.sm,
  },
  ghost: {
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.borderStrong,
    backgroundColor: 'rgba(255,255,255,0.72)',
  },
  secondary: {
    borderWidth: 1,
    borderColor: colors.borderStrong,
    backgroundColor: colors.surface,
  },
  label: {
    ...typography.button,
  },
  labelSm: {
    fontSize: 14,
    lineHeight: 18,
  },
});
