import React from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import type { BottomTabNavigationOptions } from '@react-navigation/bottom-tabs';

import { colors, fonts, radius } from '@/lib/theme';

type IconProps = { color: string; size: number; strokeWidth: number };

/**
 * Wraps a tab icon in a pill that only lights up when focused.
 *
 * Previously the whole tab item (icon *and* label) took an active background,
 * which read as a highlighted rectangle rather than a selected tab.
 */
export function tabIcon(Icon: React.ComponentType<IconProps>) {
  return function TabIcon({ color, size, focused }: { color: string; size: number; focused: boolean }) {
    return (
      <View style={[s.iconWrap, focused && s.iconWrapActive]}>
        <Icon color={color} size={size - 2} strokeWidth={focused ? 2.6 : 2.1} />
      </View>
    );
  };
}

/** Shared bottom-tab styling for every transport role. */
export function tabScreenOptions(bottomInset: number): BottomTabNavigationOptions {
  return {
    headerShown: false,
    tabBarStyle: {
      ...s.tabBar,
      height: 62 + bottomInset,
      paddingTop: 8,
      paddingBottom: Math.max(bottomInset, 10),
    },
    tabBarActiveTintColor: colors.primaryDark,
    tabBarInactiveTintColor: colors.textFaint,
    tabBarLabelStyle: s.tabLabel,
    tabBarItemStyle: s.tabItem,
  };
}

const s = StyleSheet.create({
  tabBar: {
    backgroundColor: colors.surface,
    borderTopColor: colors.borderSoft,
    borderTopWidth: 1,
    ...Platform.select({
      ios: {
        shadowColor: '#0F172A',
        shadowOpacity: 0.07,
        shadowRadius: 14,
        shadowOffset: { width: 0, height: -4 },
      },
      android: { elevation: 12 },
    }),
  },
  tabLabel: { fontFamily: fonts.semibold, fontSize: 10.5, letterSpacing: 0.1, marginTop: 1 },
  tabItem: { paddingVertical: 0 },
  iconWrap: {
    width: 44,
    height: 26,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconWrapActive: { backgroundColor: colors.primarySofter },
});
