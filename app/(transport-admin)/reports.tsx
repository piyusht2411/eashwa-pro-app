import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator, Alert, FlatList, RefreshControl,
  StyleSheet, Text, TouchableOpacity, View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Download, FileSpreadsheet, Gauge, HandCoins, Hourglass, Receipt, Truck } from 'lucide-react-native';

import { cacheDirectory } from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';

import { XLSX_MIME, downloadVisitReport, getVisitReport } from '@/lib/api';
import { useAuthStore } from '@/stores/authStore';
import { colors, fonts, radius, shadow, spacing } from '@/lib/theme';
import { formatCount, formatDateRange, formatINR, formatINRCompact, formatKm } from '@/lib/format';
import StatTile from '@/components/ui/StatTile';
import SectionHeader from '@/components/ui/SectionHeader';
import EmptyState from '@/components/ui/EmptyState';
import MonthFilter, {
  MonthPeriod, monthPeriodLabel, monthPeriodParams, monthPeriodSlug,
} from '@/components/ui/MonthFilter';
import type { Expense, Visit } from '@/types';

type ReportRow = Visit & { expense: Expense | null };
type Totals = {
  totalVisits: number;
  totalDistance: number;
  /** Approved / auto-approved amounts only. */
  totalExpense: number;
  /** Amount still awaiting approval — excluded from totalExpense. */
  pendingExpense: number;
  pendingReimbursement: number;
  approvedReimbursement: number;
};

