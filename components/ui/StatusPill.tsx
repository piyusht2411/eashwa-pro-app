import React from 'react';
import { StyleSheet, Text, View, ViewStyle } from 'react-native';

import { accents, AccentName, fonts, radius } from '@/lib/theme';
import type { ExpenseStatus } from '@/types';

const STATUS_MAP: Record<ExpenseStatus, { label: string; accent: AccentName }> = {
  pending: { label: 'Pending', accent: 'warning' },
  approved: { label: 'Approved', accent: 'success' },
  rejected: { label: 'Rejected', accent: 'danger' },
  auto_approved: { label: 'Auto Approved', accent: 'info' },
};

/** Consistent status chip. Pass an ExpenseStatus, or a custom label + accent. */
export function StatusPill({
  status,
  label,
  accent,
  style,
}: {
  status?: ExpenseStatus;
  label?: string;
  accent?: AccentName;
  style?: ViewStyle;
}) {
  const mapped = status ? STATUS_MAP[status] : undefined;
  const a = accents[accent ?? mapped?.accent ?? 'neutral'];
  const text = label ?? mapped?.label ?? '—';

  return (
    <View style={[s.pill, { backgroundColor: a.bg, borderColor: a.ring }, style]}>
      <View style={[s.dot, { backgroundColor: a.fg }]} />
      <Text style={[s.text, { color: a.fg }]}>{text}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    alignSelf: 'flex-start',
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: radius.full,
    borderWidth: 1,
  },
  dot: { width: 5, height: 5, borderRadius: 3 },
  text: { fontFamily: fonts.semibold, fontSize: 11, letterSpacing: 0.1 },
});

export default StatusPill;
