import { Tabs } from 'expo-router';
import { CreditCard, Home, PackageSearch, Users } from 'lucide-react-native';
import { Platform, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors, fonts } from '@/lib/theme';

export default function AdminLayout() {
  const insets = useSafeAreaInsets();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          ...s.tabBar,
          height: 64 + insets.bottom,
          paddingTop: 6,
          paddingBottom: Math.max(insets.bottom, 8),
        },
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textFaint,
        tabBarLabelStyle: s.tabLabel,
      }}
    >
      <Tabs.Screen name="dashboard" options={{ title: 'Dashboard', tabBarIcon: ({ color, size }) => <Home color={color} size={size} strokeWidth={2.2} /> }} />
      <Tabs.Screen name="containers" options={{ title: 'Containers', tabBarIcon: ({ color, size }) => <PackageSearch color={color} size={size} strokeWidth={2.2} /> }} />
      <Tabs.Screen name="payments" options={{ title: 'Payments', tabBarIcon: ({ color, size }) => <CreditCard color={color} size={size} strokeWidth={2.2} /> }} />
      <Tabs.Screen name="teams" options={{ title: 'Teams', tabBarIcon: ({ color, size }) => <Users color={color} size={size} strokeWidth={2.2} /> }} />
    </Tabs>
  );
}

const s = StyleSheet.create({
  tabBar: {
    backgroundColor: colors.white,
    borderTopColor: colors.borderSoft,
    borderTopWidth: 1,
    ...Platform.select({
      ios: {
        shadowColor: '#0F172A',
        shadowOpacity: 0.06,
        shadowRadius: 12,
        shadowOffset: { width: 0, height: -2 },
      },
      android: { elevation: 8 },
    }),
  },
  tabLabel: { fontFamily: fonts.semibold, fontSize: 11, letterSpacing: 0.2 },
});
