import { Tabs } from 'expo-router';
import { BarChart3, LayoutDashboard, Menu, Route, Users } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { tabIcon, tabScreenOptions } from '@/components/layout/tabBar';

export default function AccountsLayout() {
  const insets = useSafeAreaInsets();
  return (
    <Tabs screenOptions={tabScreenOptions(insets.bottom)}>
      <Tabs.Screen name="dashboard" options={{ title: 'Home', tabBarIcon: tabIcon(LayoutDashboard) }} />
      <Tabs.Screen name="visits" options={{ title: 'Visits', tabBarIcon: tabIcon(Route) }} />
      <Tabs.Screen name="drivers" options={{ title: 'Drivers', tabBarIcon: tabIcon(Users) }} />
      <Tabs.Screen name="reports" options={{ title: 'Reports', tabBarIcon: tabIcon(BarChart3) }} />
      <Tabs.Screen name="more" options={{ title: 'More', tabBarIcon: tabIcon(Menu) }} />

      {/* Hidden routable screens */}
      <Tabs.Screen name="visit-detail" options={{ href: null }} />
      <Tabs.Screen name="create-visit" options={{ href: null }} />
      <Tabs.Screen name="driver-detail" options={{ href: null }} />
      <Tabs.Screen name="notifications" options={{ href: null }} />
    </Tabs>
  );
}
