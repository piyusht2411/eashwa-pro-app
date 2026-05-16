import { useAuthStore } from '@/stores/authStore';
import { Redirect } from 'expo-router';

export default function Index() {
  const { isSignedIn, user } = useAuthStore();

  if (!isSignedIn || !user) return <Redirect href="/(auth)/login" />;
  if (user.role === 'admin') return <Redirect href="/(admin)/dashboard" />;
  if (user.role === 'team') return <Redirect href="/(team)/dashboard" />;
  if (user.role === 'pdi') return <Redirect href="/(pdi)/dashboard" />;
  return <Redirect href="/(auth)/login" />;
}