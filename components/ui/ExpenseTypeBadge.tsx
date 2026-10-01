import React from 'react';
import { StyleSheet, Text, View, ViewStyle } from 'react-native';
import { CreditCard, Droplets, Flag, Fuel, ReceiptText, UtensilsCrossed } from 'lucide-react-native';

import { accents, AccentName, colors, fonts, radius, spacing } from '@/lib/theme';
import type { ExpenseType } from '@/types';

export type { ExpenseType };

/** Every expense type a visit can carry, in display order. */
export const EXPENSE_TYPES: readonly ExpenseType[] = ['food', 'cng', 'diesel', 'fastTag', 'border', 'other'];

const META: Record<ExpenseType, { label: string; accent: AccentName }> = {
  food: { label: 'Food', accent: 'warning' },
  cng: { label: 'CNG', accent: 'info' },
  diesel: { label: 'Diesel', accent: 'brand' },
  fastTag: { label: 'FASTag', accent: 'success' },
  border: { label: 'Border', accent: 'danger' },
  other: { label: 'Other', accent: 'neutral' },
};

/** Type-specific glyph — a fuel pump for CNG beats the letters "CNG". */
export function expenseIcon(type: ExpenseType, size = 15, color?: string) {
  const c = color ?? accents[META[type].accent].fg;
  const props = { size, color, strokeWidth: 2.3 } as const;
  switch (type) {
    case 'food':
      return <UtensilsCrossed {...props} color={c} />;
    case 'cng':
      return <Fuel {...props} color={c} />;
    case 'diesel':
      return <Droplets {...props} color={c} />;
    case 'fastTag':
      return <CreditCard {...props} color={c} />;
    case 'border':
      return <Flag {...props} color={c} />;
    default:
      return <ReceiptText {...props} color={c} />;
  }
}

export const expenseLabel = (type: ExpenseType) => META[type].label;
export const expenseAccent = (type: ExpenseType) => META[type].accent;

/** Icon chip + label, used in expense rows and cards. */
export function ExpenseTypeBadge({
  type,
  style,
}: {
  type: ExpenseType;
  style?: ViewStyle;
}) {
  const a = accents[META[type].accent];
  return (
    <View style={[s.wrap, style]}>
      <View style={[s.chip, { backgroundColor: a.bg, borderColor: a.ring }]}>
        {expenseIcon(type, 14, a.fg)}
      </View>
      <Text style={s.label}>{META[type].label}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  wrap: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  chip: {
    width: 30,
    height: 30,
    borderRadius: radius.sm,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: { fontFamily: fonts.semibold, fontSize: 13, color: colors.text },
});

export default ExpenseTypeBadge;
