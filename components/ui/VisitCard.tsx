import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View, ViewStyle } from 'react-native';
import { CalendarDays, ChevronRight, Gauge, MapPin, Package, Truck } from 'lucide-react-native';

import { colors, fonts, radius, shadow, spacing } from '@/lib/theme';
import { formatCount, formatDateRange, formatDays, formatKm } from '@/lib/format';
import type { Visit } from '@/types';

/**
 * Visit row shared by every visits list and dashboard.
 *
 * Destination leads (that's what people scan for), the vehicle sits in a
 * monospaced-feeling plate chip, and the numeric facts run along a single
 * meta strip with their own icons instead of "3 days · 120 km · Qty 4".
 */
export function VisitCard({
  visit,
  onPress,
  showDriver = true,
  style,
}: {
  visit: Visit;
  onPress?: () => void;
  showDriver?: boolean;
  style?: ViewStyle;
}) {
  const driver = typeof visit.driver === 'object' ? visit.driver : null;

  return (
    <TouchableOpacity
      style={[s.card, style]}
      onPress={onPress}
      activeOpacity={0.85}
      disabled={!onPress}
    >
      <View style={s.top}>
        <View style={s.destWrap}>
          <View style={s.pin}>
            <MapPin size={13} color={colors.primaryDark} strokeWidth={2.4} />
          </View>
          <Text style={s.dest} numberOfLines={1}>{visit.destination}</Text>
        </View>
        {onPress ? <ChevronRight size={17} color={colors.textFaint} /> : null}
      </View>

      {showDriver && driver?.name ? (
        <Text style={s.driver} numberOfLines={1}>{driver.name}</Text>
      ) : null}

      <View style={s.plateRow}>
        <View style={s.plate}>
          <Truck size={12} color={colors.textSecondary} strokeWidth={2.2} />
          <Text style={s.plateText}>{visit.vehicleNumber || 'No vehicle'}</Text>
        </View>
        <View style={s.dateWrap}>
          <CalendarDays size={12} color={colors.textFaint} strokeWidth={2.2} />
          <Text style={s.dateText} numberOfLines={1}>
            {formatDateRange(visit.startDate, visit.endDate)}
          </Text>
        </View>
      </View>

      <View style={s.metaStrip}>
        <Meta icon={<CalendarDays size={12} color={colors.textMuted} />} text={formatDays(visit.totalDays)} />
        <View style={s.metaDivider} />
        <Meta icon={<Gauge size={12} color={colors.textMuted} />} text={formatKm(visit.distance)} />
        <View style={s.metaDivider} />
        <Meta icon={<Package size={12} color={colors.textMuted} />} text={formatCount(visit.quantity)} />
      </View>
    </TouchableOpacity>
  );
}

function Meta({ icon, text }: { icon: React.ReactNode; text: string }) {
  return (
    <View style={s.meta}>
      {icon}
      <Text style={s.metaText} numberOfLines={1}>{text}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.borderSoft,
    ...shadow.sm,
  },
  top: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm },
  destWrap: { flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 },
  pin: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: colors.primarySofter,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dest: { flex: 1, fontFamily: fonts.bold, fontSize: 15, letterSpacing: -0.2, color: colors.text },
  driver: { fontFamily: fonts.medium, fontSize: 12.5, color: colors.textMuted, marginTop: 4, marginLeft: 34 },
  plateRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginTop: spacing.md },
  plate: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: colors.surfaceAlt,
    borderRadius: radius.sm,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  plateText: { fontFamily: fonts.bold, fontSize: 11.5, letterSpacing: 0.4, color: colors.textSecondary },
  dateWrap: { flexDirection: 'row', alignItems: 'center', gap: 4, flex: 1 },
  dateText: { fontFamily: fonts.medium, fontSize: 11.5, color: colors.textFaint },
  metaStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.borderSoft,
  },
  meta: { flexDirection: 'row', alignItems: 'center', gap: 5, flex: 1 },
  metaText: { fontFamily: fonts.semibold, fontSize: 12, color: colors.textSecondary },
  metaDivider: { width: 1, height: 14, backgroundColor: colors.border, marginHorizontal: spacing.sm },
});

export default VisitCard;
