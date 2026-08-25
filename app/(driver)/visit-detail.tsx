import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { ArrowLeft, Building2, User } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';

import { getVisitById } from '@/lib/api';
import { useAuthStore } from '@/stores/authStore';
import { colors, fonts, radius, shadow, spacing } from '@/lib/theme';
import type { Expense, ExpenseStatus, Visit } from '@/types';

export default function DriverVisitDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { token } = useAuthStore();
  const [visit, setVisit] = useState<Visit | null>(null);
  const [expense, setExpense] = useState<Expense | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!token || !id) return;
    try {
      const res = await getVisitById(id, token);
      setVisit(res.visit);
      setExpense(res.expense);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, [token, id]);

  useEffect(() => { load(); }, [load]);

  if (loading) return <SafeAreaView style={s.centered}><ActivityIndicator size="large" color={colors.primary} /></SafeAreaView>;
  if (!visit) return <SafeAreaView style={s.centered}><Text>Visit not found</Text></SafeAreaView>;

  return (
    <SafeAreaView style={s.root} edges={['top']}>
      <LinearGradient colors={[colors.primaryLight, colors.primary, colors.primaryDark]} style={s.header}>
        <TouchableOpacity style={s.back} onPress={() => router.back()}><ArrowLeft size={22} color={colors.white} /></TouchableOpacity>
        <Text style={s.headerTitle}>Visit Details</Text>
        <View style={{ width: 32 }} />
      </LinearGradient>

      <ScrollView contentContainerStyle={s.body} showsVerticalScrollIndicator={false}>
        {/* Visit Info */}
        <View style={s.section}>
          <Text style={s.sectionTitle}>Trip Information</Text>
          <InfoRow label="Destination" value={visit.destination} />
          <InfoRow label="Vehicle" value={visit.vehicleNumber} />
          <InfoRow label="Start Date" value={new Date(visit.startDate).toLocaleDateString('en-IN')} />
          <InfoRow label="End Date" value={new Date(visit.endDate).toLocaleDateString('en-IN')} />
          <InfoRow label="Total Days" value={`${visit.totalDays} days`} />
          <InfoRow label="Distance" value={`${visit.distance} km`} />
          <InfoRow label="Quantity" value={`${visit.quantity}`} />
          {visit.billNumber ? <InfoRow label="Bill No." value={visit.billNumber} /> : null}
        </View>

        {/* Expense Status — read only */}
        {expense ? (
          <View style={s.section}>
            <Text style={s.sectionTitle}>Expense Status</Text>
            {(['food', 'cng', 'other'] as const).map(type => (
              <View key={type} style={s.expRow}>
                <View style={s.expLeft}>
                  <Text style={s.expType}>{type.toUpperCase()}</Text>
                  <Text style={s.expAmount}>₹{expense[type]?.amount?.toLocaleString('en-IN') ?? '0'}</Text>
                  <View style={s.paidByRow}>
                    {expense[type]?.paidBy === 'company' ? <Building2 size={11} color={colors.info} /> : <User size={11} color={colors.textMuted} />}
                    <Text style={s.paidByText}>{expense[type]?.paidBy === 'company' ? 'Company (Amit)' : 'Driver (You)'}</Text>
                  </View>
                </View>
                <StatusBadge status={expense[type]?.status} />
              </View>
            ))}

            <View style={s.totalsBorder}>
              <TotalRow label="Total Expense" value={expense.totalExpense} />
              <TotalRow label="Approved Reimb." value={expense.approvedReimbursement} valueColor={colors.success} />
              <TotalRow label="Pending Reimb." value={expense.pendingReimbursement} valueColor={colors.warning} />
              {expense.rejectedAmount > 0 && <TotalRow label="Rejected" value={expense.rejectedAmount} valueColor={colors.danger} />}
            </View>

            {/* Rejection remarks */}
            {(['food', 'cng', 'other'] as const).map(type =>
              expense[type]?.rejectionRemark ? (
                <View key={type} style={s.remarkBox}>
                  <Text style={s.remarkLabel}>❌ {type.toUpperCase()} rejected:</Text>
                  <Text style={s.remarkText}>{expense[type].rejectionRemark}</Text>
                </View>
              ) : null
            )}
          </View>
        ) : (
          <View style={s.section}>
            <Text style={s.emptyText}>No expenses recorded yet.</Text>
          </View>
        )}
        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={s.infoRow}>
      <Text style={s.infoLabel}>{label}</Text>
      <Text style={s.infoValue}>{value}</Text>
    </View>
  );
}

