import { Tabs } from 'expo-router';
import { BarChart2, Home, Truck, MoreHorizontal } from 'lucide-react-native';
import { Platform, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, fonts } from '@/lib/theme';

export default function AccountsLayout() {
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
        tabBarActiveBackgroundColor: colors.primarySoft,
        tabBarItemStyle: s.tabItem,
      }}
    >
      <Tabs.Screen name="dashboard" options={{ title: 'Dashboard', tabBarIcon: ({ color, size }) => <Home color={color} size={size} strokeWidth={2.2} /> }} />
      <Tabs.Screen name="visits" options={{ title: 'Visits', tabBarIcon: ({ color, size }) => <Truck color={color} size={size} strokeWidth={2.2} /> }} />
      <Tabs.Screen name="drivers" options={{ title: 'Drivers', tabBarIcon: ({ color, size }) => <Truck color={color} size={size} strokeWidth={2.2} /> }} />
      <Tabs.Screen name="reports" options={{ title: 'Reports', tabBarIcon: ({ color, size }) => <BarChart2 color={color} size={size} strokeWidth={2.2} /> }} />
      <Tabs.Screen name="more" options={{ title: 'More', tabBarIcon: ({ color, size }) => <MoreHorizontal color={color} size={size} strokeWidth={2.2} /> }} />

      {/* Hidden routable screens */}
      <Tabs.Screen name="visit-detail" options={{ href: null }} />
      <Tabs.Screen name="create-visit" options={{ href: null }} />
      <Tabs.Screen name="driver-detail" options={{ href: null }} />
      <Tabs.Screen name="notifications" options={{ href: null }} />
    </Tabs>
  );
}

const s = StyleSheet.create({
  tabBar: {
    backgroundColor: colors.white,
    borderTopColor: colors.borderSoft,
    borderTopWidth: 1,
    ...Platform.select({
      ios: { shadowColor: colors.primary, shadowOpacity: 0.05, shadowRadius: 10, shadowOffset: { width: 0, height: -3 } },
      android: { elevation: 8 },
    }),
  },
  tabLabel: { fontFamily: fonts.semibold, fontSize: 11, letterSpacing: 0.2 },
  tabItem: { borderRadius: 14, marginHorizontal: 3, marginVertical: 2 },
});
