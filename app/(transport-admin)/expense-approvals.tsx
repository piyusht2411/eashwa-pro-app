import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { AlertCircle, CheckCircle, XCircle, ChevronRight } from 'lucide-react-native';

import { getPendingExpenses, approveExpenseItem, rejectExpenseItem } from '@/lib/api';
import { useAuthStore } from '@/stores/authStore';
import { colors, fonts, radius, shadow, spacing } from '@/lib/theme';
import type { Expense, Visit } from '@/types';

type PendingExpense = Omit<Expense, 'visit'> & { visit: Visit };
type ExpenseType = 'food' | 'cng' | 'other';

export default function ExpenseApprovalsScreen() {
  const { token } = useAuthStore();
  const [expenses, setExpenses] = useState<PendingExpense[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    if (!token) return;
    try {
      const res = await getPendingExpenses(token);
      setExpenses(res.expenses as any as PendingExpense[]);
    } catch (e) { console.error(e); }
    finally { setLoading(false); setRefreshing(false); }
  }, [token]);

  useEffect(() => { load(); }, [load]);

  const handleApprove = (expense: PendingExpense, type: ExpenseType) => {
    if (!token) return;
    Alert.alert('Approve', `Approve ${type} expense of ₹${expense[type].amount.toLocaleString('en-IN')}?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Approve', onPress: async () => {
          try { await approveExpenseItem(expense._id, type, token); load(); }
          catch (e: any) { Alert.alert('Error', e.message); }
        },
      },
    ]);
  };

  const handleReject = (expense: PendingExpense, type: ExpenseType) => {
    if (!token) return;
    Alert.prompt('Reject Expense', `Reason for rejecting ${type}:`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Reject', style: 'destructive', onPress: async (remark: string | undefined) => {
          if (!remark?.trim()) { Alert.alert('Required', 'Enter a reason'); return; }
          try { await rejectExpenseItem(expense._id, type, remark, token); load(); }
          catch (e: any) { Alert.alert('Error', e.message); }
        },
      },
    ]);
  };

  const renderItem = ({ item }: { item: PendingExpense }) => {
    const visit = typeof item.visit === 'object' ? item.visit : null;
    const driver = visit && typeof visit.driver === 'object' ? visit.driver : null;
    const pendingTypes: ExpenseType[] = (['food', 'cng', 'other'] as ExpenseType[]).filter(
      t => item[t]?.paidBy === 'driver' && item[t]?.status === 'pending'
    );

    return (
      <View style={s.card}>
        <TouchableOpacity
          style={s.cardHeader}
          onPress={() => visit && router.push({ pathname: '/(transport-admin)/visit-detail' as any, params: { id: typeof item.visit === 'string' ? item.visit : item.visit._id } })}
          activeOpacity={0.8}
        >
          <View style={s.headerLeft}>
            <Text style={s.driverName}>{driver?.name ?? '—'}</Text>
            <Text style={s.dest}>{visit?.destination ?? '—'} · {visit?.totalDays} days</Text>
          </View>
          <ChevronRight size={16} color={colors.textFaint} />
        </TouchableOpacity>

        {pendingTypes.map(type => (
          <View key={type} style={s.expenseRow}>
            <View>
              <Text style={s.expType}>{type.toUpperCase()}</Text>
              <Text style={s.expAmount}>₹{item[type].amount.toLocaleString('en-IN')}</Text>
            </View>
            <View style={s.actions}>
              <TouchableOpacity style={s.approveBtn} onPress={() => handleApprove(item, type)} activeOpacity={0.85}>
                <CheckCircle size={14} color={colors.white} />
                <Text style={s.actionText}>Approve</Text>
              </TouchableOpacity>
              <TouchableOpacity style={s.rejectBtn} onPress={() => handleReject(item, type)} activeOpacity={0.85}>
                <XCircle size={14} color={colors.white} />
                <Text style={s.actionText}>Reject</Text>
              </TouchableOpacity>
            </View>
          </View>
        ))}
      </View>
    );
  };

  return (
    <SafeAreaView style={s.root} edges={['top']}>
      <View style={s.topBar}>
        <AlertCircle size={22} color={colors.danger} />
        <Text style={s.title}>Pending Approvals</Text>
      </View>

      {loading ? (
        <ActivityIndicator style={{ marginTop: 60 }} size="large" color={colors.primary} />
      ) : (
        <FlatList
          data={expenses}
          keyExtractor={e => e._id}
          renderItem={renderItem}
          contentContainerStyle={s.list}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={colors.primary} />}
          ListEmptyComponent={
            <View style={s.empty}>
              <CheckCircle size={48} color={colors.success} />
              <Text style={s.emptyText}>All caught up!</Text>
              <Text style={s.emptySubtext}>No pending expense approvals</Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bgSubtle },
  topBar: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: spacing.lg, paddingVertical: spacing.lg },
  title: { fontFamily: fonts.extrabold, fontSize: 22, color: colors.text },
  list: { padding: spacing.lg, paddingTop: 4 },
  card: { backgroundColor: colors.white, borderRadius: radius.lg, marginBottom: spacing.sm, borderLeftWidth: 4, borderLeftColor: colors.primary, ...shadow.sm, overflow: 'hidden' },
  cardHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: spacing.lg, borderBottomWidth: 1.5, borderBottomColor: colors.borderSoft },
  headerLeft: { flex: 1 },
  driverName: { fontFamily: fonts.semibold, fontSize: 14, color: colors.text },
  dest: { fontFamily: fonts.regular, fontSize: 12, color: colors.textMuted, marginTop: 2 },
  expenseRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.lg, paddingVertical: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.borderSoft },
  expType: { fontFamily: fonts.bold, fontSize: 11, color: colors.textMuted, letterSpacing: 1 },
  expAmount: { fontFamily: fonts.extrabold, fontSize: 18, color: colors.text, marginTop: 2 },
  actions: { flexDirection: 'row', gap: 8 },
  approveBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: colors.success, borderRadius: radius.sm, paddingHorizontal: 12, paddingVertical: 8, ...shadow.sm },
  rejectBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: colors.danger, borderRadius: radius.sm, paddingHorizontal: 12, paddingVertical: 8, ...shadow.sm },
  actionText: { fontFamily: fonts.bold, fontSize: 12, color: colors.white },
  empty: { alignItems: 'center', paddingTop: 80, gap: 12 },
  emptyText: { fontFamily: fonts.bold, fontSize: 18, color: colors.text },
  emptySubtext: { fontFamily: fonts.regular, fontSize: 14, color: colors.textMuted },
});
