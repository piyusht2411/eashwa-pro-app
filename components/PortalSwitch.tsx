import React, { useCallback } from 'react';
import { ActivityIndicator, Alert, Pressable, StyleSheet, Text, View, ViewStyle } from 'react-native';
import { router } from 'expo-router';
import { ArrowLeftRight, Factory, Truck } from 'lucide-react-native';

import { useAuthStore } from '@/stores/authStore';
import { colors, fonts, radius, shadow, spacing } from '@/lib/theme';
import type { Portal } from '@/types';

/** Landing route for an admin in each portal. */
const ADMIN_HOME: Record<Portal, string> = {
  production: '/(admin)/dashboard',
  transport: '/(transport-admin)/dashboard',
};

const LABEL: Record<Portal, string> = {
  production: 'Production',
  transport: 'Transport',
};

const ICON: Record<Portal, typeof Factory> = {
  production: Factory,
  transport: Truck,
};

/**
 * Reads whether the signed-in account may move between portals, and where it
 * currently sits. Only a cross-portal admin gets a switch.
 */
export function usePortalSwitch() {
  const { user, switchPortal, switchingPortal } = useAuthStore();

  const current: Portal = user?.portal ?? 'production';
  const target: Portal = current === 'production' ? 'transport' : 'production';
  const canSwitch = user?.role === 'admin' && user?.crossPortalAccess === true;

  const go = useCallback(
    async (to: Portal = target) => {
      const result = await switchPortal(to);
      if (!result.success) {
        Alert.alert('Switch failed', result.error ?? 'Could not switch portal');
        return;
      }
      // Replace, so the previous portal's stack is not left behind the new one.
      router.replace(ADMIN_HOME[to] as any);
    },
    [switchPortal, target],
  );

  const confirmAndGo = useCallback(
    (to: Portal = target) => {
      Alert.alert(
        `Switch to ${LABEL[to]}`,
        `You will be taken to the ${LABEL[to]} portal dashboard. Switch back any time from here.`,
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Switch', onPress: () => void go(to) },
        ],
      );
    },
    [go, target],
  );

  return { canSwitch, current, target, switching: switchingPortal, confirmAndGo, labelOf: LABEL };
}

/**
 * Compact pill for a gradient dashboard header — shows the portal in use and
 * switches to the other one on tap. Renders nothing for accounts that cannot
 * switch, so it is safe to drop into any admin header.
 */
export function PortalSwitchPill() {
  const { canSwitch, current, target, switching, confirmAndGo } = usePortalSwitch();
  if (!canSwitch) return null;

  const Icon = ICON[current];

  return (
    <Pressable
      onPress={() => confirmAndGo()}
      disabled={switching}
      hitSlop={6}
      style={({ pressed }) => [s.pill, pressed && s.pillPressed]}
      accessibilityRole="button"
      accessibilityLabel={`Currently in ${LABEL[current]} portal. Switch to ${LABEL[target]}.`}
    >
      <View style={s.pillInner}>
        {switching ? (
          <ActivityIndicator size="small" color={colors.white} />
        ) : (
          <>
            <Icon size={13} color={colors.white} strokeWidth={2.4} />
            <Text style={s.pillText} numberOfLines={1}>{LABEL[current]}</Text>
            <ArrowLeftRight size={11} color="rgba(255,255,255,0.85)" strokeWidth={2.4} />
          </>
        )}
      </View>
    </Pressable>
  );
}

/**
 * Full-width card for a "More" / profile screen — the discoverable twin of the
 * header pill, spelling out where the switch leads.
 */
export function PortalSwitchCard({ style }: { style?: ViewStyle }) {
  const { canSwitch, current, target, switching, confirmAndGo } = usePortalSwitch();
  if (!canSwitch) return null;

  const TargetIcon = ICON[target];

  return (
    <Pressable
      onPress={() => confirmAndGo()}
      disabled={switching}
      android_ripple={{ color: colors.primarySofter }}
      style={[s.card, style]}
      accessibilityRole="button"
    >
      <View style={s.cardIcon}>
        {switching ? (
          <ActivityIndicator size="small" color={colors.primaryDark} />
        ) : (
          <TargetIcon size={20} color={colors.primaryDark} strokeWidth={2.2} />
        )}
      </View>
      <View style={{ flex: 1 }}>
        <Text style={s.cardLabel}>Switch to {LABEL[target]} portal</Text>
        <Text style={s.cardDesc} numberOfLines={1}>
          You are in {LABEL[current]} · same account, both portals
        </Text>
      </View>
      <ArrowLeftRight size={18} color={colors.textFaint} strokeWidth={2.2} />
    </Pressable>
  );
}

const s = StyleSheet.create({
  pill: {
    borderRadius: radius.full,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.32)',
    overflow: 'hidden',
  },
  pillPressed: { backgroundColor: 'rgba(255,255,255,0.32)' },
  pillInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    height: 30,
    paddingHorizontal: 10,
  },
  pillText: {
    fontFamily: fonts.bold,
    fontSize: 11,
    letterSpacing: 0.4,
    color: colors.white,
  },

  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.primaryBorder,
    paddingHorizontal: 14,
    paddingVertical: 14,
    ...(shadow.sm as object),
  },
  cardIcon: {
    width: 42,
    height: 42,
    borderRadius: radius.md,
    backgroundColor: colors.primarySofter,
    borderWidth: 1,
    borderColor: colors.primaryBorder,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardLabel: { fontFamily: fonts.bold, fontSize: 15, color: colors.text },
  cardDesc: { fontFamily: fonts.regular, fontSize: 12, color: colors.textMuted, marginTop: 2 },
});

export default PortalSwitchPill;
