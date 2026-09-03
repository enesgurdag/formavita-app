import React from 'react';
import { StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { colors } from '@/src/theme/tokens';

/**
 * Tam ekran marka zemini — yatay kesit yok.
 * Indigo-violet porselen, köşelerde yumuşak ışık.
 */
export function AppCanvas({ children }: { children: React.ReactNode }) {
  return (
    <View style={styles.root}>
      <LinearGradient
        pointerEvents="none"
        colors={['#E9E5F7', '#F0EEF8', '#EDEAF6']}
        locations={[0, 0.5, 1]}
        start={{ x: 0.15, y: 0 }}
        end={{ x: 0.9, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      <View pointerEvents="none" style={StyleSheet.absoluteFill}>
        <View style={styles.orbTopLeft} />
        <View style={styles.orbTopRight} />
        <View style={styles.orbBottomLeft} />
        <View style={styles.orbBottomRight} />
      </View>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.background,
  },
  orbTopLeft: {
    position: 'absolute',
    top: -160,
    left: -140,
    width: 280,
    height: 280,
    borderRadius: 140,
    backgroundColor: 'rgba(17, 16, 74, 0.05)',
  },
  orbTopRight: {
    position: 'absolute',
    top: -180,
    right: -160,
    width: 300,
    height: 300,
    borderRadius: 150,
    backgroundColor: 'rgba(108, 60, 240, 0.08)',
  },
  orbBottomLeft: {
    position: 'absolute',
    bottom: -160,
    left: -120,
    width: 260,
    height: 260,
    borderRadius: 130,
    backgroundColor: 'rgba(108, 60, 240, 0.06)',
  },
  orbBottomRight: {
    position: 'absolute',
    bottom: -180,
    right: -140,
    width: 300,
    height: 300,
    borderRadius: 150,
    backgroundColor: 'rgba(17, 16, 74, 0.04)',
  },
});
