import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator, Alert, StyleSheet, Text,
  TextInput, TouchableOpacity, View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import {
  ArrowLeft, Building2, CalendarDays, FileText, Gauge,
  MapPin, Package, Pencil, Trash2, Truck, User,
} from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';

import {
  getVisitById, upsertExpense, deleteVisit,
  UpsertExpensePayload,
} from '@/lib/api';
import { useAuthStore } from '@/stores/authStore';
import { colors, fonts, gradients, radius, shadow, spacing } from '@/lib/theme';
import { formatCount, formatDays, formatINR, formatKm, formatVisitWhen } from '@/lib/format';
import StatusPill from '@/components/ui/StatusPill';
import ExpenseTypeBadge, { EXPENSE_TYPES } from '@/components/ui/ExpenseTypeBadge';
import type { Expense, ExpenseItem, ExpenseType, Visit } from '@/types';

type PayerForm = { driverAmount: string; companyAmount: string };
type ExpenseForm = Record<Exclude<ExpenseType, 'other'>, PayerForm> & {
  other: PayerForm & { description: string };
};

const emptyExpenseForm = (): ExpenseForm => ({
  food: { driverAmount: '', companyAmount: '' },
  cng: { driverAmount: '', companyAmount: '' },
  diesel: { driverAmount: '', companyAmount: '' },
  fastTag: { driverAmount: '', companyAmount: '' },
  border: { driverAmount: '', companyAmount: '' },
  other: { driverAmount: '', companyAmount: '', description: '' },
});

/** Blank rather than a literal "0", so the placeholder shows for unused payers. */
const amountText = (value?: number | null) => (value ? String(value) : '');

const toAmount = (text: string) => Math.max(0, parseFloat(text) || 0);

/** Pull the two payer figures off a saved item, tolerating the old single-amount shape. */
const payerFields = (item?: ExpenseItem | null) => ({
  driverAmount: amountText(item?.driverAmount ?? (item?.paidBy === 'company' ? 0 : item?.amount)),
  companyAmount: amountText(item?.companyAmount ?? (item?.paidBy === 'company' ? item?.amount : 0)),
});

