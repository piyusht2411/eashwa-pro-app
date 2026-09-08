import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View, ViewStyle } from 'react-native';
import { ChevronRight } from 'lucide-react-native';

import { colors, fonts, spacing } from '@/lib/theme';

/** Section title with an optional trailing action ("See all →"). */
export function SectionHeader({
  title,
  actionLabel,
  onAction,
  style,
}: {
  title: string;
  actionLabel?: string;
  onAction?: () => void;
  style?: ViewStyle;
}) {
  return (
    <View style={[s.row, style]}>
      <Text style={s.title}>{title}</Text>
      {actionLabel && onAction ? (
        <TouchableOpacity style={s.action} onPress={onAction} activeOpacity={0.7} hitSlop={8}>
          <Text style={s.actionText}>{actionLabel}</Text>
          <ChevronRight size={14} color={colors.primaryDark} strokeWidth={2.5} />
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

const s = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing.xl,
    marginBottom: spacing.md,
  },
  title: {
    fontFamily: fonts.bold,
    fontSize: 16,
    letterSpacing: -0.2,
    color: colors.text,
  },
  action: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  actionText: {
    fontFamily: fonts.semibold,
    fontSize: 13,
    color: colors.primaryDark,
  },
});

export default SectionHeader;
