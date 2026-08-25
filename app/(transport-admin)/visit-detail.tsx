import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { ArrowLeft, CheckCircle, XCircle, Clock, Building2, User } from 'lucide-react-native';

import { getVisitById, approveExpenseItem, rejectExpenseItem } from '@/lib/api';
import { useAuthStore } from '@/stores/authStore';
import { colors, fonts, radius, shadow, spacing } from '@/lib/theme';
import type { Expense, ExpenseItem, ExpenseStatus, Visit } from '@/types';

type ExpenseType = 'food' | 'cng' | 'other';

export default function AdminVisitDetailScreen() {
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

  const handleApprove = async (type: ExpenseType) => {
    if (!token || !expense) return;
    Alert.alert('Approve Expense', `Approve ${type} expense?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Approve', onPress: async () => {
          try {
            await approveExpenseItem(expense._id, type, token);
            load();
          } catch (e: any) { Alert.alert('Error', e.message); }
        },
      },
    ]);
  };

  const handleReject = async (type: ExpenseType) => {
    if (!token || !expense) return;
    Alert.prompt('Reject Expense', `Enter reason for rejecting ${type} expense:`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Reject',
        style: 'destructive',
        onPress: async (remark: string | undefined) => {
          if (!remark?.trim()) { Alert.alert('Required', 'Please enter a reason.'); return; }
          try {
            await rejectExpenseItem(expense._id, type, remark, token);
            load();
          } catch (e: any) { Alert.alert('Error', e.message); }
        },
      },
    ]);
  };

  if (loading) return <SafeAreaView style={s.centered}><ActivityIndicator size="large" color={colors.primary} /></SafeAreaView>;
  if (!visit) return <SafeAreaView style={s.centered}><Text>Visit not found</Text></SafeAreaView>;

  const driver = typeof visit.driver === 'object' ? visit.driver : null;

  return (
    <SafeAreaView style={s.root} edges={['top']}>
      <LinearGradient colors={[colors.primaryLight, colors.primary, colors.primaryDark]} style={s.header}>
        <TouchableOpacity style={s.back} onPress={() => router.back()}>
          <ArrowLeft size={22} color={colors.white} />
        </TouchableOpacity>
        <Text style={s.headerTitle}>Visit Details</Text>
      </LinearGradient>

      <ScrollView contentContainerStyle={s.body} showsVerticalScrollIndicator={false}>
        {/* Visit Info */}
        <View style={s.section}>
          <Text style={s.sectionTitle}>Visit Information</Text>
          <InfoRow label="Driver" value={driver?.name ?? '—'} />
          <InfoRow label="Vehicle" value={visit.vehicleNumber} />
          <InfoRow label="Destination" value={visit.destination} />
          <InfoRow label="Start Date" value={new Date(visit.startDate).toLocaleDateString('en-IN')} />
          <InfoRow label="End Date" value={new Date(visit.endDate).toLocaleDateString('en-IN')} />
          <InfoRow label="Total Days" value={`${visit.totalDays} days`} />
          <InfoRow label="Distance" value={`${visit.distance} km`} />
          <InfoRow label="Quantity" value={`${visit.quantity}`} />
          {visit.billNumber ? <InfoRow label="Bill No." value={visit.billNumber} /> : null}
        </View>

        {/* Expense */}
        {expense ? (
          <View style={s.section}>
            <Text style={s.sectionTitle}>Expenses</Text>
            <ExpenseCard
              label="Food"
              type="food"
              item={expense.food}
              maxAllowed={400 * visit.totalDays}
              onApprove={() => handleApprove('food')}
              onReject={() => handleReject('food')}
            />
            <ExpenseCard
              label="CNG"
              type="cng"
              item={expense.cng}
              onApprove={() => handleApprove('cng')}
              onReject={() => handleReject('cng')}
            />
            <ExpenseCard
              label="Other"
              type="other"
              item={expense.other}
              onApprove={() => handleApprove('other')}
              onReject={() => handleReject('other')}
            />

            {/* Totals */}
            <View style={s.totals}>
              <TotalRow label="Total Expense" value={expense.totalExpense} color={colors.text} />
              <TotalRow label="Pending Reimb." value={expense.pendingReimbursement} color={colors.warning} />
              <TotalRow label="Approved Reimb." value={expense.approvedReimbursement} color={colors.success} />
              <TotalRow label="Rejected Amt." value={expense.rejectedAmount} color={colors.danger} />
            </View>
          </View>
        ) : (
          <View style={s.section}>
            <Text style={s.emptyText}>No expenses recorded for this visit.</Text>
          </View>
        )}
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

function TotalRow({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <View style={s.totalRow}>
      <Text style={s.totalLabel}>{label}</Text>
      <Text style={[s.totalValue, { color }]}>₹{value.toLocaleString('en-IN')}</Text>
    </View>
  );
}

function StatusBadge({ status }: { status: ExpenseStatus }) {
  const map: Record<ExpenseStatus, { bg: string; text: string; label: string }> = {
    pending: { bg: colors.warningSoft, text: colors.warning, label: 'Pending' },
    approved: { bg: colors.successSoft, text: colors.success, label: 'Approved' },
    rejected: { bg: colors.dangerSoft, text: colors.danger, label: 'Rejected' },
    auto_approved: { bg: colors.infoSoft, text: colors.info, label: 'Auto Approved' },
  };
  const c = map[status];
  return (
    <View style={[s.badge, { backgroundColor: c.bg }]}>
      <Text style={[s.badgeText, { color: c.text }]}>{c.label}</Text>
    </View>
  );
}

function ExpenseCard({
  label, type, item, maxAllowed, onApprove, onReject,
}: {
  label: string; type: ExpenseType; item: ExpenseItem; maxAllowed?: number;
  onApprove: () => void; onReject: () => void;
}) {
  const isPending = item.status === 'pending' && item.paidBy === 'driver';
  return (
    <View style={s.expenseCard}>
      <View style={s.expenseHeader}>
        <View>
          <Text style={s.expenseLabel}>{label} Expense</Text>
          {item.paidBy === 'company' ? (
            <View style={s.paidByRow}><Building2 size={12} color={colors.info} /><Text style={s.paidByText}>Company (Amit)</Text></View>
          ) : (
            <View style={s.paidByRow}><User size={12} color={colors.textMuted} /><Text style={s.paidByText}>Driver</Text></View>
          )}
        </View>
        <View style={{ alignItems: 'flex-end' }}>
          <Text style={s.expenseAmount}>₹{item.amount.toLocaleString('en-IN')}</Text>
          <StatusBadge status={item.status} />
        </View>
      </View>

      {maxAllowed !== undefined && (
        <Text style={s.maxNote}>Max allowed: ₹{maxAllowed.toLocaleString('en-IN')}</Text>
      )}

      {(item as any).description ? (
        <Text style={s.desc}>Note: {(item as any).description}</Text>
      ) : null}

      {item.rejectionRemark ? (
        <Text style={s.remark}>❌ Remark: {item.rejectionRemark}</Text>
      ) : null}

      {isPending && (
        <View style={s.actionRow}>
          <TouchableOpacity style={s.approveBtn} onPress={onApprove} activeOpacity={0.85}>
            <CheckCircle size={15} color={colors.white} />
            <Text style={s.actionText}>Approve</Text>
          </TouchableOpacity>
          <TouchableOpacity style={s.rejectBtn} onPress={onReject} activeOpacity={0.85}>
            <XCircle size={15} color={colors.white} />
            <Text style={s.actionText}>Reject</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bgSubtle },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.lg, paddingVertical: spacing.lg, gap: 12 },
  back: { padding: 4 },
  headerTitle: { fontFamily: fonts.bold, fontSize: 18, color: colors.white },
  body: { padding: spacing.lg, paddingBottom: 40 },
  section: { backgroundColor: colors.white, borderRadius: radius.lg, padding: spacing.lg, marginBottom: spacing.md, borderLeftWidth: 4, borderLeftColor: colors.primary, ...shadow.sm },
  sectionTitle: { fontFamily: fonts.bold, fontSize: 15, color: colors.text, marginBottom: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.border, paddingBottom: spacing.sm },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: colors.borderSoft },
  infoLabel: { fontFamily: fonts.medium, fontSize: 13, color: colors.textMuted },
  infoValue: { fontFamily: fonts.semibold, fontSize: 13, color: colors.text },
  expenseCard: { borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, padding: spacing.md, marginBottom: spacing.sm },
  expenseHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  expenseLabel: { fontFamily: fonts.semibold, fontSize: 14, color: colors.text },
  expenseAmount: { fontFamily: fonts.extrabold, fontSize: 18, color: colors.text },
  paidByRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 3 },
  paidByText: { fontFamily: fonts.medium, fontSize: 11, color: colors.textMuted },
  badge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 4, marginTop: 4 },
  badgeText: { fontFamily: fonts.semibold, fontSize: 11 },
  maxNote: { fontFamily: fonts.medium, fontSize: 11, color: colors.textMuted, marginTop: 6 },
  desc: { fontFamily: fonts.regular, fontSize: 12, color: colors.textSecondary, marginTop: 4 },
  remark: { fontFamily: fonts.medium, fontSize: 12, color: colors.danger, marginTop: 4 },
  actionRow: { flexDirection: 'row', gap: 10, marginTop: spacing.sm },
  approveBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: colors.success, borderRadius: radius.sm, paddingVertical: 9 },
  rejectBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: colors.danger, borderRadius: radius.sm, paddingVertical: 9 },
  actionText: { fontFamily: fonts.bold, fontSize: 13, color: colors.white },
  totals: { borderTopWidth: 1, borderTopColor: colors.border, paddingTop: spacing.md, marginTop: spacing.sm },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4 },
  totalLabel: { fontFamily: fonts.medium, fontSize: 13, color: colors.textSecondary },
  totalValue: { fontFamily: fonts.bold, fontSize: 13 },
  emptyText: { fontFamily: fonts.medium, fontSize: 14, color: colors.textFaint, textAlign: 'center', paddingVertical: 20 },
});
