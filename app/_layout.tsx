import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
  Inter_800ExtraBold,
  useFonts,
} from '@expo-google-fonts/inter';
import {
  Stack,
  router,
  useRootNavigationState,
  useSegments,
  type ErrorBoundaryProps,
} from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useRef } from 'react';
import { InteractionManager, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { KeyboardProvider } from 'react-native-keyboard-controller';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { updateFcmToken } from '@/lib/api';
import {
  checkInitialNotification,
  getFCMToken,
  setupNotificationListeners,
} from '@/lib/notifications';
import { LOGIN_ROUTE, homeRouteFor } from '@/lib/routes';
import { colors, fonts, radius, spacing } from '@/lib/theme';
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

/**
 * The single place that routes on auth state.
 *
 * Screens flip the session and nothing else — they do not navigate. Two
 * navigations racing (a screen's own `replace` against the one the state change
 * triggers) is what used to tear the stack apart on sign in and sign out.
 */
function useAuthGuard() {
  const { isSignedIn, user, hasHydrated } = useAuthStore();
  const segments = useSegments();
  const navigationState = useRootNavigationState();
  const segmentPath = segments.join('/');
  const navigatorReady = Boolean(navigationState?.key);

  useEffect(() => {
    // Navigating before the root navigator has mounted throws, and acting on a
    // session that has not been read from storage yet signs the user out.
    if (!hasHydrated || !navigatorReady) return;

    const group = segments[0];
    // The index route redirects itself; stepping in here would race it.
    if (group === undefined) return;

    const inAuthGroup = group === '(auth)';

    if (!isSignedIn && !inAuthGroup) {
      router.replace(LOGIN_ROUTE);
    } else if (isSignedIn && inAuthGroup) {
      router.replace(homeRouteFor(user));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasHydrated, navigatorReady, isSignedIn, user, segmentPath]);
}

/**
 * Expo Router renders this instead of unwinding when a screen throws. Without
 * it an unhandled render error takes the whole app down on a release build,
 * which reads to the user as "the app just closed".
 */
export function ErrorBoundary({ error, retry }: ErrorBoundaryProps) {
  return (
    <View style={eb.root}>
      <ScrollView contentContainerStyle={eb.scroll}>
        <Text style={eb.title}>Something went wrong</Text>
        <Text style={eb.message}>{error?.message ?? 'Unknown error'}</Text>
        <Pressable style={eb.button} onPress={retry}>
          <Text style={eb.buttonText}>Try again</Text>
        </Pressable>
      </ScrollView>
    </View>
  );
}

const eb = {
  root: { flex: 1, backgroundColor: colors.bgSubtle },
  scroll: { flexGrow: 1, justifyContent: 'center', padding: spacing.xl, gap: spacing.md },
  title: { fontFamily: fonts.bold, fontSize: 18, color: colors.text, textAlign: 'center' },
  message: { fontFamily: fonts.regular, fontSize: 13, lineHeight: 19, color: colors.textMuted, textAlign: 'center' },
  button: {
    alignSelf: 'center',
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    paddingHorizontal: spacing.xl,
    paddingVertical: 12,
  },
  buttonText: { fontFamily: fonts.bold, fontSize: 14, color: colors.white },
} as const;

export default function RootLayout() {
  const { isSignedIn, token } = useAuthStore();
  useAuthGuard();
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
  // getLastNotificationResponseAsync() keeps returning the same tap forever, so
  // this is checked once per app launch. Running it on every sign-in would yank
  // the user to a notification they opened days ago.
  const initialNotificationChecked = useRef(false);

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

        if (!initialNotificationChecked.current) {
          initialNotificationChecked.current = true;
          try {
            // Did a notification tap open the app? (cold start)
            await checkInitialNotification();
          } catch (err) {
            console.error('[Notifications] Initial check failed:', err);
          }
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
      {/* Android draws edge-to-edge, so the window no longer resizes when the
          keyboard opens. This reports the real keyboard frame to every screen
          so inputs can be scrolled clear of it. */}
      <KeyboardProvider statusBarTranslucent navigationBarTranslucent preserveEdgeToEdge>
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
      </KeyboardProvider>
    </GestureHandlerRootView>
  );
}