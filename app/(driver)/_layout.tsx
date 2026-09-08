import { Tabs } from 'expo-router';
import { LayoutDashboard, Menu, Route } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { tabIcon, tabScreenOptions } from '@/components/layout/tabBar';

export default function DriverLayout() {
  const insets = useSafeAreaInsets();
  return (
    <Tabs screenOptions={tabScreenOptions(insets.bottom)}>
      <Tabs.Screen name="dashboard" options={{ title: 'Home', tabBarIcon: tabIcon(LayoutDashboard) }} />
      <Tabs.Screen name="visits" options={{ title: 'My Visits', tabBarIcon: tabIcon(Route) }} />
      <Tabs.Screen name="more" options={{ title: 'More', tabBarIcon: tabIcon(Menu) }} />

      {/* Hidden */}
      <Tabs.Screen name="visit-detail" options={{ href: null }} />
      <Tabs.Screen name="notifications" options={{ href: null }} />
    </Tabs>
  );
}
