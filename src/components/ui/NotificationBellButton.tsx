import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { SymbolView } from 'expo-symbols';
import { AnimatedPressable } from '@/src/components/ui/AnimatedPressable';
import { colors, radius, typography } from '@/src/theme/tokens';

interface NotificationBellButtonProps {
  count: number;
  onPress: () => void;
}

export function NotificationBellButton({ count, onPress }: NotificationBellButtonProps) {
  const showBadge = count > 0;
  const label = showBadge ? `${count} okunmamış bildirim` : 'Bildirimler';

  return (
    <AnimatedPressable
      onPress={onPress}
      style={styles.btn}
      accessibilityRole="button"
      accessibilityLabel={label}
    >
      <SymbolView name="bell.fill" tintColor={colors.brand.violet} size={22} type="hierarchical" />
      {showBadge ? (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{count > 99 ? '99+' : String(count)}</Text>
        </View>
      ) : null}
    </AnimatedPressable>
  );
}

const styles = StyleSheet.create({
  btn: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badge: {
    position: 'absolute',
    top: 4,
    right: 2,
    minWidth: 18,
    height: 18,
    borderRadius: radius.full,
    backgroundColor: colors.danger.main,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
    borderWidth: 2,
    borderColor: colors.background,
  },
  badgeText: {
    ...typography.small,
    fontSize: 10,
    lineHeight: 12,
    color: colors.surface,
    fontWeight: '700',
    letterSpacing: 0,
    textTransform: 'none',
  },
});
