import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View, ViewStyle } from 'react-native';
import { ChevronRight, Truck } from 'lucide-react-native';

import { colors, fonts, radius, shadow, spacing } from '@/lib/theme';
import type { Driver } from '@/types';

/** Initials from a name: "Ravi Kumar" → "RK", "Ravi" → "RA". */
function initials(name?: string): string {
  const parts = (name ?? '').trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '—';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

/**
 * Driver row. Uses an initials avatar rather than the same truck glyph on
 * every row — identical icons down a list is what makes it read as mock data.
 */
export function DriverCard({
  driver,
  onPress,
  style,
}: {
  driver: Driver;
  onPress?: () => void;
  style?: ViewStyle;
}) {
  const inactive = driver.isActive === false;

  return (
    <TouchableOpacity
      style={[s.card, inactive && s.cardInactive, style]}
      activeOpacity={0.85}
      onPress={onPress}
      disabled={!onPress}
    >
      <View style={[s.avatar, inactive && s.avatarInactive]}>
        <Text style={[s.avatarText, inactive && s.avatarTextInactive]}>{initials(driver.name)}</Text>
      </View>

      <View style={s.info}>
        <View style={s.nameRow}>
          <Text style={s.name} numberOfLines={1}>{driver.name}</Text>
          {inactive ? (
            <View style={s.inactiveChip}><Text style={s.inactiveText}>Inactive</Text></View>
          ) : null}
        </View>

        {driver.vehicleNumber ? (
          <View style={s.plate}>
            <Truck size={11} color={colors.textSecondary} strokeWidth={2.3} />
            <Text style={s.plateText}>{driver.vehicleNumber}</Text>
          </View>
        ) : (
          <Text style={s.noVehicle}>No vehicle assigned</Text>
        )}
      </View>

      {onPress ? <ChevronRight size={18} color={colors.textFaint} /> : null}
    </TouchableOpacity>
  );
}

const s = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.borderSoft,
    ...shadow.sm,
  },
  cardInactive: { opacity: 0.72 },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.primarySofter,
    borderWidth: 1,
    borderColor: colors.primaryBorder,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInactive: { backgroundColor: colors.surfaceAlt, borderColor: colors.border },
  avatarText: { fontFamily: fonts.extrabold, fontSize: 15, letterSpacing: 0.3, color: colors.primaryDark },
  avatarTextInactive: { color: colors.textMuted },
  info: { flex: 1, gap: 4 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  name: { flexShrink: 1, fontFamily: fonts.bold, fontSize: 14.5, letterSpacing: -0.1, color: colors.text },
  inactiveChip: {
    backgroundColor: colors.surfaceAlt,
    borderRadius: radius.full,
    paddingHorizontal: 7,
    paddingVertical: 1,
  },
  inactiveText: { fontFamily: fonts.semibold, fontSize: 10, color: colors.textMuted },
  plate: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    alignSelf: 'flex-start',
    backgroundColor: colors.surfaceAlt,
    borderRadius: radius.sm,
    paddingHorizontal: 7,
    paddingVertical: 3,
  },
  plateText: { fontFamily: fonts.bold, fontSize: 11, letterSpacing: 0.4, color: colors.textSecondary },
  noVehicle: { fontFamily: fonts.regular, fontSize: 12, color: colors.textFaint, fontStyle: 'italic' },
});

export default DriverCard;
