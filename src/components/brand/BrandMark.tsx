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
import { colors, spacing, typography } from '@/src/theme/tokens';

const iconSource = require('@/assets/brand/notesplus-app-icon-1024.png');
const wordmarkSource = require('@/assets/brand/notesplus-wordmark.png');

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
      accessibilityLabel="NotesPlus ikonu"
      style={[{ width: dim, height: dim, borderRadius: dim * 0.2237 }, style]}
      resizeMode="cover"
    />
  );
}

interface BrandWordmarkProps {
  width?: number;
  style?: StyleProp<ImageStyle>;
}

/** Yatay kelime işareti — Notes (lacivert) + Plus (mor) */
export function BrandWordmark({ width = 200, style }: BrandWordmarkProps) {
  // Kaynak yaklaşık 3.2:1 oranında
  const height = Math.round(width / 3.2);
  return (
    <Image
      source={wordmarkSource}
      accessibilityLabel="NotesPlus"
      style={[{ width, height }, style]}
      resizeMode="contain"
    />
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
          <Text style={styles.notes}>Notes</Text>
          <Text style={styles.plus}>Plus</Text>
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
      <BrandIcon size="sm" />
      <BrandWordmark width={148} />
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
  notes: {
    color: colors.brand.midnight,
  },
  plus: {
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
    gap: spacing.sm,
  },
});
