import { useAuthStore } from '@/stores/authStore';
import { Redirect } from 'expo-router';

export default function Index() {
  const { isSignedIn, user } = useAuthStore();

  if (!isSignedIn || !user) return <Redirect href="/(auth)/login" />;

  // Transport Portal routing
  if (user.portal === 'transport') {
    if (user.role === 'admin') return <Redirect href="/(transport-admin)/dashboard" />;
    if (user.role === 'accounts') return <Redirect href="/(accounts)/dashboard" />;
    if (user.role === 'driver') return <Redirect href="/(driver)/dashboard" />;
  }

  // Production Portal routing (default fallback)
  if (user.role === 'admin') return <Redirect href="/(admin)/dashboard" />;
  if (user.role === 'team') return <Redirect href="/(team)/dashboard" />;
  if (user.role === 'pdi') return <Redirect href="/(pdi)/dashboard" />;

  // Fallback for transport roles if portal was not explicitly set on user object
  if (user.role === 'accounts') return <Redirect href="/(accounts)/dashboard" />;
  if (user.role === 'driver') return <Redirect href="/(driver)/dashboard" />;

  return <Redirect href="/(auth)/login" />;
}