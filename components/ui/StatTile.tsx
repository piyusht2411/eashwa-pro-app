import React from 'react';
import { StyleSheet, Text, View, ViewStyle } from 'react-native';

import { accents, AccentName, colors, fonts, radius, shadow, spacing } from '@/lib/theme';

/**
 * Metric tile used across every dashboard.
 *
 * White card + tinted icon chip, rather than a fully tinted card — tinted
 * blocks side by side read as placeholder UI. The value is the loudest thing
 * in the tile; the label sits under it in muted small caps.
 */
export function StatTile({
  icon,
  label,
  value,
  hint,
  accent = 'brand',
  style,
}: {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  hint?: string;
  accent?: AccentName;
  style?: ViewStyle;
}) {
  const a = accents[accent];
  return (
    <View style={[s.card, style]}>
      <View style={[s.iconChip, { backgroundColor: a.bg, borderColor: a.ring }]}>{icon}</View>
      <Text style={s.value} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.75}>
        {value}
      </Text>
      <Text style={s.label} numberOfLines={2}>{label}</Text>
      {hint ? <Text style={[s.hint, { color: a.fg }]} numberOfLines={1}>{hint}</Text> : null}
    </View>
  );
}

const s = StyleSheet.create({
  card: {
    flexGrow: 1,
    flexBasis: '47%',
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.borderSoft,
    ...shadow.sm,
  },
  iconChip: {
    width: 38,
    height: 38,
    borderRadius: radius.md,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  value: {
    fontFamily: fonts.extrabold,
    fontSize: 21,
    lineHeight: 26,
    letterSpacing: -0.4,
    color: colors.text,
  },
  label: {
    fontFamily: fonts.medium,
    fontSize: 12,
    lineHeight: 16,
    color: colors.textMuted,
    marginTop: 2,
  },
  hint: {
    fontFamily: fonts.semibold,
    fontSize: 11,
    marginTop: 6,
  },
});

export default StatTile;
