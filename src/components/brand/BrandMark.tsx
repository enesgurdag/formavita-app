import React from 'react';
import {
  Image,
  ImageStyle,
  StyleProp,
  StyleSheet,
  Text,
  View,
  ViewStyle,
} from 'react-native';
import { colors, radius, shadows, spacing, typography } from '@/src/theme/tokens';

const iconSource = require('@/assets/formavita/brand/formavita-app-icon-1024.png');
const wordmarkSource = require('@/assets/formavita/brand/formavita-wordmark-transparent.png');

type Size = 'sm' | 'md' | 'lg' | 'hero';

const iconSizes: Record<Size, number> = {
  sm: 40,
  md: 64,
  lg: 96,
  hero: 140,
};

interface BrandIconProps {
  size?: Size;
  style?: StyleProp<ImageStyle>;
}

/** Uygulama ikonu — köşeleri yeniden yuvarlatmayın; iOS maskesini kullanır. */
export function BrandIcon({ size = 'md', style }: BrandIconProps) {
  const dim = iconSizes[size];
  return (
    <Image
      source={iconSource}
      accessibilityLabel="FormaVita ikonu"
      style={[{ width: dim, height: dim, borderRadius: dim * 0.2237 }, style]}
      resizeMode="cover"
    />
  );
}

interface BrandWordmarkProps {
  width?: number;
  style?: StyleProp<ImageStyle>;
}

/** Yatay kelime işareti — Forma (lacivert) + Vita (mor) */
export function BrandWordmark({ width = 200, style }: BrandWordmarkProps) {
  const height = Math.round(width / 3);
  return (
    <Image
      source={wordmarkSource}
      accessibilityLabel="FormaVita"
      style={[{ width, height }, style]}
      resizeMode="contain"
    />
  );
}

interface BrandHorizontalLogoProps {
  width?: number;
  style?: StyleProp<ImageStyle>;
}

/** Sembol + wordmark yatay kilit — gömülü zemin yerine marka yüzeyi */
export function BrandHorizontalLogo({ width = 180, style }: BrandHorizontalLogoProps) {
  const iconDim = Math.round(width * 0.22);
  return (
    <View style={[styles.horizontalChip, { width }, style]}>
      <Image
        source={iconSource}
        accessibilityLabel="FormaVita ikonu"
        style={{ width: iconDim, height: iconDim, borderRadius: iconDim * 0.2237 }}
        resizeMode="cover"
      />
      <Text style={styles.horizontalName} accessibilityLabel="FormaVita">
        <Text style={styles.forma}>Forma</Text>
        <Text style={styles.vita}>Vita</Text>
      </Text>
    </View>
  );
}

interface BrandLockupProps {
  size?: Size;
  showWordmark?: boolean;
  wordmarkWidth?: number;
  style?: StyleProp<ViewStyle>;
  caption?: string;
}

/** İkon + wordmark dikey kilit */
export function BrandLockup({
  size = 'lg',
  showWordmark = true,
  wordmarkWidth = 220,
  style,
  caption,
}: BrandLockupProps) {
  return (
    <View style={[styles.lockup, style]} accessibilityRole="header">
      <BrandIcon size={size} />
      {showWordmark ? (
        <BrandWordmark width={wordmarkWidth} style={styles.wordmark} />
      ) : (
        <Text style={styles.fallbackName}>
          <Text style={styles.forma}>Forma</Text>
          <Text style={styles.vita}>Vita</Text>
        </Text>
      )}
      {caption ? <Text style={styles.caption}>{caption}</Text> : null}
    </View>
  );
}

/** Küçük yatay marka satırı (ekran başlıkları için) */
export function BrandHeaderRow({ style }: { style?: StyleProp<ViewStyle> }) {
  return (
    <View style={[styles.row, style]} accessibilityRole="header">
      <BrandHorizontalLogo width={168} />
    </View>
  );
}

const styles = StyleSheet.create({
  lockup: {
    alignItems: 'center',
  },
  wordmark: {
    marginTop: spacing.md,
  },
  fallbackName: {
    ...typography.title,
    marginTop: spacing.sm,
  },
  forma: {
    color: colors.brand.midnight,
  },
  vita: {
    color: colors.brand.violet,
  },
  caption: {
    ...typography.body,
    color: colors.text.secondary,
    textAlign: 'center',
    marginTop: spacing.sm,
    paddingHorizontal: spacing.lg,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  horizontalChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.brand.paper,
    borderRadius: radius.lg,
    paddingHorizontal: spacing.xs,
    paddingVertical: spacing.xxs,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.soft,
  },
  horizontalName: {
    ...typography.heading,
    fontSize: 20,
    lineHeight: 24,
    letterSpacing: -0.3,
  },
});
