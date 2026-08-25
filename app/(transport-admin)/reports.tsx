import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator, Alert, FlatList, RefreshControl,
  ScrollView, StyleSheet, Text, TouchableOpacity, View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BarChart2, Download } from 'lucide-react-native';

import { getVisitReport } from '@/lib/api';
import { useAuthStore } from '@/stores/authStore';
import { colors, fonts, radius, shadow, spacing } from '@/lib/theme';

export default function AdminReportsScreen() {
  const { token } = useAuthStore();
  const [report, setReport] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    if (!token) return;
    try {
      const res = await getVisitReport(token);
      setReport(res);
    } catch (e) { console.error(e); }
    finally { setLoading(false); setRefreshing(false); }
  }, [token]);

  useEffect(() => { load(); }, [load]);

  const handleExport = () => {
    Alert.alert('Export', 'Excel download is handled via browser/WebView. Share or open the export URL from the backend.');
  };

  return (
    <SafeAreaView style={s.root} edges={['top']}>
      <View style={s.header}>
        <View style={s.headerLeft}>
          <BarChart2 size={22} color={colors.primary} />
          <Text style={s.title}>Reports</Text>
        </View>
        <TouchableOpacity style={s.exportBtn} onPress={handleExport} activeOpacity={0.85}>
          <Download size={16} color={colors.white} />
          <Text style={s.exportText}>Export</Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <ActivityIndicator style={{ marginTop: 60 }} size="large" color={colors.primary} />
      ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={colors.primary} />}
        >
          {report?.totals && (
            <View style={s.totalsCard}>
              <Text style={s.totalsTitle}>Summary</Text>
              <TotalRow label="Total Visits" value={report.totals.totalVisits} />
              <TotalRow label="Total Distance" value={`${report.totals.totalDistance} km`} />
              <TotalRow label="Total Expense" value={`₹${report.totals.totalExpense?.toLocaleString('en-IN')}`} />
              <TotalRow label="Approved Reimb." value={`₹${report.totals.approvedReimbursement?.toLocaleString('en-IN')}`} />
              <TotalRow label="Pending Reimb." value={`₹${report.totals.pendingReimbursement?.toLocaleString('en-IN')}`} />
            </View>
          )}

          <Text style={s.sectionTitle}>All Records ({report?.report?.length ?? 0})</Text>
          {(report?.report ?? []).map((item: any) => {
            const driver = typeof item.driver === 'object' ? item.driver : null;
            return (
              <View key={item._id} style={s.reportRow}>
                <View style={s.rowLeft}>
                  <Text style={s.rowDriver}>{driver?.name ?? '—'}</Text>
                  <Text style={s.rowDest}>{item.destination}</Text>
                  <Text style={s.rowMeta}>{item.totalDays} days · {item.distance} km</Text>
                </View>
                <View style={s.rowRight}>
                  <Text style={s.rowExpense}>₹{item.expense?.totalExpense?.toLocaleString('en-IN') ?? '0'}</Text>
                  <Text style={s.rowExpenseLabel}>Total</Text>
                </View>
              </View>
            );
          })}
          <View style={{ height: 40 }} />
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

function TotalRow({ label, value }: { label: string; value: string | number }) {
  return (
    <View style={s.totalRow}>
      <Text style={s.totalLabel}>{label}</Text>
      <Text style={s.totalValue}>{value}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bgSubtle },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.lg, paddingVertical: spacing.lg },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  title: { fontFamily: fonts.extrabold, fontSize: 22, color: colors.text },
  exportBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: colors.primary, borderRadius: radius.md, paddingHorizontal: 14, paddingVertical: 9, ...shadow.sm },
  exportText: { fontFamily: fonts.bold, fontSize: 13, color: colors.white },
  totalsCard: { backgroundColor: colors.white, marginHorizontal: spacing.lg, marginBottom: spacing.md, borderRadius: radius.lg, padding: spacing.lg, borderLeftWidth: 4, borderLeftColor: colors.primary, ...shadow.sm },
  totalsTitle: { fontFamily: fonts.bold, fontSize: 15, color: colors.text, marginBottom: spacing.md },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6, borderBottomWidth: 1.5, borderBottomColor: colors.borderSoft },
  totalLabel: { fontFamily: fonts.medium, fontSize: 13, color: colors.textSecondary },
  totalValue: { fontFamily: fonts.bold, fontSize: 13, color: colors.text },
  sectionTitle: { fontFamily: fonts.bold, fontSize: 15, color: colors.text, paddingHorizontal: spacing.lg, marginBottom: spacing.sm },
  reportRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: colors.white, marginHorizontal: spacing.lg, borderRadius: radius.md, padding: spacing.md, marginBottom: spacing.sm, borderLeftWidth: 4, borderLeftColor: colors.primary, ...shadow.sm },
  rowLeft: { flex: 1 },
  rowDriver: { fontFamily: fonts.semibold, fontSize: 13, color: colors.text },
  rowDest: { fontFamily: fonts.regular, fontSize: 12, color: colors.textSecondary, marginTop: 2 },
  rowMeta: { fontFamily: fonts.medium, fontSize: 11, color: colors.textMuted, marginTop: 2 },
  rowRight: { alignItems: 'flex-end' },
  rowExpense: { fontFamily: fonts.extrabold, fontSize: 15, color: colors.text },
  rowExpenseLabel: { fontFamily: fonts.medium, fontSize: 10, color: colors.textFaint },
});
