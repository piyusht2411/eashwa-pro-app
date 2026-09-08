import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { ArrowLeft, Building2, CalendarDays, FileText, Gauge, MapPin, Package, Truck, User } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';

import { getVisitById } from '@/lib/api';
import { useAuthStore } from '@/stores/authStore';
import { colors, fonts, gradients, radius, shadow, spacing } from '@/lib/theme';
import { formatCount, formatDate, formatDays, formatINR, formatKm } from '@/lib/format';
import StatusPill from '@/components/ui/StatusPill';
import ExpenseTypeBadge from '@/components/ui/ExpenseTypeBadge';
import type { Expense, Visit } from '@/types';

const TYPES = ['food', 'cng', 'other'] as const;

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

  if (loading) {
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

  return (
    <SafeAreaView style={s.root} edges={['top']}>
      <LinearGradient colors={gradients.brandDeep} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={s.header}>
        <View style={s.headerBar}>
          <TouchableOpacity style={s.back} onPress={() => router.back()} hitSlop={8}>
            <ArrowLeft size={20} color={colors.white} strokeWidth={2.4} />
          </TouchableOpacity>
          <Text style={s.headerTitle}>Trip Details</Text>
        </View>

        <Text style={s.headerDest} numberOfLines={1}>{visit.destination}</Text>
        <View style={s.headerChip}>
          <Truck size={12} color={colors.white} strokeWidth={2.3} />
          <Text style={s.headerChipText}>{visit.vehicleNumber || 'No vehicle'}</Text>
        </View>
      </LinearGradient>

      <ScrollView contentContainerStyle={s.body} showsVerticalScrollIndicator={false}>
        <View style={s.factRow}>
          <Fact icon={<CalendarDays size={15} color={colors.primaryDark} strokeWidth={2.3} />} value={formatDays(visit.totalDays)} label="Duration" />
          <Fact icon={<Gauge size={15} color={colors.info} strokeWidth={2.3} />} value={formatKm(visit.distance)} label="Distance" />
          <Fact icon={<Package size={15} color={colors.success} strokeWidth={2.3} />} value={formatCount(visit.quantity)} label="Quantity" />
        </View>

        <View style={s.section}>
          <Text style={s.sectionTitle}>Trip Information</Text>
          <InfoRow icon={<MapPin size={14} color={colors.textMuted} />} label="Destination" value={visit.destination} />
          <InfoRow icon={<CalendarDays size={14} color={colors.textMuted} />} label="Start Date" value={formatDate(visit.startDate)} />
          <InfoRow icon={<CalendarDays size={14} color={colors.textMuted} />} label="End Date" value={formatDate(visit.endDate)} />
          {visit.billNumber ? (
            <InfoRow icon={<FileText size={14} color={colors.textMuted} />} label="Bill No." value={visit.billNumber} last />
          ) : null}
        </View>

        {expense ? (
          <>
            <View style={s.section}>
              <Text style={s.sectionTitle}>Expense Status</Text>
              {TYPES.map((type, i) => {
                const item = expense[type];
                const company = item?.paidBy === 'company';
                return (
                  <View key={type} style={[s.expRow, i === TYPES.length - 1 && s.rowLast]}>
                    <View style={s.expLeft}>
                      <ExpenseTypeBadge type={type} />
                      <Text style={s.expAmount}>{formatINR(item?.amount)}</Text>
                      <View style={s.paidByChip}>
                        {company
                          ? <Building2 size={11} color={colors.info} strokeWidth={2.3} />
                          : <User size={11} color={colors.textMuted} strokeWidth={2.3} />}
                        <Text style={[s.paidByText, company && { color: colors.info }]}>
                          {company ? 'Paid by company' : 'Paid by you'}
                        </Text>
                      </View>
                    </View>
                    <StatusPill status={item?.status ?? 'pending'} />
                  </View>
                );
              })}
            </View>

            <View style={s.section}>
              <Text style={s.sectionTitle}>Your Reimbursement</Text>
              <View style={s.pendingCard}>
                <Text style={s.pendingLabel}>Pending</Text>
                <Text style={s.pendingValue} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7}>
                  {formatINR(expense.pendingReimbursement)}
                </Text>
              </View>
              <TotalRow label="Total Expense (approved)" value={expense.totalExpense} color={colors.text} />
              {expense.pendingExpense > 0 ? (
                <TotalRow label="Awaiting Approval" value={expense.pendingExpense} color={colors.warning} />
              ) : null}
              <TotalRow label="Approved Reimbursement" value={expense.approvedReimbursement} color={colors.success} />
              {expense.rejectedAmount > 0 ? (
                <TotalRow label="Rejected Amount" value={expense.rejectedAmount} color={colors.danger} last />
              ) : null}
            </View>

            {TYPES.some(t => expense[t]?.rejectionRemark) ? (
              <View style={s.section}>
                <Text style={s.sectionTitle}>Rejection Reasons</Text>
                {TYPES.map(type =>
                  expense[type]?.rejectionRemark ? (
                    <View key={type} style={s.remarkBox}>
                      <Text style={s.remarkLabel}>{type} rejected</Text>
                      <Text style={s.remarkText}>{expense[type].rejectionRemark}</Text>
                    </View>
                  ) : null
                )}
              </View>
            ) : null}
          </>
        ) : (
          <View style={s.section}>
            <Text style={s.emptyText}>No expenses recorded yet.</Text>
          </View>
        )}
      </ScrollView>
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
  label, value, color, last,
}: { label: string; value: number; color: string; last?: boolean }) {
  return (
    <View style={[s.totalRow, last && s.rowLast]}>
      <Text style={s.totalLabel}>{label}</Text>
      <Text style={[s.totalValue, { color }]}>{formatINR(value)}</Text>
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
  headerChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255,255,255,0.18)',
    borderRadius: radius.full,
    paddingHorizontal: 10,
    paddingVertical: 5,
    marginTop: spacing.md,
  },
  headerChipText: { fontFamily: fonts.semibold, fontSize: 11.5, letterSpacing: 0.3, color: colors.white },

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
  sectionTitle: { fontFamily: fonts.bold, fontSize: 15, letterSpacing: -0.2, color: colors.text, marginBottom: spacing.md },

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

  expRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: spacing.md,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderSoft,
  },
  expLeft: { flex: 1, gap: 6 },
  expAmount: { fontFamily: fonts.extrabold, fontSize: 19, letterSpacing: -0.4, color: colors.text },
  paidByChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    alignSelf: 'flex-start',
    backgroundColor: colors.bgMuted,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.full,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  paidByText: { fontFamily: fonts.semibold, fontSize: 10.5, color: colors.textMuted },

  pendingCard: {
    backgroundColor: colors.primarySofter,
    borderWidth: 1,
    borderColor: colors.primaryBorder,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  pendingLabel: { fontFamily: fonts.medium, fontSize: 12, color: colors.primaryDark },
  pendingValue: { fontFamily: fonts.extrabold, fontSize: 24, lineHeight: 30, letterSpacing: -0.6, color: colors.primaryDarker, marginTop: 1 },

  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderSoft,
  },
  totalLabel: { fontFamily: fonts.medium, fontSize: 13, color: colors.textSecondary },
  totalValue: { fontFamily: fonts.bold, fontSize: 14 },

  remarkBox: {
    backgroundColor: colors.dangerSoft,
    borderWidth: 1,
    borderColor: colors.dangerBorder,
    borderRadius: radius.sm,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  remarkLabel: {
    fontFamily: fonts.bold,
    fontSize: 10,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    color: colors.danger,
  },
  remarkText: { fontFamily: fonts.medium, fontSize: 12.5, lineHeight: 18, color: colors.text, marginTop: 3 },

  emptyText: { fontFamily: fonts.medium, fontSize: 13.5, color: colors.textFaint, textAlign: 'center', paddingVertical: spacing.lg },
});
