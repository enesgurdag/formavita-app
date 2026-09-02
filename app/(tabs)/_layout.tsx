import React from 'react';
import { Tabs } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { Platform, StyleSheet } from 'react-native';
import { colors, typography } from '@/src/theme/tokens';

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: colors.brand.violet,
        tabBarInactiveTintColor: colors.text.muted,
        tabBarLabelStyle: {
          ...typography.small,
          fontSize: 11,
          letterSpacing: 0,
        },
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopColor: colors.border,
          borderTopWidth: StyleSheet.hairlineWidth,
          ...(Platform.OS === 'ios'
            ? {
                shadowColor: '#11104A',
                shadowOffset: { width: 0, height: -2 },
                shadowOpacity: 0.04,
                shadowRadius: 8,
              }
            : {}),
        },
        headerStyle: { backgroundColor: colors.background },
        headerTintColor: colors.brand.midnight,
        headerTitleStyle: {
          ...typography.heading,
          color: colors.text.primary,
        },
        headerShadowVisible: false,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Ana Sayfa',
          headerShown: false,
          tabBarIcon: ({ color }) => (
            <SymbolView name="house.fill" tintColor={color} size={24} type="hierarchical" />
          ),
        }}
      />
      <Tabs.Screen
        name="calendar"
        options={{
          title: 'Takvim',
          tabBarIcon: ({ color }) => (
            <SymbolView name="calendar" tintColor={color} size={24} type="hierarchical" />
          ),
        }}
      />
      <Tabs.Screen
        name="earnings"
        options={{
          title: 'Hakedişim',
          tabBarIcon: ({ color }) => (
            <SymbolView name="creditcard.fill" tintColor={color} size={24} type="hierarchical" />
          ),
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: 'Ayarlar',
          tabBarIcon: ({ color }) => (
            <SymbolView name="gearshape.fill" tintColor={color} size={24} type="hierarchical" />
          ),
        }}
      />
    </Tabs>
  );
}
