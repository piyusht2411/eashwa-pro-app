/**
 * Firebase Cloud Messaging (FCM) Notification Utilities
 *
 * Handles all production workflow notification types:
 *   new_container       → Team: new job assigned by Admin
 *   new_production_log  → PDI: team submitted a production log for verification
 *   pdi_verified        → Team: PDI fully verified their log
 *   pdi_incomplete      → Team: PDI found their log incomplete (units missing)
 *   pdi_verified_admin  → Admin: PDI verification summary
 *   payment_made        → Team: Admin recorded a payment for them
 */

import * as Notifications from 'expo-notifications';
import { router } from 'expo-router';
import { Platform } from 'react-native';

// ─── Notification type → route map ──────────────────────────────────────────

type NotificationType =
  | 'new_container'
  | 'new_production_log'
  | 'pdi_verified'
  | 'pdi_incomplete'
  | 'pdi_verified_admin'
  | 'payment_made';

// Transport-portal notifications are not rendered by /notification-detail
// (that screen only knows production entities). They carry a visitId instead.
const TRANSPORT_TYPES = [
  'new_visit',
  'visit_created',
  'visit_updated',
  'expense_approved',
  'expense_rejected',
  'approval_required',
];

const PRODUCTION_TYPES: NotificationType[] = [
  'new_container',
  'new_production_log',
  'pdi_verified',
  'pdi_incomplete',
  'pdi_verified_admin',
  'payment_made',
];

/** Returns the route to open, or null when there is nothing safe to open. */
function buildNotificationRoute(data: Record<string, any>): string | null {
  const type = data?.type as string | undefined;
  if (!type) return null;

  if (PRODUCTION_TYPES.includes(type as NotificationType)) {
    const params = new URLSearchParams({ type });
    if (data.logId) params.set('logId', data.logId);
    if (data.containerId) params.set('containerId', data.containerId);
    return `/notification-detail?${params.toString()}`;
  }

  // Transport: fall back to the in-app notifications list, which every
  // transport role can render. Sending these to /notification-detail only
  // produced an "Unknown notification type" dead end.
  if (TRANSPORT_TYPES.includes(type)) return '/notifications';

  return null;
}

// ─── Configure foreground notification behaviour ─────────────────────────────

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

// ─── Get FCM / Push Token ────────────────────────────────────────────────────

export async function getFCMToken(): Promise<string | null> {
  try {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') {
      console.log('[Notifications] Permission not granted');
      return null;
    }

    // Android: set up a dedicated notification channel
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('production', {
        name: 'Production Notifications',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#F96A07',
        sound: 'default',
      });
    }

    // Raw FCM device token (works directly with Firebase on Android)
    const tokenData = await Notifications.getDevicePushTokenAsync();
    console.log('[Notifications] FCM token:', tokenData.data);
    return tokenData.data as string;
  } catch (err) {
    console.error('[Notifications] Error getting FCM token:', err);
    return null;
  }
}

// ─── Navigate based on notification data ─────────────────────────────────────

function handleNotificationNavigation(data: Record<string, any>): void {
  const route = buildNotificationRoute(data);
  if (!route) {
    console.log('[Notifications] No route for notification:', data?.type);
    return;
  }
  console.log('[Notifications] Navigating to:', route);

  // Small delay to let the app finish mounting if navigating on cold start
  setTimeout(() => {
    try {
      router.push(route as any);
    } catch (err) {
      console.error('[Notifications] Navigation failed:', err);
    }
  }, 500);
}

// ─── Setup Notification Listeners (call once at app startup) ─────────────────

export function setupNotificationListeners(): () => void {
  // User tapped a notification (foreground OR background)
  const responseSubscription = Notifications.addNotificationResponseReceivedListener(
    (response) => {
      const data = response.notification.request.content.data ?? {};
      console.log('[Notifications] Tapped:', data);
      handleNotificationNavigation(data);
    },
  );

  // Notification received while app is in foreground
  const notificationSubscription = Notifications.addNotificationReceivedListener(
    (notification) => {
      const data = notification.request.content.data ?? {};
      console.log('[Notifications] Received in foreground:', data);
      // Alert is shown automatically via setNotificationHandler above
    },
  );

  // Return cleanup function
  return () => {
    responseSubscription.remove();
    notificationSubscription.remove();
  };
}

// ─── Handle notification that launched the app (cold start) ──────────────────

export async function checkInitialNotification(): Promise<void> {
  try {
    const response = await Notifications.getLastNotificationResponseAsync();
    if (!response) return;

    const data = response.notification.request.content.data ?? {};
    console.log('[Notifications] Cold-start notification:', data);
    handleNotificationNavigation(data);
  } catch (err) {
    console.error('[Notifications] checkInitialNotification error:', err);
  }
}
