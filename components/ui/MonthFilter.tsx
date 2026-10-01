import React, { useEffect, useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, TouchableOpacity, View, ViewStyle } from 'react-native';
import { CalendarRange, ChevronDown, ChevronLeft, ChevronRight, X } from 'lucide-react-native';

import { colors, fonts, radius, shadow, spacing } from '@/lib/theme';

/** One calendar month (`month` is 1–12), or `null` for all time. */
export type MonthPeriod = { month: number; year: number } | null;

const MONTHS_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const MONTHS_LONG = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

/** "October 2026", or "All time". */
export const monthPeriodLabel = (value: MonthPeriod) =>
  value ? `${MONTHS_LONG[value.month - 1]} ${value.year}` : 'All time';

/** Query params for the API: `{ month, year }` or nothing at all. */
export const monthPeriodParams = (value: MonthPeriod) =>
  value ? { month: value.month, year: value.year } : {};

/** File-name fragment: "2026-10" or "all-time". */
export const monthPeriodSlug = (value: MonthPeriod) =>
  value ? `${value.year}-${String(value.month).padStart(2, '0')}` : 'all-time';

/**
 * Period selector for reports and exports: "All time" or one month.
 * Renders as a compact pill; tapping it opens a month grid.
 */
export default function MonthFilter({
  value,
  onChange,
  style,
  tone = 'light',
}: {
  value: MonthPeriod;
  onChange: (value: MonthPeriod) => void;
  style?: ViewStyle;
  /** `dark` for use on a coloured header. */
  tone?: 'light' | 'dark';
}) {
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1;

  const [open, setOpen] = useState(false);
  const [viewYear, setViewYear] = useState(value?.year ?? currentYear);

  // Re-centre on the selected year each time the sheet opens.
  useEffect(() => {
    if (open) setViewYear(value?.year ?? currentYear);
  }, [open, value?.year, currentYear]);

  const pick = (next: MonthPeriod) => {
    onChange(next);
    setOpen(false);
  };

  const dark = tone === 'dark';

  return (
    <>
      <TouchableOpacity
        style={[s.pill, dark ? s.pillDark : null, value ? (dark ? null : s.pillActive) : null, style]}
        onPress={() => setOpen(true)}
        activeOpacity={0.85}
        accessibilityRole="button"
        accessibilityLabel={`Period: ${monthPeriodLabel(value)}`}
      >
        <CalendarRange size={14} color={dark ? colors.white : colors.primaryDark} strokeWidth={2.3} />
        <Text style={[s.pillText, dark && s.pillTextDark]} numberOfLines={1}>
          {monthPeriodLabel(value)}
        </Text>
        <ChevronDown size={14} color={dark ? colors.white : colors.textMuted} strokeWidth={2.4} />
      </TouchableOpacity>

      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <Pressable style={s.overlay} onPress={() => setOpen(false)}>
          {/* Inner Pressable swallows taps so they don't close the sheet. */}
          <Pressable style={s.card} onPress={() => undefined}>
            <View style={s.head}>
              <Text style={s.title}>Select period</Text>
              <TouchableOpacity onPress={() => setOpen(false)} hitSlop={10} style={s.close}>
                <X size={16} color={colors.textSecondary} strokeWidth={2.6} />
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={[s.allBtn, value === null && s.allBtnActive]}
              onPress={() => pick(null)}
              activeOpacity={0.85}
            >
              <Text style={[s.allText, value === null && s.allTextActive]}>All time</Text>
            </TouchableOpacity>

            <View style={s.yearNav}>
              <TouchableOpacity onPress={() => setViewYear((y) => y - 1)} style={s.navBtn} hitSlop={6}>
                <ChevronLeft size={19} color={colors.primaryDark} strokeWidth={2.5} />
              </TouchableOpacity>
              <Text style={s.yearText}>{viewYear}</Text>
              <TouchableOpacity
                onPress={() => setViewYear((y) => y + 1)}
                style={[s.navBtn, viewYear >= currentYear && s.navBtnDisabled]}
                disabled={viewYear >= currentYear}
                hitSlop={6}
              >
                <ChevronRight size={19} color={colors.primaryDark} strokeWidth={2.5} />
              </TouchableOpacity>
            </View>

            <View style={s.grid}>
              {MONTHS_SHORT.map((label, i) => {
                const month = i + 1;
                const future = viewYear > currentYear || (viewYear === currentYear && month > currentMonth);
                const selected = value?.year === viewYear && value?.month === month;
                return (
                  <View key={label} style={s.cellWrap}>
                    <TouchableOpacity
                      style={[s.cell, selected && s.cellSel, future && s.cellDisabled]}
                      onPress={() => pick({ month, year: viewYear })}
                      disabled={future}
                      activeOpacity={0.8}
                    >
                      <Text style={[s.cellText, selected && s.cellTextSel]}>{label}</Text>
                    </TouchableOpacity>
                  </View>
                );
              })}
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}

const s = StyleSheet.create({
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 6,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    borderRadius: radius.full,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  pillActive: { borderColor: colors.primaryBorder, backgroundColor: colors.primarySofter },
  pillDark: { borderColor: 'rgba(255,255,255,0.35)', backgroundColor: 'rgba(255,255,255,0.18)' },
  pillText: { fontFamily: fonts.semibold, fontSize: 12.5, color: colors.text, flexShrink: 1 },
  pillTextDark: { color: colors.white },

  overlay: {
    flex: 1,
    backgroundColor: colors.overlay,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
  },
  card: {
    width: '100%',
    maxWidth: 380,
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    padding: spacing.lg,
    ...shadow.md,
  },
  head: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  title: { fontFamily: fonts.bold, fontSize: 16, letterSpacing: -0.2, color: colors.text },
  close: {
    width: 30, height: 30, borderRadius: radius.sm,
    backgroundColor: colors.surfaceAlt, alignItems: 'center', justifyContent: 'center',
  },

  allBtn: {
    marginTop: spacing.md,
    alignItems: 'center',
    paddingVertical: 11,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  allBtnActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  allText: { fontFamily: fonts.semibold, fontSize: 14, color: colors.text },
  allTextActive: { color: colors.white, fontFamily: fonts.bold },

  yearNav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
  },
  navBtn: {
    width: 34, height: 34, borderRadius: radius.sm,
    backgroundColor: colors.primarySofter, alignItems: 'center', justifyContent: 'center',
  },
  navBtnDisabled: { opacity: 0.35 },
  yearText: { fontFamily: fonts.bold, fontSize: 15, color: colors.text },

  grid: { flexDirection: 'row', flexWrap: 'wrap', marginHorizontal: -4 },
  cellWrap: { width: '33.333%', padding: 4 },
  cell: {
    alignItems: 'center',
    paddingVertical: 11,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.borderSoft,
  },
  cellSel: { backgroundColor: colors.primary, borderColor: colors.primary },
  cellDisabled: { opacity: 0.35 },
  cellText: { fontFamily: fonts.semibold, fontSize: 14, color: colors.text },
  cellTextSel: { color: colors.white, fontFamily: fonts.bold },
});
