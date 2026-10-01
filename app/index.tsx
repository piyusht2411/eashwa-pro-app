import { Redirect } from 'expo-router';
import { View } from 'react-native';

import { colors } from '@/lib/theme';
import { LOGIN_ROUTE, homeRouteFor } from '@/lib/routes';
import { useAuthStore } from '@/stores/authStore';

export default function Index() {
  const { isSignedIn, user, hasHydrated } = useAuthStore();

  // The saved session arrives a tick after the first render. Redirecting before
  // it lands would throw a signed-in user out to the login screen on every
  // launch, and fire a second navigation the moment it did land.
  if (!hasHydrated) {
    return <View style={{ flex: 1, backgroundColor: colors.bg }} />;
  }

  if (!isSignedIn || !user) return <Redirect href={LOGIN_ROUTE} />;

  return <Redirect href={homeRouteFor(user)} />;
}