/** Initials from a name: "Ravi Kumar" → "RK". */
function initials(name?: string): string {
  const parts = (name ?? '').trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '—';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export default function AdminReportsScreen() {
  const { token } = useAuthStore();
  const [rows, setRows] = useState<ReportRow[]>([]);
  const [totals, setTotals] = useState<Totals | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [exporting, setExporting] = useState(false);
  // Drives both the on-screen summary and the export, so what you see is what
  // you download. `null` = all time.
  const [period, setPeriod] = useState<MonthPeriod>(null);

  const load = useCallback(async () => {
    if (!token) return;
    try {
      const res = await getVisitReport(token, monthPeriodParams(period));
      setRows(res.report ?? []);
      setTotals(res.totals ?? null);
    } catch (e) { console.error(e); }
    finally { setLoading(false); setRefreshing(false); }
  }, [token, period]);

  useEffect(() => { load(); }, [load]);

  const handleExport = async () => {
    if (!token || exporting) return;
    setExporting(true);
    try {
      const uri = await downloadVisitReport(
        token,
        `${cacheDirectory}eashwa-visit-report-${monthPeriodSlug(period)}.xlsx`,
        monthPeriodParams(period),
      );

      // Hand the file to the system sheet so it can be saved, mailed or opened
      // in Excel. Without this the download would sit in the app's cache where
      // nobody can reach it.
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri, {
          mimeType: XLSX_MIME,
          UTI: 'org.openxmlformats.spreadsheetml.sheet',
          dialogTitle: `Visit report — ${monthPeriodLabel(period)}`,
        });
      } else {
        Alert.alert('Report saved', `Saved to ${uri}`);
      }
    } catch (e: any) {
      Alert.alert('Export failed', e?.message ?? 'Could not generate the report.');
    } finally {
      setExporting(false);
    }
  };

  const renderHeader = () => (
    <View>
      {/* Headline: total expense across the whole reporting period. */}
      <View style={s.heroCard}>
        <View style={s.heroTop}>
          <View style={s.heroIcon}>
            <Receipt size={19} color={colors.primaryDark} strokeWidth={2.3} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={s.heroLabel}>Total Expense (approved)</Text>
            <Text style={s.heroValue} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7}>
              {formatINR(totals?.totalExpense)}
            </Text>
            {(totals?.pendingExpense ?? 0) > 0 ? (
              <Text style={s.heroHint}>
                {formatINR(totals?.pendingExpense)} awaiting approval — not counted
              </Text>
            ) : null}
          </View>
        </View>
        <View style={s.heroDivider} />
        <View style={s.heroFooter}>
          <Text style={s.heroFootLabel}>Across</Text>
          <Text style={s.heroFootValue}>{formatCount(totals?.totalVisits)} visits</Text>
          <View style={s.heroFootDot} />
          <Text style={s.heroFootValue}>{formatKm(totals?.totalDistance)}</Text>
        </View>
      </View>

      <SectionHeader title="Summary" />
      <View style={s.grid}>
        <StatTile
          icon={<Truck size={19} color={colors.primaryDark} strokeWidth={2.2} />}
          label="Total Visits"
          value={formatCount(totals?.totalVisits)}
          accent="brand"
        />
        <StatTile
          icon={<Gauge size={19} color={colors.info} strokeWidth={2.2} />}
          label="Distance"
          value={formatKm(totals?.totalDistance)}
          accent="info"
        />
        <StatTile
          icon={<Hourglass size={19} color={colors.warning} strokeWidth={2.2} />}
          label="Pending Reimb."
          value={formatINRCompact(totals?.pendingReimbursement)}
          accent="warning"
        />
        <StatTile
          icon={<HandCoins size={19} color={colors.success} strokeWidth={2.2} />}
          label="Approved Reimb."
          value={formatINRCompact(totals?.approvedReimbursement)}
          accent="success"
        />
      </View>

      <SectionHeader title={`All Records (${formatCount(rows.length)})`} />
    </View>
  );

  const renderItem = ({ item }: { item: ReportRow }) => {
    const driver = typeof item.driver === 'object' ? item.driver : null;
    const total = item.expense?.totalExpense ?? 0;
    const pendingAmt = item.expense?.pendingExpense ?? 0;

    return (
      <View style={s.row}>
        <View style={s.avatar}>
          <Text style={s.avatarText}>{initials(driver?.name)}</Text>
        </View>

        <View style={s.rowMid}>
          <Text style={s.rowDest} numberOfLines={1}>{item.destination}</Text>
          <Text style={s.rowDriver} numberOfLines={1}>{driver?.name ?? '—'}</Text>
          <Text style={s.rowMeta} numberOfLines={1}>
            {formatDateRange(item.startDate, item.endDate)} · {formatKm(item.distance)}
          </Text>
        </View>

        <View style={s.rowRight}>
          <Text style={s.rowExpense} numberOfLines={1}>{formatINRCompact(total)}</Text>
          <Text style={s.rowExpenseLabel}>approved</Text>
          {pendingAmt > 0 ? (
            <Text style={s.rowPending} numberOfLines={1}>
              +{formatINRCompact(pendingAmt)} pending
            </Text>
          ) : null}
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={s.root} edges={['top']}>
      <View style={s.topBar}>
        <Text style={s.title}>Reports</Text>
        <View style={{ flex: 1 }} />
        <TouchableOpacity
          style={[s.exportBtn, exporting && s.exportBtnBusy]}
          onPress={handleExport}
          disabled={exporting}
          activeOpacity={0.88}
        >
          {exporting ? (
            <ActivityIndicator size="small" color={colors.white} />
          ) : (
            <Download size={15} color={colors.white} strokeWidth={2.5} />
          )}
          <Text style={s.exportText}>{exporting ? 'Preparing…' : 'Export'}</Text>
        </TouchableOpacity>
      </View>

      <View style={s.filterRow}>
        <Text style={s.filterLabel}>Period</Text>
        <MonthFilter
          value={period}
          onChange={(next) => { setLoading(true); setPeriod(next); }}
        />
      </View>

      {loading ? (
        <ActivityIndicator style={{ marginTop: 60 }} size="large" color={colors.primary} />
      ) : (
        <FlatList
          data={rows}
          keyExtractor={r => r._id}
          renderItem={renderItem}
          ListHeaderComponent={renderHeader}
          contentContainerStyle={s.list}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={colors.primary} />
          }
          ListEmptyComponent={
            <EmptyState
              icon={<FileSpreadsheet size={24} color={colors.primary} strokeWidth={2} />}
              title={period ? `No visits in ${monthPeriodLabel(period)}` : 'Nothing to report yet'}
              subtitle={period
                ? 'Pick another month, or All time.'
                : 'Once visits and expenses are recorded, they will be summarised here.'}
            />
          }
        />
      )}
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bgSubtle },
  filterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.sm,
  },
  filterLabel: { fontFamily: fonts.semibold, fontSize: 12, color: colors.textMuted },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.md,
  },
  title: { fontFamily: fonts.extrabold, fontSize: 24, letterSpacing: -0.5, color: colors.text },
  exportBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.primary,
    borderRadius: radius.full,
    paddingHorizontal: 14,
    paddingVertical: 9,
    ...shadow.brand,
  },
  exportBtnBusy: { opacity: 0.75 },
  exportText: { fontFamily: fonts.bold, fontSize: 13, color: colors.white },

  list: { paddingHorizontal: spacing.lg, paddingBottom: spacing['4xl'] },

  heroCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.borderSoft,
    ...shadow.md,
  },
  heroTop: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  heroIcon: {
    width: 42,
    height: 42,
    borderRadius: radius.md,
    backgroundColor: colors.primarySofter,
    borderWidth: 1,
    borderColor: colors.primaryBorder,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroLabel: { fontFamily: fonts.medium, fontSize: 12.5, color: colors.textMuted },
  heroValue: { fontFamily: fonts.extrabold, fontSize: 27, lineHeight: 33, letterSpacing: -0.7, color: colors.text, marginTop: 1 },
  heroHint: { fontFamily: fonts.medium, fontSize: 11, color: colors.warning, marginTop: 3 },
  heroDivider: { height: 1, backgroundColor: colors.borderSoft, marginVertical: spacing.md },
  heroFooter: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  heroFootLabel: { fontFamily: fonts.regular, fontSize: 12, color: colors.textFaint },
  heroFootValue: { fontFamily: fonts.semibold, fontSize: 12, color: colors.textSecondary },
  heroFootDot: { width: 3, height: 3, borderRadius: 2, backgroundColor: colors.borderStrong },

  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },

  row: {
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
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primarySofter,
    borderWidth: 1,
    borderColor: colors.primaryBorder,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { fontFamily: fonts.extrabold, fontSize: 14, letterSpacing: 0.3, color: colors.primaryDark },
  rowMid: { flex: 1, gap: 2 },
  rowDest: { fontFamily: fonts.bold, fontSize: 14, letterSpacing: -0.1, color: colors.text },
  rowDriver: { fontFamily: fonts.medium, fontSize: 12, color: colors.textMuted },
  rowMeta: { fontFamily: fonts.medium, fontSize: 11, color: colors.textFaint },
  rowRight: { alignItems: 'flex-end', maxWidth: 108 },
  rowPending: { fontFamily: fonts.medium, fontSize: 10, color: colors.warning, marginTop: 1 },
  rowExpense: { fontFamily: fonts.extrabold, fontSize: 15.5, letterSpacing: -0.3, color: colors.text },
  rowExpenseLabel: { fontFamily: fonts.medium, fontSize: 10, color: colors.textFaint, marginTop: 1 },
});
