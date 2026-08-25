import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator, Alert, ScrollView, StyleSheet, Text,
  TextInput, TouchableOpacity, View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { ArrowLeft, Edit2, Trash2, Building2, User } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';

import {
  getVisitById, upsertExpense, deleteVisit,
  UpsertExpensePayload, ExpenseItemPayload,
} from '@/lib/api';
import { useAuthStore } from '@/stores/authStore';
import { colors, fonts, radius, shadow, spacing } from '@/lib/theme';
import type { Expense, ExpenseItem, ExpenseStatus, Visit } from '@/types';

type ExpenseType = 'food' | 'cng' | 'other';

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
      Alert.alert('Limit Exceeded', `Food allowance cannot exceed ₹${maxFood.toLocaleString('en-IN')} (₹400 × ${visit.totalDays} days)`);
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

  if (loading) return <SafeAreaView style={s.centered}><ActivityIndicator size="large" color={colors.primary} /></SafeAreaView>;
  if (!visit) return <SafeAreaView style={s.centered}><Text>Visit not found</Text></SafeAreaView>;

  const driver = typeof visit.driver === 'object' ? visit.driver : null;

  return (
    <SafeAreaView style={s.root} edges={['top']}>
      <LinearGradient colors={[colors.primaryLight, colors.primary, colors.primaryDark]} style={s.header}>
        <TouchableOpacity style={s.back} onPress={() => router.back()}><ArrowLeft size={22} color={colors.white} /></TouchableOpacity>
        <Text style={s.headerTitle}>Visit Details</Text>
        <View style={s.headerActions}>
          <TouchableOpacity onPress={handleDelete} style={s.iconBtn}><Trash2 size={18} color={colors.white} /></TouchableOpacity>
        </View>
      </LinearGradient>

      <ScrollView contentContainerStyle={s.body} showsVerticalScrollIndicator={false}>
        {/* Info */}
        <View style={s.section}>
          <Text style={s.sectionTitle}>Visit Information</Text>
          <InfoRow label="Driver" value={driver?.name ?? '—'} />
          <InfoRow label="Vehicle" value={visit.vehicleNumber} />
          <InfoRow label="Destination" value={visit.destination} />
          <InfoRow label="Dates" value={`${new Date(visit.startDate).toLocaleDateString('en-IN')} – ${new Date(visit.endDate).toLocaleDateString('en-IN')}`} />
          <InfoRow label="Total Days" value={`${visit.totalDays} days`} />
          <InfoRow label="Distance" value={`${visit.distance} km`} />
          <InfoRow label="Quantity" value={`${visit.quantity}`} />
          {visit.billNumber ? <InfoRow label="Bill No." value={visit.billNumber} /> : null}
        </View>

        {/* Expense Form */}
        <View style={s.section}>
          <Text style={s.sectionTitle}>Expenses</Text>
          <Text style={s.maxNote}>Food max: ₹{(400 * visit.totalDays).toLocaleString('en-IN')} (₹400 × {visit.totalDays} days)</Text>

          {(['food', 'cng', 'other'] as ExpenseType[]).map(type => (
            <View key={type} style={s.expenseBlock}>
              <Text style={s.expLabel}>{type.toUpperCase()}</Text>
              {expense && (
                <StatusBadge status={(expense as any)[type]?.status} />
              )}
              <TextInput
                style={s.amountInput}
                placeholder="Amount (₹)"
                placeholderTextColor={colors.textFaint}
                keyboardType="numeric"
                value={expenseForm[type].amount}
                onChangeText={v => setExpenseForm(p => ({ ...p, [type]: { ...p[type], amount: v } }))}
              />
              {type === 'other' && (
                <TextInput
                  style={s.amountInput}
                  placeholder="Description"
                  placeholderTextColor={colors.textFaint}
                  value={expenseForm.other.description}
                  onChangeText={v => setExpenseForm(p => ({ ...p, other: { ...p.other, description: v } }))}
                />
              )}
              {/* Paid By Toggle */}
              <View style={s.paidByRow}>
                <Text style={s.paidByLabel}>Paid by:</Text>
                <TouchableOpacity
                  style={[s.paidByBtn, expenseForm[type].paidBy === 'driver' && s.paidByBtnActive]}
                  onPress={() => setExpenseForm(p => ({ ...p, [type]: { ...p[type], paidBy: 'driver' } }))}
                >
                  <User size={13} color={expenseForm[type].paidBy === 'driver' ? colors.white : colors.textMuted} />
                  <Text style={[s.paidByBtnText, expenseForm[type].paidBy === 'driver' && s.paidByBtnTextActive]}>Driver</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[s.paidByBtn, expenseForm[type].paidBy === 'company' && s.paidByBtnCompanyActive]}
                  onPress={() => setExpenseForm(p => ({ ...p, [type]: { ...p[type], paidBy: 'company' } }))}
                >
                  <Building2 size={13} color={expenseForm[type].paidBy === 'company' ? colors.white : colors.textMuted} />
                  <Text style={[s.paidByBtnText, expenseForm[type].paidBy === 'company' && s.paidByBtnTextActive]}>Company</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))}

          <TouchableOpacity style={s.saveBtn} onPress={handleSaveExpense} disabled={saving} activeOpacity={0.85}>
            {saving ? <ActivityIndicator color={colors.white} size="small" /> : <Text style={s.saveBtnText}>Save Expenses</Text>}
          </TouchableOpacity>
        </View>

        {/* Totals */}
        {expense && (
          <View style={s.section}>
            <Text style={s.sectionTitle}>Totals</Text>
            <InfoRow label="Total Expense" value={`₹${expense.totalExpense.toLocaleString('en-IN')}`} />
            <InfoRow label="Pending Reimb." value={`₹${expense.pendingReimbursement.toLocaleString('en-IN')}`} />
            <InfoRow label="Approved Reimb." value={`₹${expense.approvedReimbursement.toLocaleString('en-IN')}`} />
            <InfoRow label="Rejected Amt." value={`₹${expense.rejectedAmount.toLocaleString('en-IN')}`} />
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

function StatusBadge({ status }: { status?: ExpenseStatus }) {
  if (!status) return null;
  const map: Record<string, { bg: string; text: string; label: string }> = {
    pending: { bg: colors.warningSoft, text: colors.warning, label: '⏳ Pending' },
    approved: { bg: colors.successSoft, text: colors.success, label: '✓ Approved' },
    rejected: { bg: colors.dangerSoft, text: colors.danger, label: '✗ Rejected' },
    auto_approved: { bg: colors.infoSoft, text: colors.info, label: '✓ Auto Approved' },
  };
  const c = map[status] ?? map['pending'];
  return <View style={[s.badge, { backgroundColor: c.bg }]}><Text style={[s.badgeText, { color: c.text }]}>{c.label}</Text></View>;
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bgSubtle },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.lg, paddingVertical: spacing.lg, gap: 12 },
  back: { padding: 4 },
  headerTitle: { flex: 1, fontFamily: fonts.bold, fontSize: 18, color: colors.white },
  headerActions: { flexDirection: 'row', gap: 8 },
  iconBtn: { padding: 6, backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: radius.sm },
  body: { padding: spacing.lg, paddingBottom: 40 },
  section: { backgroundColor: colors.white, borderRadius: radius.lg, padding: spacing.lg, marginBottom: spacing.md, borderLeftWidth: 4, borderLeftColor: colors.primary, ...shadow.sm },
  sectionTitle: { fontFamily: fonts.bold, fontSize: 15, color: colors.text, marginBottom: spacing.md, borderBottomWidth: 1.5, borderBottomColor: colors.border, paddingBottom: spacing.sm },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 7, borderBottomWidth: 1, borderBottomColor: colors.borderSoft },
  infoLabel: { fontFamily: fonts.medium, fontSize: 13, color: colors.textMuted },
  infoValue: { fontFamily: fonts.semibold, fontSize: 13, color: colors.text },
  maxNote: { fontFamily: fonts.medium, fontSize: 12, color: colors.warning, backgroundColor: colors.warningSoft, padding: spacing.sm, borderRadius: radius.sm, marginBottom: spacing.md },
  expenseBlock: { borderWidth: 1.5, borderColor: colors.border, borderRadius: radius.md, padding: spacing.md, marginBottom: spacing.sm, borderLeftWidth: 3, borderLeftColor: colors.primary },
  expLabel: { fontFamily: fonts.bold, fontSize: 13, color: colors.text, letterSpacing: 0.5, marginBottom: spacing.sm },
  amountInput: { borderWidth: 1.5, borderColor: colors.border, borderRadius: radius.sm, padding: spacing.md, fontFamily: fonts.regular, fontSize: 14, color: colors.text, marginBottom: spacing.sm },
  paidByRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  paidByLabel: { fontFamily: fonts.medium, fontSize: 12, color: colors.textMuted, marginRight: 4 },
  paidByBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 12, paddingVertical: 6, borderRadius: radius.sm, borderWidth: 1.5, borderColor: colors.border },
  paidByBtnActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  paidByBtnCompanyActive: { backgroundColor: colors.info, borderColor: colors.info },
  paidByBtnText: { fontFamily: fonts.medium, fontSize: 12, color: colors.textMuted },
  paidByBtnTextActive: { color: colors.white, fontFamily: fonts.bold },
  saveBtn: { backgroundColor: colors.primary, borderRadius: radius.md, paddingVertical: 14, alignItems: 'center', marginTop: spacing.md, ...shadow.sm },
  saveBtnText: { fontFamily: fonts.bold, fontSize: 15, color: colors.white },
  badge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 4, alignSelf: 'flex-start', marginBottom: spacing.sm },
  badgeText: { fontFamily: fonts.semibold, fontSize: 11 },
});
