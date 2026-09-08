import { Tabs } from 'expo-router';
import { BarChart3, CircleCheckBig, LayoutDashboard, Menu, Route } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { tabIcon, tabScreenOptions } from '@/components/layout/tabBar';

export default function AdminLayout() {
  const insets = useSafeAreaInsets();
  return (
    <Tabs screenOptions={tabScreenOptions(insets.bottom)}>
      <Tabs.Screen name="dashboard" options={{ title: 'Home', tabBarIcon: tabIcon(LayoutDashboard) }} />
      <Tabs.Screen name="visits" options={{ title: 'Visits', tabBarIcon: tabIcon(Route) }} />
      <Tabs.Screen name="expense-approvals" options={{ title: 'Approvals', tabBarIcon: tabIcon(CircleCheckBig) }} />
      <Tabs.Screen name="reports" options={{ title: 'Reports', tabBarIcon: tabIcon(BarChart3) }} />
      <Tabs.Screen name="more" options={{ title: 'More', tabBarIcon: tabIcon(Menu) }} />

      {/* Hidden routable screens */}
      <Tabs.Screen name="visit-detail" options={{ href: null }} />
      <Tabs.Screen name="drivers" options={{ href: null }} />
      <Tabs.Screen name="driver-detail" options={{ href: null }} />
      <Tabs.Screen name="users" options={{ href: null }} />
      <Tabs.Screen name="notifications" options={{ href: null }} />
    </Tabs>
  );
}
