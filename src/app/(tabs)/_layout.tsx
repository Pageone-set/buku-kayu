import { Feather } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  COLORS,
  FLOATING_TAB_BAR_HEIGHT,
  FONTS,
  SHADOWS,
  getFloatingTabBarBottomOffset,
} from '../../theme/tokens';

type CustomTabBarProps = Parameters<
  NonNullable<React.ComponentProps<typeof Tabs>['tabBar']>
>[0];

type FeatherIconName = React.ComponentProps<typeof Feather>['name'];

const TAB_CONFIG: Record<string, { icon: FeatherIconName; label: string }> = {
  index: { icon: 'home', label: 'Beranda' },
  sales: { icon: 'file-text', label: 'Jual' },
  orders: { icon: 'layers', label: 'Orderan' },
  stock: { icon: 'box', label: 'Stok' },
  cashflow: { icon: 'credit-card', label: 'Kas' },
};

function FloatingPillTabBar({
  state,
  descriptors,
  emitter,
  navigateToTab,
}: CustomTabBarProps) {
  const insets = useSafeAreaInsets();
  const bottomOffset = getFloatingTabBarBottomOffset(insets.bottom);

  return (
    <View
      pointerEvents="box-none"
      style={[styles.wrapper, { bottom: bottomOffset }]}
    >
      <View style={styles.capsule} accessibilityRole="tablist">
        {state.routes.map((route, index) => {
          const descriptor = descriptors[route.key];
          const options = descriptor?.options;
          if (options?.hidden) {
            return null;
          }

          const focused = index === state.index;
          const config = TAB_CONFIG[route.name] ?? {
            icon: 'circle' as FeatherIconName,
            label: options?.title ?? route.name,
          };

          const handlePress = () => {
            const event = emitter.emit({
              type: 'tabPress',
              target: route.key,
              canPreventDefault: true,
            });
            if (!focused && !event.defaultPrevented) {
              navigateToTab(route.key);
            }
          };

          const handleLongPress = () => {
            emitter.emit({
              type: 'tabLongPress',
              target: route.key,
            });
          };

          return (
            <TouchableOpacity
              key={route.key}
              activeOpacity={0.82}
              onPress={handlePress}
              onLongPress={handleLongPress}
              accessibilityRole="tab"
              accessibilityState={{ selected: focused }}
              accessibilityLabel={options?.tabBarAccessibilityLabel ?? config.label}
              style={[styles.tabItem, focused && styles.tabItemActive]}
            >
              <Feather
                name={config.icon}
                size={20}
                color={focused ? COLORS.textOnDark : '#9CA3AF'}
              />
              <Text
                style={[styles.tabLabel, focused && styles.tabLabelActive]}
                numberOfLines={1}
              >
                {config.label}
              </Text>
              {focused ? <View style={styles.activeDot} /> : null}
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        sceneStyle: { backgroundColor: COLORS.bg },
      }}
      tabBar={(props) => <FloatingPillTabBar {...props} />}
    >
      <Tabs.Screen name="index" options={{ title: 'Beranda' }} />
      <Tabs.Screen name="sales" options={{ title: 'Jual Kayu' }} />
      <Tabs.Screen name="orders" options={{ title: 'Orderan' }} />
      <Tabs.Screen name="stock" options={{ title: 'Stok Balok' }} />
      <Tabs.Screen name="cashflow" options={{ title: 'Buku Kas' }} />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    position: 'absolute',
    left: 16,
    right: 16,
    alignItems: 'center',
  },
  capsule: {
    width: '100%',
    height: FLOATING_TAB_BAR_HEIGHT,
    borderRadius: 999,
    backgroundColor: COLORS.navBarBg,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    gap: 2,
    ...SHADOWS.navPill,
  },
  tabItem: {
    flex: 1,
    minHeight: 52,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 6,
    gap: 2,
  },
  tabItemActive: {
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
  },
  tabLabel: {
    fontSize: 10,
    fontFamily: FONTS.medium,
    color: '#9CA3AF',
  },
  tabLabelActive: {
    fontFamily: FONTS.bold,
    color: COLORS.textOnDark,
  },
  activeDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: COLORS.ocean,
    marginTop: 1,
  },
});