function TotalRow({ label, value, valueColor }: { label: string; value: number; valueColor?: string }) {
  return (
    <View style={s.totalRow}>
      <Text style={s.totalLabel}>{label}</Text>
      <Text style={[s.totalValue, valueColor ? { color: valueColor } : {}]}>₹{value.toLocaleString('en-IN')}</Text>
    </View>
  );
}

function StatusBadge({ status }: { status?: ExpenseStatus }) {
  const map: Record<string, { bg: string; text: string; label: string }> = {
    pending: { bg: colors.warningSoft, text: colors.warning, label: '⏳ Pending' },
    approved: { bg: colors.successSoft, text: colors.success, label: '✓ Approved' },
    rejected: { bg: colors.dangerSoft, text: colors.danger, label: '✗ Rejected' },
    auto_approved: { bg: colors.infoSoft, text: colors.info, label: '✓ Auto Approved' },
  };
  const c = map[status ?? 'pending'];
  return (
    <View style={[s.badge, { backgroundColor: c.bg }]}>
      <Text style={[s.badgeText, { color: c.text }]}>{c.label}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bgSubtle },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.lg, paddingVertical: spacing.lg },
  back: { padding: 4, marginRight: spacing.sm },
  headerTitle: { flex: 1, fontFamily: fonts.bold, fontSize: 18, color: colors.white, textAlign: 'center' },
  body: { padding: spacing.lg, paddingBottom: 40 },
  section: { backgroundColor: colors.white, borderRadius: radius.lg, padding: spacing.lg, marginBottom: spacing.md, borderLeftWidth: 4, borderLeftColor: colors.primary, ...shadow.sm },
  sectionTitle: { fontFamily: fonts.bold, fontSize: 15, color: colors.text, marginBottom: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.border, paddingBottom: spacing.sm },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 7, borderBottomWidth: 1, borderBottomColor: colors.borderSoft },
  infoLabel: { fontFamily: fonts.medium, fontSize: 13, color: colors.textMuted },
  infoValue: { fontFamily: fonts.semibold, fontSize: 13, color: colors.text },
  expRow: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: colors.borderSoft },
  expLeft: { flex: 1 },
  expType: { fontFamily: fonts.bold, fontSize: 11, color: colors.textMuted, letterSpacing: 1 },
  expAmount: { fontFamily: fonts.extrabold, fontSize: 18, color: colors.text, marginTop: 2 },
  paidByRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 3 },
  paidByText: { fontFamily: fonts.medium, fontSize: 11, color: colors.textMuted },
  badge: { paddingHorizontal: 9, paddingVertical: 4, borderRadius: 6 },
  badgeText: { fontFamily: fonts.bold, fontSize: 12 },
  totalsBorder: { borderTopWidth: 1, borderTopColor: colors.border, paddingTop: spacing.md, marginTop: spacing.sm },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 5 },
  totalLabel: { fontFamily: fonts.medium, fontSize: 13, color: colors.textSecondary },
  totalValue: { fontFamily: fonts.bold, fontSize: 13, color: colors.text },
  remarkBox: { backgroundColor: colors.dangerSoft, borderRadius: radius.sm, padding: spacing.md, marginTop: spacing.sm },
  remarkLabel: { fontFamily: fonts.bold, fontSize: 12, color: colors.danger },
  remarkText: { fontFamily: fonts.regular, fontSize: 12, color: colors.danger, marginTop: 3 },
  emptyText: { fontFamily: fonts.medium, fontSize: 14, color: colors.textFaint, textAlign: 'center', paddingVertical: 20 },
});
