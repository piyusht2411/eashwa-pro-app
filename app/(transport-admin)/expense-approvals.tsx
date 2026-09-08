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
import { Check, ChevronRight, CircleCheckBig, MapPin, X } from 'lucide-react-native';

import { getPendingExpenses, approveExpenseItem, rejectExpenseItem } from '@/lib/api';
import RejectReasonModal from '@/components/ui/RejectReasonModal';
import ExpenseTypeBadge from '@/components/ui/ExpenseTypeBadge';
import EmptyState from '@/components/ui/EmptyState';
import { useAuthStore } from '@/stores/authStore';
import { colors, fonts, radius, shadow, spacing } from '@/lib/theme';
import { formatDays, formatINR } from '@/lib/format';
import type { Expense, Visit } from '@/types';

type PendingExpense = Omit<Expense, 'visit'> & { visit: Visit };
type ExpenseType = 'food' | 'cng' | 'other';

export default function ExpenseApprovalsScreen() {
  const { token } = useAuthStore();
  const [expenses, setExpenses] = useState<PendingExpense[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [rejectTarget, setRejectTarget] = useState<{ expense: PendingExpense; type: ExpenseType } | null>(null);
  const [rejecting, setRejecting] = useState(false);

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
    Alert.alert('Approve', `Approve ${type} expense of ${formatINR(expense[type].amount)}?`, [
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
    setRejectTarget({ expense, type });
  };

  const submitReject = async (remark: string) => {
    if (!token || !rejectTarget) return;
    setRejecting(true);
    try {
      await rejectExpenseItem(rejectTarget.expense._id, rejectTarget.type, remark, token);
      setRejectTarget(null);
      load();
    } catch (e: any) {
      Alert.alert('Error', e.message);
    } finally {
      setRejecting(false);
    }
  };

  const pendingCount = expenses.reduce((sum, e) => {
    return sum + (['food', 'cng', 'other'] as ExpenseType[]).filter(
      t => e[t]?.paidBy === 'driver' && e[t]?.status === 'pending'
    ).length;
  }, 0);

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
          activeOpacity={0.85}
        >
          <View style={s.headerLeft}>
            <Text style={s.driverName} numberOfLines={1}>{driver?.name ?? '—'}</Text>
            <View style={s.destRow}>
              <MapPin size={11} color={colors.textFaint} strokeWidth={2.3} />
              <Text style={s.dest} numberOfLines={1}>
                {visit?.destination ?? '—'} · {formatDays(visit?.totalDays)}
              </Text>
            </View>
          </View>
          <ChevronRight size={16} color={colors.textFaint} />
        </TouchableOpacity>

        {pendingTypes.map((type, i) => (
          <View key={type} style={[s.expenseRow, i === pendingTypes.length - 1 && s.expenseRowLast]}>
            <View style={s.expenseLeft}>
              <ExpenseTypeBadge type={type} />
              <Text style={s.expAmount}>{formatINR(item[type].amount)}</Text>
            </View>
            <View style={s.actions}>
              <TouchableOpacity style={s.rejectBtn} onPress={() => handleReject(item, type)} activeOpacity={0.85}>
                <X size={15} color={colors.danger} strokeWidth={3} />
              </TouchableOpacity>
              <TouchableOpacity style={s.approveBtn} onPress={() => handleApprove(item, type)} activeOpacity={0.85}>
                <Check size={15} color={colors.white} strokeWidth={3} />
                <Text style={s.approveText}>Approve</Text>
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
        <Text style={s.title}>Approvals</Text>
        {!loading && pendingCount > 0 ? (
          <View style={s.countChip}>
            <Text style={s.countText}>{pendingCount} pending</Text>
          </View>
        ) : null}
      </View>

      {loading ? (
        <ActivityIndicator style={{ marginTop: 60 }} size="large" color={colors.primary} />
      ) : (
        <FlatList
          data={expenses}
          keyExtractor={e => e._id}
          renderItem={renderItem}
          contentContainerStyle={s.list}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={colors.primary} />}
          ListEmptyComponent={
            <EmptyState
              icon={<CircleCheckBig size={24} color={colors.success} strokeWidth={2} />}
              title="All caught up"
              subtitle="No expenses are waiting on your approval right now."
            />
          }
        />
      )}

      <RejectReasonModal
        visible={rejectTarget !== null}
        message={rejectTarget ? `Reason for rejecting ${rejectTarget.type}:` : undefined}
        submitting={rejecting}
        onCancel={() => setRejectTarget(null)}
        onSubmit={submitReject}
      />
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bgSubtle },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.md,
  },
  title: { fontFamily: fonts.extrabold, fontSize: 24, letterSpacing: -0.5, color: colors.text },
  countChip: {
    backgroundColor: colors.dangerSoft,
    borderWidth: 1,
    borderColor: colors.dangerBorder,
    borderRadius: radius.full,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  countText: { fontFamily: fonts.bold, fontSize: 11.5, color: colors.danger },
  list: { padding: spacing.lg, paddingTop: spacing.xs, paddingBottom: spacing['4xl'] },

  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.borderSoft,
    ...shadow.sm,
    overflow: 'hidden',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    backgroundColor: colors.bgMuted,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderSoft,
  },
  headerLeft: { flex: 1, gap: 3 },
  driverName: { fontFamily: fonts.bold, fontSize: 14.5, letterSpacing: -0.1, color: colors.text },
  destRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  dest: { flex: 1, fontFamily: fonts.medium, fontSize: 12, color: colors.textMuted },

  expenseRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderSoft,
  },
  expenseRowLast: { borderBottomWidth: 0 },
  expenseLeft: { flex: 1, gap: 6 },
  expAmount: { fontFamily: fonts.extrabold, fontSize: 19, letterSpacing: -0.4, color: colors.text },

  actions: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  rejectBtn: {
    width: 38,
    height: 38,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.dangerSoft,
    borderWidth: 1,
    borderColor: colors.dangerBorder,
  },
  approveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: colors.success,
    borderRadius: radius.md,
    paddingHorizontal: 14,
    height: 38,
  },
  approveText: { fontFamily: fonts.bold, fontSize: 13, color: colors.white },
});
