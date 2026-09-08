import React from 'react';
import { StyleSheet, Text, View, ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

import { colors, fonts, gradients, radius, spacing } from '@/lib/theme';

/** Time-aware greeting, so the header isn't permanently stuck on "Good morning". */
export function greeting(now: Date = new Date()): string {
  const h = now.getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

/**
 * Gradient hero for dashboard screens.
 *
 * `overlap` pulls the following content up over the gradient's bottom edge so
 * a card can straddle it — the detail that separates a designed screen from a
 * stack of boxes. Pair with `<View style={{ marginTop: -overlap }}>`.
 */
export function DashboardHeader({
  name,
  subtitle,
  right,
  children,
  style,
}: {
  name?: string;
  subtitle?: string;
  right?: React.ReactNode;
  children?: React.ReactNode;
  style?: ViewStyle;
}) {
  return (
    <LinearGradient
      colors={gradients.brandDeep}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[s.wrap, style]}
    >
      {/* Soft light blooms — cheap depth, no image assets. */}
      <View style={s.blobA} pointerEvents="none" />
      <View style={s.blobB} pointerEvents="none" />

      <View style={s.row}>
        <View style={s.textCol}>
          <Text style={s.greeting}>{greeting()}</Text>
          <Text style={s.name} numberOfLines={1}>{name ?? '—'}</Text>
          {subtitle ? <Text style={s.subtitle} numberOfLines={1}>{subtitle}</Text> : null}
        </View>
        {right ? <View style={s.right}>{right}</View> : null}
      </View>

      {children}
    </LinearGradient>
  );
}

const s = StyleSheet.create({
  wrap: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.lg,
    paddingBottom: spacing['3xl'],
    borderBottomLeftRadius: radius['2xl'],
    borderBottomRightRadius: radius['2xl'],
    overflow: 'hidden',
  },
  blobA: {
    position: 'absolute',
    top: -70,
    right: -50,
    width: 190,
    height: 190,
    borderRadius: 95,
    backgroundColor: 'rgba(255,255,255,0.13)',
  },
  blobB: {
    position: 'absolute',
    bottom: -80,
    left: -40,
    width: 150,
    height: 150,
    borderRadius: 75,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  row: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: spacing.md },
  textCol: { flex: 1 },
  greeting: {
    fontFamily: fonts.medium,
    fontSize: 13,
    color: 'rgba(255,255,255,0.82)',
    letterSpacing: 0.2,
  },
  name: {
    fontFamily: fonts.extrabold,
    fontSize: 25,
    lineHeight: 31,
    letterSpacing: -0.5,
    color: colors.white,
    marginTop: 2,
  },
  subtitle: {
    fontFamily: fonts.medium,
    fontSize: 12.5,
    color: 'rgba(255,255,255,0.78)',
    marginTop: 3,
  },
  right: { marginTop: 2 },
});

export default DashboardHeader;
