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
import { useEffect, useRef } from 'react';
import { InteractionManager, Text, TextInput, View } from 'react-native';
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
  // This effect fires the instant login flips `isSignedIn`, i.e. in the middle
  // of the sign-in navigation. getFCMToken() reaches into native Firebase and
  // can request the Android notification permission, so it is deferred until
  // after the navigation transition settles and runs at most once per session.
  const fcmHandledFor = useRef<string | null>(null);

  useEffect(() => {
    if (!isSignedIn || !token) return;
    if (fcmHandledFor.current === token) return;
    fcmHandledFor.current = token;

    const task = InteractionManager.runAfterInteractions(() => {
      void (async () => {
        try {
          const fcmToken = await getFCMToken();
          if (!fcmToken) {
            console.log('[FCM] No token obtained (permission denied?)');
          } else {
            await updateFcmToken(fcmToken, token);
            console.log('[FCM] Token registered with backend ✅');
          }
        } catch (err) {
          // Non-fatal — notifications still work, the token may just be stale.
          console.error('[FCM] Token registration failed:', err);
        }

        try {
          // Did a notification tap open the app? (cold start)
          await checkInitialNotification();
        } catch (err) {
          console.error('[Notifications] Initial check failed:', err);
        }
      })();
    });

    return () => task.cancel();
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
          <Stack.Screen name="(accounts)" />
          <Stack.Screen name="(driver)" />
          <Stack.Screen name="(transport-admin)" />
          <Stack.Screen name="notification-detail" />
          <Stack.Screen name="notifications" />
        </Stack>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}