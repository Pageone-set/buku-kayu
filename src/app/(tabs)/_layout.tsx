import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import React from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLORS } from '../../theme/tokens';

export default function TabsLayout() {
  const insets = useSafeAreaInsets();
  const bottomPad = Math.max(insets.bottom, 8);

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: COLORS.amber,
        tabBarInactiveTintColor: COLORS.textMuted,
        tabBarStyle: {
          height: 62 + bottomPad,
          paddingBottom: bottomPad,
          paddingTop: 6,
          backgroundColor: COLORS.surface,
          borderTopColor: COLORS.border,
          borderTopWidth: 1,
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '700',
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Beranda',
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="home" size={size + 2} color={color as string} />
          ),
        }}
      />
      <Tabs.Screen
        name="sales"
        options={{
          title: 'Jual Kayu',
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons
              name="receipt-text-outline"
              size={size + 2}
              color={color as string}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="orders"
        options={{
          title: 'Orderan',
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons
              name="hammer-wrench"
              size={size + 2}
              color={color as string}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="stock"
        options={{
          title: 'Stok Balok',
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons
              name="pine-tree"
              size={size + 2}
              color={color as string}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="cashflow"
        options={{
          title: 'Buku Kas',
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons
              name="cash-multiple"
              size={size + 2}
              color={color as string}
            />
          ),
        }}
      />
    </Tabs>
  );
}
