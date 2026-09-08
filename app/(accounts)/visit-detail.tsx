import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator, Alert, ScrollView, StyleSheet, Text,
  TextInput, TouchableOpacity, View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import {
  ArrowLeft, Building2, CalendarDays, FileText, Gauge,
  MapPin, Package, Trash2, Truck, User,
} from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';

import {
  getVisitById, upsertExpense, deleteVisit,
  UpsertExpensePayload,
} from '@/lib/api';
import { useAuthStore } from '@/stores/authStore';
import { colors, fonts, gradients, radius, shadow, spacing } from '@/lib/theme';
import { formatCount, formatDate, formatDays, formatINR, formatKm } from '@/lib/format';
import StatusPill from '@/components/ui/StatusPill';
import ExpenseTypeBadge from '@/components/ui/ExpenseTypeBadge';
import type { Expense, Visit } from '@/types';

type ExpenseType = 'food' | 'cng' | 'other';
const TYPES: ExpenseType[] = ['food', 'cng', 'other'];

export default function AccountsVisitDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { token } = useAuthStore();
  const [visit, setVisit] = useState<Visit | null>(null);
  const [expense, setExpense] = useState<Expense | null>(null);
  const [loading, setLoading] = useState(true);
  const [expenseForm, setExpenseForm] = useState({
    food: { amount: '', paidBy: 'driver' as 'driver' | 'company' },
    cng: { amount: '', paidBy: 'company' as 'driver' | 'company' },
    other: { amount: '', paidBy: 'driver' as 'driver' | 'company', description: '' },
  });
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    if (!token || !id) return;
    try {
      const res = await getVisitById(id, token);
      setVisit(res.visit);
      setExpense(res.expense);
      if (res.expense) {
        setExpenseForm({
          food: { amount: String(res.expense.food?.amount ?? ''), paidBy: res.expense.food?.paidBy ?? 'driver' },
          cng: { amount: String(res.expense.cng?.amount ?? ''), paidBy: res.expense.cng?.paidBy ?? 'company' },
          other: { amount: String(res.expense.other?.amount ?? ''), paidBy: res.expense.other?.paidBy ?? 'driver', description: (res.expense.other as any)?.description ?? '' },
        });
      }
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, [token, id]);

  useEffect(() => { load(); }, [load]);

  const handleSaveExpense = async () => {
    if (!token || !id || !visit) return;
    const maxFood = 400 * visit.totalDays;
    const foodAmt = parseFloat(expenseForm.food.amount) || 0;
    if (foodAmt > maxFood) {
      Alert.alert('Limit Exceeded', `Food allowance cannot exceed ${formatINR(maxFood)} (₹400 × ${visit.totalDays} days)`);
      return;
    }
    setSaving(true);
    try {
      const payload: UpsertExpensePayload = {};
      if (expenseForm.food.amount) payload.food = { amount: foodAmt, paidBy: expenseForm.food.paidBy };
      if (expenseForm.cng.amount) payload.cng = { amount: parseFloat(expenseForm.cng.amount), paidBy: expenseForm.cng.paidBy };
      if (expenseForm.other.amount) payload.other = { amount: parseFloat(expenseForm.other.amount), paidBy: expenseForm.other.paidBy, description: expenseForm.other.description };
      await upsertExpense(id, payload, token);
      Alert.alert('Saved', 'Expense saved successfully');
      load();
    } catch (e: any) { Alert.alert('Error', e.message); }
    finally { setSaving(false); }
  };

  const handleDelete = () => {
    Alert.alert('Delete Visit', 'This will also delete associated expenses. Continue?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => {
          if (!token || !id) return;
          try { await deleteVisit(id, token); router.back(); }
          catch (e: any) { Alert.alert('Error', e.message); }
        },
      },
    ]);
  };

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

  const driver = typeof visit.driver === 'object' ? visit.driver : null;
  const maxFood = 400 * visit.totalDays;

  return (
    <SafeAreaView style={s.root} edges={['top']}>
      <LinearGradient colors={gradients.brandDeep} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={s.header}>
        <View style={s.headerBar}>
          <TouchableOpacity style={s.back} onPress={() => router.back()} hitSlop={8}>
            <ArrowLeft size={20} color={colors.white} strokeWidth={2.4} />
          </TouchableOpacity>
          <Text style={s.headerTitle}>Visit Details</Text>
          <View style={{ flex: 1 }} />
          <TouchableOpacity style={s.deleteBtn} onPress={handleDelete} hitSlop={8}>
            <Trash2 size={17} color={colors.white} strokeWidth={2.3} />
          </TouchableOpacity>
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
        <View style={s.factRow}>
          <Fact icon={<CalendarDays size={15} color={colors.primaryDark} strokeWidth={2.3} />} value={formatDays(visit.totalDays)} label="Duration" />
          <Fact icon={<Gauge size={15} color={colors.info} strokeWidth={2.3} />} value={formatKm(visit.distance)} label="Distance" />
          <Fact icon={<Package size={15} color={colors.success} strokeWidth={2.3} />} value={formatCount(visit.quantity)} label="Quantity" />
        </View>

        <View style={s.section}>
          <Text style={s.sectionTitle}>Visit Information</Text>
          <InfoRow icon={<MapPin size={14} color={colors.textMuted} />} label="Destination" value={visit.destination} />
          <InfoRow icon={<CalendarDays size={14} color={colors.textMuted} />} label="Dates" value={`${formatDate(visit.startDate)} – ${formatDate(visit.endDate)}`} />
          {visit.billNumber ? (
            <InfoRow icon={<FileText size={14} color={colors.textMuted} />} label="Bill No." value={visit.billNumber} last />
          ) : null}
        </View>

        <View style={s.section}>
          <Text style={s.sectionTitle}>Expenses</Text>
          <View style={s.limitNote}>
            <Text style={s.limitText}>
              Food limit {formatINR(maxFood)} · ₹400 × {visit.totalDays} days
            </Text>
          </View>

          {TYPES.map(type => {
            const status = (expense as any)?.[type]?.status;
            return (
              <View key={type} style={s.expenseBlock}>
                <View style={s.expenseHead}>
                  <ExpenseTypeBadge type={type} />
                  {status ? <StatusPill status={status} /> : null}
                </View>

                <Text style={s.fieldLabel}>Amount</Text>
                <View style={s.amountWrap}>
                  <Text style={s.rupee}>₹</Text>
                  <TextInput
                    style={s.amountInput}
                    placeholder="0"
                    placeholderTextColor={colors.textFaint}
                    keyboardType="numeric"
                    value={expenseForm[type].amount}
                    onChangeText={v => setExpenseForm(p => ({ ...p, [type]: { ...p[type], amount: v } }))}
                  />
                </View>

                {type === 'other' && (
                  <>
                    <Text style={s.fieldLabel}>Description</Text>
                    <TextInput
                      style={s.textInput}
                      placeholder="What was this for?"
                      placeholderTextColor={colors.textFaint}
                      value={expenseForm.other.description}
                      onChangeText={v => setExpenseForm(p => ({ ...p, other: { ...p.other, description: v } }))}
                    />
                  </>
                )}

                <Text style={s.fieldLabel}>Paid by</Text>
                <View style={s.segment}>
                  <TouchableOpacity
                    style={[s.segmentBtn, expenseForm[type].paidBy === 'driver' && s.segmentBtnActive]}
                    onPress={() => setExpenseForm(p => ({ ...p, [type]: { ...p[type], paidBy: 'driver' } }))}
                    activeOpacity={0.85}
                  >
                    <User size={13} color={expenseForm[type].paidBy === 'driver' ? colors.white : colors.textMuted} strokeWidth={2.3} />
                    <Text style={[s.segmentText, expenseForm[type].paidBy === 'driver' && s.segmentTextActive]}>Driver</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[s.segmentBtn, expenseForm[type].paidBy === 'company' && s.segmentBtnCompany]}
                    onPress={() => setExpenseForm(p => ({ ...p, [type]: { ...p[type], paidBy: 'company' } }))}
                    activeOpacity={0.85}
                  >
                    <Building2 size={13} color={expenseForm[type].paidBy === 'company' ? colors.white : colors.textMuted} strokeWidth={2.3} />
                    <Text style={[s.segmentText, expenseForm[type].paidBy === 'company' && s.segmentTextActive]}>Company</Text>
                  </TouchableOpacity>
                </View>
              </View>
            );
          })}

          <TouchableOpacity
            style={[s.saveBtn, saving && s.saveBtnDisabled]}
            onPress={handleSaveExpense}
            disabled={saving}
            activeOpacity={0.88}
          >
            {saving
              ? <ActivityIndicator color={colors.white} size="small" />
              : <Text style={s.saveBtnText}>Save Expenses</Text>}
          </TouchableOpacity>
        </View>

        {expense && (
          <View style={s.section}>
            <Text style={s.sectionTitle}>Totals</Text>
            <TotalRow label="Total Expense (approved)" value={expense.totalExpense} color={colors.text} strong />
            {expense.pendingExpense > 0 ? (
              <TotalRow label="Awaiting Approval" value={expense.pendingExpense} color={colors.warning} />
            ) : null}
            <TotalRow label="Pending Reimbursement" value={expense.pendingReimbursement} color={colors.warning} />
            <TotalRow label="Approved Reimbursement" value={expense.approvedReimbursement} color={colors.success} />
            <TotalRow label="Rejected Amount" value={expense.rejectedAmount} color={colors.danger} last />
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
  label, value, color, strong, last,
}: { label: string; value: number; color: string; strong?: boolean; last?: boolean }) {
  return (
    <View style={[s.totalRow, last && s.rowLast]}>
      <Text style={[s.totalLabel, strong && s.totalLabelStrong]}>{label}</Text>
      <Text style={[s.totalValue, { color }, strong && s.totalValueStrong]}>{formatINR(value)}</Text>
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
    width: 36, height: 36, borderRadius: radius.md,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center', justifyContent: 'center',
  },
  deleteBtn: {
    width: 36, height: 36, borderRadius: radius.md,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center', justifyContent: 'center',
  },
  headerTitle: { fontFamily: fonts.semibold, fontSize: 14, color: 'rgba(255,255,255,0.9)', letterSpacing: 0.2 },
  headerDest: { fontFamily: fonts.extrabold, fontSize: 23, letterSpacing: -0.4, color: colors.white, marginTop: spacing.lg },
  headerMeta: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.md },
  headerChip: {
    flexDirection: 'row', alignItems: 'center', gap: 5, maxWidth: '52%',
    backgroundColor: 'rgba(255,255,255,0.18)',
    borderRadius: radius.full, paddingHorizontal: 10, paddingVertical: 5,
  },
  headerChipText: { fontFamily: fonts.semibold, fontSize: 11.5, color: colors.white },

  body: { padding: spacing.lg, paddingBottom: spacing['4xl'] },

  factRow: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.md },
  fact: {
    flex: 1, alignItems: 'center', gap: 5,
    backgroundColor: colors.surface, borderRadius: radius.lg,
    paddingVertical: spacing.md, paddingHorizontal: spacing.sm,
    borderWidth: 1, borderColor: colors.borderSoft, ...shadow.sm,
  },
  factValue: { fontFamily: fonts.bold, fontSize: 14, letterSpacing: -0.2, color: colors.text },
  factLabel: { fontFamily: fonts.medium, fontSize: 10.5, color: colors.textFaint },

  section: {
    backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.lg,
    marginBottom: spacing.md, borderWidth: 1, borderColor: colors.borderSoft, ...shadow.sm,
  },
  sectionTitle: { fontFamily: fonts.bold, fontSize: 15, letterSpacing: -0.2, color: colors.text, marginBottom: spacing.md },

  infoRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    gap: spacing.md, paddingVertical: 9,
    borderBottomWidth: 1, borderBottomColor: colors.borderSoft,
  },
  rowLast: { borderBottomWidth: 0, paddingBottom: 0 },
  infoLabelWrap: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  infoLabel: { fontFamily: fonts.medium, fontSize: 13, color: colors.textMuted },
  infoValue: { flexShrink: 1, fontFamily: fonts.semibold, fontSize: 13, color: colors.text, textAlign: 'right' },

  limitNote: {
    backgroundColor: colors.warningSoft, borderWidth: 1, borderColor: colors.warningBorder,
    borderRadius: radius.sm, paddingHorizontal: spacing.md, paddingVertical: spacing.sm,
    marginBottom: spacing.md,
  },
  limitText: { fontFamily: fonts.semibold, fontSize: 12, color: colors.warning },

  expenseBlock: {
    borderWidth: 1, borderColor: colors.border, borderRadius: radius.md,
    padding: spacing.md, marginBottom: spacing.sm, backgroundColor: colors.bgMuted,
  },
  expenseHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm },
  fieldLabel: { fontFamily: fonts.semibold, fontSize: 11.5, color: colors.textSecondary, marginTop: spacing.md, marginBottom: 5 },

  amountWrap: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    borderWidth: 1, borderColor: colors.border, borderRadius: radius.sm,
    paddingHorizontal: spacing.md, backgroundColor: colors.surface,
  },
  rupee: { fontFamily: fonts.bold, fontSize: 15, color: colors.textMuted },
  amountInput: { flex: 1, paddingVertical: 11, fontFamily: fonts.bold, fontSize: 15, color: colors.text },
  textInput: {
    borderWidth: 1, borderColor: colors.border, borderRadius: radius.sm,
    paddingHorizontal: spacing.md, paddingVertical: 11,
    fontFamily: fonts.medium, fontSize: 14, color: colors.text, backgroundColor: colors.surface,
  },

  segment: {
    flexDirection: 'row', gap: 4, padding: 3,
    backgroundColor: colors.surfaceAlt, borderRadius: radius.md,
  },
  segmentBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 5, paddingVertical: 9, borderRadius: radius.sm,
  },
  segmentBtnActive: { backgroundColor: colors.primary },
  segmentBtnCompany: { backgroundColor: colors.info },
  segmentText: { fontFamily: fonts.semibold, fontSize: 12.5, color: colors.textMuted },
  segmentTextActive: { color: colors.white, fontFamily: fonts.bold },

  saveBtn: {
    backgroundColor: colors.primary, borderRadius: radius.md,
    paddingVertical: 14, alignItems: 'center', marginTop: spacing.md, ...shadow.brand,
  },
  saveBtnDisabled: { opacity: 0.7 },
  saveBtnText: { fontFamily: fonts.bold, fontSize: 15, color: colors.white },

  totalRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingVertical: 9, borderBottomWidth: 1, borderBottomColor: colors.borderSoft,
  },
  totalLabel: { fontFamily: fonts.medium, fontSize: 13, color: colors.textSecondary },
  totalLabelStrong: { fontFamily: fonts.bold, color: colors.text },
  totalValue: { fontFamily: fonts.bold, fontSize: 14 },
  totalValueStrong: { fontFamily: fonts.extrabold, fontSize: 17, letterSpacing: -0.3 },
});
