import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
  Inter_800ExtraBold,
  useFonts,
} from '@expo-google-fonts/inter';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { Text, TextInput, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { updateFcmToken } from '@/lib/api';
import {
  checkInitialNotification,
  getFCMToken,
  setupNotificationListeners,
} from '@/lib/notifications';
import { colors } from '@/lib/theme';
import { useAuthStore } from '@/stores/authStore';
import './global.css';

// Apply Inter as the default font across all Text/TextInput.
// Components that set their own fontFamily still override this.
(() => {
  const TextAny = Text as any;
  const InputAny = TextInput as any;
  TextAny.defaultProps = TextAny.defaultProps || {};
  TextAny.defaultProps.style = [
    { fontFamily: 'Inter_400Regular', color: colors.text },
    TextAny.defaultProps.style,
  ];
  InputAny.defaultProps = InputAny.defaultProps || {};
  InputAny.defaultProps.style = [
    { fontFamily: 'Inter_400Regular', color: colors.text },
    InputAny.defaultProps.style,
  ];
})();

export default function RootLayout() {
  const { isSignedIn, token } = useAuthStore();
  const [fontsLoaded] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
    Inter_800ExtraBold,
  });

  // ── Notification listeners (always active, regardless of auth state) ──────
  useEffect(() => {
    const cleanup = setupNotificationListeners();
    return cleanup;
  }, []);

  // ── Register FCM token with backend whenever the user is signed in ────────
  useEffect(() => {
    if (!isSignedIn || !token) return;

    const registerToken = async () => {
      try {
        const fcmToken = await getFCMToken();
        if (!fcmToken) {
          console.log('[FCM] No token obtained (permission denied?)');
          return;
        }
        await updateFcmToken(fcmToken, token);
        console.log('[FCM] Token registered with backend ✅');
      } catch (err) {
        // Non-fatal — notifications still work, just token might be stale
        console.error('[FCM] Token registration failed:', err);
      }
    };

    registerToken();

    // Check if app was opened by tapping a notification (cold start)
    checkInitialNotification();
  }, [isSignedIn, token]);

  if (!fontsLoaded) {
    return <View style={{ flex: 1, backgroundColor: colors.bg }} />;
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <StatusBar style="dark" backgroundColor={colors.bg} />
        <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.bgSubtle } }}>
          <Stack.Screen name="index" />
          <Stack.Screen name="(auth)" />
          <Stack.Screen name="(admin)" />
          <Stack.Screen name="(team)" />
          <Stack.Screen name="(pdi)" />
          <Stack.Screen name="notification-detail" />
        </Stack>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}