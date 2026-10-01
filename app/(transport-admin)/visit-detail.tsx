import React, { useCallback, useEffect, useRef, useState } from 'react';
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
import {
  ArrowLeft,
  Building2,
  CalendarDays,
  Check,
  FileText,
  Gauge,
  MapPin,
  Package,
  Truck,
  User,
  X,
} from 'lucide-react-native';

import { getVisitById, approveExpenseItem, rejectExpenseItem } from '@/lib/api';
import RejectReasonModal from '@/components/ui/RejectReasonModal';
import StatusPill from '@/components/ui/StatusPill';
import ExpenseTypeBadge, { EXPENSE_TYPES, expenseLabel } from '@/components/ui/ExpenseTypeBadge';
import { useAuthStore } from '@/stores/authStore';
import { colors, fonts, gradients, radius, shadow, spacing } from '@/lib/theme';
import { formatCount, formatDays, formatINR, formatKm, formatVisitWhen } from '@/lib/format';
import { companyAmountOf, driverAmountOf, isAwaitingApproval, itemTotal } from '@/lib/expense';
import type { Expense, ExpenseItem, ExpenseType, Visit } from '@/types';

export default function AdminVisitDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { token } = useAuthStore();
  const [visit, setVisit] = useState<Visit | null>(null);
  const [expense, setExpense] = useState<Expense | null>(null);
  // Which visit the state below belongs to. This screen sits inside a tab
  // navigator, so opening another visit swaps the `id` param on the component
  // that is already mounted rather than mounting a fresh one. Without this the
  // previous visit stays on screen until the new one arrives.
  const [loadedId, setLoadedId] = useState<string | null>(null);
  const requestSeq = useRef(0);
  const [rejectTarget, setRejectTarget] = useState<ExpenseType | null>(null);
  const [rejecting, setRejecting] = useState(false);

  const load = useCallback(async () => {
    if (!token || !id) return;
    const seq = ++requestSeq.current;
    try {
      const res = await getVisitById(id, token);
      // Another visit was opened while this was in flight — drop the answer.
      if (seq !== requestSeq.current) return;
      setVisit(res.visit);
      setExpense(res.expense);
    } catch (e) {
      if (seq !== requestSeq.current) return;
      console.error(e);
      setVisit(null);
      setExpense(null);
    } finally {
      if (seq === requestSeq.current) setLoadedId(id);
    }
  }, [token, id]);

  useEffect(() => { load(); }, [load]);

  const handleApprove = async (type: ExpenseType) => {
    if (!token || !expense) return;
    // Only the driver's share is under review — the company share is already counted.
    const reimbursable = driverAmountOf(expense[type]);
    Alert.alert('Approve Expense', `Approve ${formatINR(reimbursable)} of ${expenseLabel(type)} paid by the driver?`, [
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

  const handleReject = (type: ExpenseType) => {
    if (!token || !expense) return;
    setRejectTarget(type);
  };

  const submitReject = async (remark: string) => {
    if (!token || !expense || !rejectTarget) return;
    setRejecting(true);
    try {
      await rejectExpenseItem(expense._id, rejectTarget, remark, token);
      setRejectTarget(null);
      load();
    } catch (e: any) {
      Alert.alert('Error', e.message);
    } finally {
      setRejecting(false);
    }
  };

  // Show the spinner until the data on screen is this visit's, not the last one's.
  if (loadedId !== id) {
    return (
      <SafeAreaView style={s.centered}>
        <ActivityIndicator size="large" color={colors.primary} />
      </SafeAreaView>
    );
  }
  if (!visit) {
    return (
      <SafeAreaView style={s.centered}>
        <Text style={s.notFound}>Visit not found</Text>
      </SafeAreaView>
    );
  }

  const driver = typeof visit.driver === 'object' ? visit.driver : null;
  // Six types is a lot of "Not recorded" — list only the ones that carry money.
  const recordedTypes = expense ? EXPENSE_TYPES.filter(t => itemTotal(expense[t]) > 0) : [];

  return (
    <SafeAreaView style={s.root} edges={['top']}>
      <LinearGradient colors={gradients.brandDeep} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={s.header}>
        <View style={s.headerBar}>
          <TouchableOpacity style={s.back} onPress={() => router.back()} hitSlop={8}>
            <ArrowLeft size={20} color={colors.white} strokeWidth={2.4} />
          </TouchableOpacity>
          <Text style={s.headerTitle}>Visit Details</Text>
        </View>

        <Text style={s.headerDest} numberOfLines={1}>{visit.destination}</Text>
        <View style={s.headerMeta}>
          <View style={s.headerChip}>
            <Truck size={12} color={colors.white} strokeWidth={2.3} />
            <Text style={s.headerChipText}>{visit.vehicleNumber || 'No vehicle'}</Text>
          </View>
          <View style={s.headerChip}>
            <User size={12} color={colors.white} strokeWidth={2.3} />
            <Text style={s.headerChipText} numberOfLines={1}>{driver?.name ?? '—'}</Text>
          </View>
        </View>
      </LinearGradient>

      <ScrollView contentContainerStyle={s.body} showsVerticalScrollIndicator={false}>
        {/* Trip facts as a tile row — far more scannable than a label/value list. */}
        <View style={s.factRow}>
          <Fact icon={<CalendarDays size={15} color={colors.primaryDark} strokeWidth={2.3} />} value={formatDays(visit.totalDays)} label="Duration" />
          <Fact icon={<Gauge size={15} color={colors.info} strokeWidth={2.3} />} value={formatKm(visit.distance)} label="Distance" />
          <Fact icon={<Package size={15} color={colors.success} strokeWidth={2.3} />} value={formatCount(visit.quantity)} label="Quantity" />
        </View>

        <View style={s.section}>
          <Text style={s.sectionTitle}>Visit Information</Text>
          <InfoRow icon={<MapPin size={14} color={colors.textMuted} />} label="Destination" value={visit.destination} />
          <InfoRow icon={<CalendarDays size={14} color={colors.textMuted} />} label="Start" value={formatVisitWhen(visit.startDate, visit.startTime)} />
          <InfoRow icon={<CalendarDays size={14} color={colors.textMuted} />} label="End" value={formatVisitWhen(visit.endDate, visit.endTime)} />
          {visit.billNumber ? (
            <InfoRow icon={<FileText size={14} color={colors.textMuted} />} label="Bill No." value={visit.billNumber} last />
          ) : null}
        </View>

        {expense ? (
          <>
            <View style={s.section}>
              <Text style={s.sectionTitle}>Expenses</Text>
              {recordedTypes.length === 0 ? (
                <Text style={s.emptyText}>No amounts recorded yet.</Text>
              ) : recordedTypes.map((type, i) => (
                <ExpenseCard
                  key={type}
                  type={type}
                  item={expense[type]!}
                  maxAllowed={type === 'food' ? 400 * visit.totalDays : undefined}
                  onApprove={() => handleApprove(type)}
                  onReject={() => handleReject(type)}
                  last={i === recordedTypes.length - 1}
                />
              ))}
            </View>

            <View style={s.section}>
              <Text style={s.sectionTitle}>Summary</Text>
              <TotalRow label="Total Expense (approved)" value={expense.totalExpense} color={colors.text} strong />
              {expense.pendingExpense > 0 ? (
                <TotalRow label="Awaiting Approval" value={expense.pendingExpense} color={colors.warning} />
              ) : null}
              <TotalRow label="Pending Reimbursement" value={expense.pendingReimbursement} color={colors.warning} />
              <TotalRow label="Approved Reimbursement" value={expense.approvedReimbursement} color={colors.success} />
              <TotalRow label="Rejected Amount" value={expense.rejectedAmount} color={colors.danger} last />
            </View>
          </>
        ) : (
          <View style={s.section}>
            <Text style={s.emptyText}>No expenses recorded for this visit.</Text>
          </View>
        )}
      </ScrollView>

      <RejectReasonModal
        visible={rejectTarget !== null}
        message={rejectTarget ? `Enter reason for rejecting ${expenseLabel(rejectTarget)} expense:` : undefined}
        submitting={rejecting}
        onCancel={() => setRejectTarget(null)}
        onSubmit={submitReject}
      />
    </SafeAreaView>
  );
}

function Fact({ icon, value, label }: { icon: React.ReactNode; value: string; label: string }) {
  return (
    <View style={s.fact}>
      {icon}
      <Text style={s.factValue} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8}>{value}</Text>
      <Text style={s.factLabel}>{label}</Text>
    </View>
  );
}

function InfoRow({
  icon, label, value, last,
}: { icon?: React.ReactNode; label: string; value: string; last?: boolean }) {
  return (
    <View style={[s.infoRow, last && s.rowLast]}>
      <View style={s.infoLabelWrap}>
        {icon}
        <Text style={s.infoLabel}>{label}</Text>
      </View>
      <Text style={s.infoValue} numberOfLines={1}>{value}</Text>
    </View>
  );
}

function TotalRow({
  label, value, color, strong, last,
}: { label: string; value: number; color: string; strong?: boolean; last?: boolean }) {
  return (
    <View style={[s.totalRow, last && s.rowLast]}>
      <Text style={[s.totalLabel, strong && s.totalLabelStrong]}>{label}</Text>
      <Text style={[s.totalValue, { color }, strong && s.totalValueStrong]}>{formatINR(value)}</Text>
    </View>
  );
}

function ExpenseCard({
  type, item, maxAllowed, onApprove, onReject, last,
}: {
  type: ExpenseType; item: ExpenseItem; maxAllowed?: number;
  onApprove: () => void; onReject: () => void; last?: boolean;
}) {
  const driverPaid = driverAmountOf(item);
  const companyPaid = companyAmountOf(item);
  const total = itemTotal(item);
  const isPending = isAwaitingApproval(item);
  const overLimit = maxAllowed !== undefined && total > maxAllowed;

  return (
    <View style={[s.expenseCard, last && { marginBottom: 0 }]}>
      <View style={s.expenseHeader}>
        <ExpenseTypeBadge type={type} />
        <Text style={s.expenseAmount}>{formatINR(total)}</Text>
      </View>

      {/* Who put in what. A bill can be settled from both sides at once. */}
      <View style={s.splitRow}>
        {driverPaid > 0 ? (
          <View style={s.paidByChip}>
            <User size={11} color={colors.primary} strokeWidth={2.3} />
            <Text style={[s.paidByText, { color: colors.primary }]}>Driver {formatINR(driverPaid)}</Text>
          </View>
        ) : null}
        {companyPaid > 0 ? (
          <View style={s.paidByChip}>
            <Building2 size={11} color={colors.info} strokeWidth={2.3} />
            <Text style={[s.paidByText, { color: colors.info }]}>Company {formatINR(companyPaid)}</Text>
          </View>
        ) : null}
        {total === 0 ? <Text style={s.paidByText}>Not recorded</Text> : null}
      </View>

      <View style={s.expenseMeta}>
        <StatusPill status={item.status} />
        {driverPaid > 0 ? (
          <Text style={s.statusNote}>on {formatINR(driverPaid)} paid by the driver</Text>
        ) : null}
      </View>

      {maxAllowed !== undefined ? (
        <Text style={[s.maxNote, overLimit && s.maxNoteOver]}>
          {overLimit ? '⚠ Over limit · ' : ''}Max allowed {formatINR(maxAllowed)}
        </Text>
      ) : null}

      {(item as any).description ? (
        <Text style={s.desc}>{(item as any).description}</Text>
      ) : null}

      {item.rejectionRemark ? (
        <View style={s.remarkBox}>
          <Text style={s.remarkLabel}>Rejection reason</Text>
          <Text style={s.remarkText}>{item.rejectionRemark}</Text>
        </View>
      ) : null}

      {isPending && (
        <View style={s.actionRow}>
          <TouchableOpacity style={s.rejectBtn} onPress={onReject} activeOpacity={0.85}>
            <X size={15} color={colors.danger} strokeWidth={3} />
            <Text style={s.rejectText}>Reject</Text>
          </TouchableOpacity>
          <TouchableOpacity style={s.approveBtn} onPress={onApprove} activeOpacity={0.85}>
            <Check size={15} color={colors.white} strokeWidth={3} />
            <Text style={s.approveText}>Approve</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bgSubtle },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.bgSubtle },
  notFound: { fontFamily: fonts.medium, fontSize: 15, color: colors.textMuted },

  header: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.xl,
    borderBottomLeftRadius: radius['2xl'],
    borderBottomRightRadius: radius['2xl'],
  },
  headerBar: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  back: {
    width: 36,
    height: 36,
    borderRadius: radius.md,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: { fontFamily: fonts.semibold, fontSize: 14, color: 'rgba(255,255,255,0.9)', letterSpacing: 0.2 },
  headerDest: { fontFamily: fonts.extrabold, fontSize: 23, letterSpacing: -0.4, color: colors.white, marginTop: spacing.lg },
  headerMeta: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.md },
  headerChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    maxWidth: '52%',
    backgroundColor: 'rgba(255,255,255,0.18)',
    borderRadius: radius.full,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  headerChipText: { fontFamily: fonts.semibold, fontSize: 11.5, color: colors.white },

  body: { padding: spacing.lg, paddingBottom: spacing['4xl'] },

  factRow: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.md },
  fact: {
    flex: 1,
    alignItems: 'center',
    gap: 5,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
    borderWidth: 1,
    borderColor: colors.borderSoft,
    ...shadow.sm,
  },
  factValue: { fontFamily: fonts.bold, fontSize: 14, letterSpacing: -0.2, color: colors.text },
  factLabel: { fontFamily: fonts.medium, fontSize: 10.5, color: colors.textFaint },

  section: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.borderSoft,
    ...shadow.sm,
  },
  sectionTitle: {
    fontFamily: fonts.bold,
    fontSize: 15,
    letterSpacing: -0.2,
    color: colors.text,
    marginBottom: spacing.md,
  },

  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
    paddingVertical: 9,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderSoft,
  },
  rowLast: { borderBottomWidth: 0, paddingBottom: 0 },
  infoLabelWrap: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  infoLabel: { fontFamily: fonts.medium, fontSize: 13, color: colors.textMuted },
  infoValue: { flexShrink: 1, fontFamily: fonts.semibold, fontSize: 13, color: colors.text, textAlign: 'right' },

  expenseCard: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
    backgroundColor: colors.bgMuted,
  },
  expenseHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm },
  expenseAmount: { fontFamily: fonts.extrabold, fontSize: 19, letterSpacing: -0.4, color: colors.text },
  expenseMeta: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginTop: spacing.md },
  splitRow: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: spacing.sm, marginTop: spacing.md },
  statusNote: { fontFamily: fonts.medium, fontSize: 11, color: colors.textFaint },
  paidByChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.full,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  paidByText: { fontFamily: fonts.semibold, fontSize: 10.5, color: colors.textMuted },

  maxNote: { fontFamily: fonts.medium, fontSize: 11.5, color: colors.textMuted, marginTop: spacing.sm },
  maxNoteOver: { color: colors.danger, fontFamily: fonts.semibold },
  desc: { fontFamily: fonts.regular, fontSize: 12.5, lineHeight: 18, color: colors.textSecondary, marginTop: 6 },

  remarkBox: {
    backgroundColor: colors.dangerSoft,
    borderWidth: 1,
    borderColor: colors.dangerBorder,
    borderRadius: radius.sm,
    padding: spacing.sm,
    marginTop: spacing.sm,
  },
  remarkLabel: { fontFamily: fonts.bold, fontSize: 10, letterSpacing: 0.6, textTransform: 'uppercase', color: colors.danger },
  remarkText: { fontFamily: fonts.medium, fontSize: 12.5, lineHeight: 18, color: colors.text, marginTop: 3 },

  actionRow: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.md },
  rejectBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    flex: 1,
    height: 40,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.dangerBorder,
  },
  rejectText: { fontFamily: fonts.bold, fontSize: 13, color: colors.danger },
  approveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    flex: 1,
    height: 40,
    borderRadius: radius.md,
    backgroundColor: colors.success,
  },
  approveText: { fontFamily: fonts.bold, fontSize: 13, color: colors.white },

  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 9,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderSoft,
  },
  totalLabel: { fontFamily: fonts.medium, fontSize: 13, color: colors.textSecondary },
  totalLabelStrong: { fontFamily: fonts.bold, color: colors.text },
  totalValue: { fontFamily: fonts.bold, fontSize: 14 },
  totalValueStrong: { fontFamily: fonts.extrabold, fontSize: 17, letterSpacing: -0.3 },

  emptyText: { fontFamily: fonts.medium, fontSize: 13.5, color: colors.textFaint, textAlign: 'center', paddingVertical: spacing.lg },
});