export default function AccountsVisitDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { token } = useAuthStore();
  const [visit, setVisit] = useState<Visit | null>(null);
  const [expense, setExpense] = useState<Expense | null>(null);
  // Which visit the state below belongs to. This screen sits inside a tab
  // navigator, so opening another visit swaps the `id` param on the component
  // that is already mounted rather than mounting a fresh one. Without this the
  // previous visit stays on screen — and its typed amounts stay in the form —
  // until the new one arrives.
  const [loadedId, setLoadedId] = useState<string | null>(null);
  const requestSeq = useRef(0);
  // A bill can be settled from both sides at once — e.g. ₹4000 of CNG where the
  // driver put in ₹2000 and the company ₹2000 — so each type carries a figure
  // per payer. Either may be left blank.
  const [expenseForm, setExpenseForm] = useState(emptyExpenseForm);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    if (!token || !id) return;
    const seq = ++requestSeq.current;
    try {
      const res = await getVisitById(id, token);
      // Another visit was opened while this was in flight — drop the answer.
      if (seq !== requestSeq.current) return;
      setVisit(res.visit);
      setExpense(res.expense);
      // Always reset the form: a visit with no expenses must not inherit the
      // amounts typed for the one before it.
      setExpenseForm(res.expense ? {
        food: payerFields(res.expense.food),
        cng: payerFields(res.expense.cng),
        diesel: payerFields(res.expense.diesel),
        fastTag: payerFields(res.expense.fastTag),
        border: payerFields(res.expense.border),
        other: {
          ...payerFields(res.expense.other),
          description: (res.expense.other as any)?.description ?? '',
        },
      } : emptyExpenseForm());
    } catch (e) {
      if (seq !== requestSeq.current) return;
      console.error(e);
      setVisit(null);
      setExpense(null);
      setExpenseForm(emptyExpenseForm());
    } finally {
      if (seq === requestSeq.current) setLoadedId(id);
    }
  }, [token, id]);

  useEffect(() => { load(); }, [load]);

  // Coming back from the edit screen — pick up the saved changes. The first
  // focus is already covered by the effect above.
  const focusedOnce = useRef(false);
  useFocusEffect(useCallback(() => {
    if (focusedOnce.current) load();
    focusedOnce.current = true;
  }, [load]));

  const typedTotal = (type: ExpenseType) =>
    toAmount(expenseForm[type].driverAmount) + toAmount(expenseForm[type].companyAmount);

  const savedTotal = (type: ExpenseType) => {
    const item = (expense as any)?.[type];
    if (!item) return 0;
    return (Number(item.driverAmount) || 0) + (Number(item.companyAmount) || 0) || (Number(item.amount) || 0);
  };

  const isTouched = (type: ExpenseType) =>
    expenseForm[type].driverAmount !== '' ||
    expenseForm[type].companyAmount !== '' ||
    savedTotal(type) > 0;

  const handleSaveExpense = async () => {
    if (!token || !id || !visit) return;
    const maxFood = 400 * visit.totalDays;
    // The cap is on the bill as a whole, no matter who settled which part.
    if (typedTotal('food') > maxFood) {
      Alert.alert('Limit Exceeded', `Food allowance cannot exceed ${formatINR(maxFood)} (₹400 × ${visit.totalDays} days)`);
      return;
    }
    setSaving(true);
    try {
      const payload: UpsertExpensePayload = {};
      // An item is sent when it has been typed into, or when it already holds a
      // figure — that second case is what lets a saved amount be cleared to zero.
      for (const type of EXPENSE_TYPES) {
        if (!isTouched(type)) continue;
        const portions = {
          driverAmount: toAmount(expenseForm[type].driverAmount),
          companyAmount: toAmount(expenseForm[type].companyAmount),
        };
        if (type === 'other') {
          payload.other = { ...portions, description: expenseForm.other.description };
        } else {
          payload[type] = portions;
        }
      }
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
          try { await deleteVisit(id, token); router.navigate('/(accounts)/visits' as any); }
          catch (e: any) { Alert.alert('Error', e.message); }
        },
      },
    ]);
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
          <TouchableOpacity
            style={s.deleteBtn}
            onPress={() => router.push({ pathname: '/(accounts)/create-visit' as any, params: { id } })}
            hitSlop={8}
          >
            <Pencil size={16} color={colors.white} strokeWidth={2.3} />
          </TouchableOpacity>
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

      <KeyboardAwareScrollView
        contentContainerStyle={s.body}
        bottomOffset={24}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
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

        <View style={s.section}>
          <Text style={s.sectionTitle}>Expenses</Text>
          <View style={s.limitNote}>
            <Text style={s.limitText}>
              Food limit {formatINR(maxFood)} · ₹400 × {visit.totalDays} days
            </Text>
          </View>
          <Text style={s.payerHint}>
            Enter what each side paid. Fill one, or both when a single bill was
            split — e.g. ₹4,000 of CNG as ₹2,000 driver and ₹2,000 company.
          </Text>

          {EXPENSE_TYPES.map(type => {
            // Types added after an expense was saved come back with a default
            // status and nothing in them — no pill until there is money to judge.
            const status = savedTotal(type) > 0 ? expense?.[type]?.status : undefined;
            return (
              <View key={type} style={s.expenseBlock}>
                <View style={s.expenseHead}>
                  <ExpenseTypeBadge type={type} />
                  {status ? <StatusPill status={status} /> : null}
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

                <Text style={s.fieldLabel}>Amount paid</Text>
                <View style={s.payerRow}>
                  <PayerInput
                    icon={<User size={12} color={colors.primary} strokeWidth={2.4} />}
                    label="Driver"
                    tint={colors.primary}
                    value={expenseForm[type].driverAmount}
                    onChangeText={v => setExpenseForm(p => ({ ...p, [type]: { ...p[type], driverAmount: v } }))}
                  />
                  <PayerInput
                    icon={<Building2 size={12} color={colors.info} strokeWidth={2.4} />}
                    label="Company"
                    tint={colors.info}
                    value={expenseForm[type].companyAmount}
                    onChangeText={v => setExpenseForm(p => ({ ...p, [type]: { ...p[type], companyAmount: v } }))}
                  />
                </View>
                {typedTotal(type) > 0 ? (
                  <View style={s.blockTotal}>
                    <Text style={s.blockTotalLabel}>Total</Text>
                    <Text style={s.blockTotalValue}>{formatINR(typedTotal(type))}</Text>
                  </View>
                ) : null}
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
      </KeyboardAwareScrollView>
    </SafeAreaView>
  );
}

/** One payer's share of a single expense. Blank means that side paid nothing. */
function PayerInput({
  icon, label, tint, value, onChangeText,
}: {
  icon: React.ReactNode; label: string; tint: string;
  value: string; onChangeText: (v: string) => void;
}) {
  return (
    <View style={s.payerCol}>
      <View style={s.payerLabelRow}>
        {icon}
        <Text style={[s.payerLabel, { color: tint }]}>{label}</Text>
      </View>
      <View style={s.amountWrap}>
        <Text style={s.rupee}>₹</Text>
        <TextInput
          style={s.amountInput}
          placeholder="0"
          placeholderTextColor={colors.textFaint}
          keyboardType="numeric"
          value={value}
          onChangeText={onChangeText}
        />
      </View>
    </View>
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

  payerRow: { flexDirection: 'row', gap: spacing.sm },
  payerCol: { flex: 1 },
  payerLabelRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 5 },
  payerLabel: { fontFamily: fonts.bold, fontSize: 11, letterSpacing: 0.2 },
  payerHint: { fontFamily: fonts.regular, fontSize: 11.5, lineHeight: 17, color: colors.textMuted, marginBottom: spacing.md },

  blockTotal: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    marginTop: spacing.sm, paddingTop: spacing.sm,
    borderTopWidth: 1, borderTopColor: colors.borderSoft,
  },
  blockTotalLabel: { fontFamily: fonts.semibold, fontSize: 12, color: colors.textMuted },
  blockTotalValue: { fontFamily: fonts.extrabold, fontSize: 15, letterSpacing: -0.2, color: colors.text },

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
