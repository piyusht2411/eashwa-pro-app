import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import {
  Truck, Users, MapPin, DollarSign,
  Clock, CheckCircle, AlertCircle, ChevronRight,
} from 'lucide-react-native';

import { getAdminDashboard } from '@/lib/api';
import { useAuthStore } from '@/stores/authStore';
import { colors, fonts, radius, shadow, spacing } from '@/lib/theme';
import type { AdminDashboard, Visit } from '@/types';

export default function AdminDashboardScreen() {
  const { token, user } = useAuthStore();
  const [data, setData] = useState<AdminDashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    if (!token) return;
    try {
      const res = await getAdminDashboard(token);
      setData(res);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [token]);

  useEffect(() => { load(); }, [load]);

  const onRefresh = () => { setRefreshing(true); load(); };

  if (loading) {
    return (
      <SafeAreaView style={s.centered}>
        <ActivityIndicator size="large" color={colors.primary} />
      </SafeAreaView>
    );
  }

  const stats = data?.stats;

  return (
    <SafeAreaView style={s.root} edges={['top']}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
      >
        {/* Header */}
        <LinearGradient colors={[colors.primaryLight, colors.primary, colors.primaryDark]} style={s.header}>
          <Text style={s.greeting}>Good morning 👋</Text>
          <Text style={s.name}>{user?.name}</Text>
          <Text style={s.role}>Administrator</Text>
        </LinearGradient>

        <View style={s.body}>
          {/* Stats Grid */}
          <Text style={s.sectionTitle}>Overview</Text>
          <View style={s.grid}>
            <StatCard icon={<Users size={20} color={colors.primary} />} label="Drivers" value={stats?.totalDrivers ?? 0} bg={colors.primarySoft} />
            <StatCard icon={<Truck size={20} color={colors.info} />} label="Total Visits" value={stats?.totalVisits ?? 0} bg={colors.infoSoft} />
            <StatCard icon={<MapPin size={20} color={colors.success} />} label="Distance (km)" value={stats?.totalDistance ?? 0} bg={colors.successSoft} />
            <StatCard icon={<DollarSign size={20} color={colors.warning} />} label="Total Expense" value={`₹${(stats?.totalExpense ?? 0).toLocaleString('en-IN')}`} bg={colors.warningSoft} />
            <StatCard icon={<Clock size={20} color={colors.danger} />} label="Pending Reimb." value={`₹${(stats?.pendingReimbursements ?? 0).toLocaleString('en-IN')}`} bg={colors.dangerSoft} />
            <StatCard icon={<CheckCircle size={20} color={colors.success} />} label="Approved Reimb." value={`₹${(stats?.approvedReimbursements ?? 0).toLocaleString('en-IN')}`} bg={colors.successSoft} />
          </View>

          {/* Pending Approvals Banner */}
          {(stats?.pendingApprovals ?? 0) > 0 && (
            <TouchableOpacity
              style={s.approvalBanner}
              onPress={() => router.push('/(transport-admin)/expense-approvals' as any)}
              activeOpacity={0.85}
            >
              <View style={s.approvalLeft}>
                <AlertCircle size={20} color={colors.danger} />
                <Text style={s.approvalText}>
                  {stats?.pendingApprovals} expense{stats?.pendingApprovals !== 1 ? 's' : ''} awaiting approval
                </Text>
              </View>
              <ChevronRight size={18} color={colors.danger} />
            </TouchableOpacity>
          )}

          {/* Recent Visits */}
          <View style={s.sectionRow}>
            <Text style={s.sectionTitle}>Recent Visits</Text>
            <TouchableOpacity onPress={() => router.push('/(transport-admin)/visits' as any)}>
              <Text style={s.seeAll}>See all</Text>
            </TouchableOpacity>
          </View>

          {(data?.recentVisits ?? []).length === 0 ? (
            <View style={s.empty}><Text style={s.emptyText}>No visits yet</Text></View>
          ) : (
            data?.recentVisits.map((visit) => (
              <VisitRow key={visit._id} visit={visit} onPress={() => router.push({ pathname: '/(transport-admin)/visit-detail' as any, params: { id: visit._id } })} />
            ))
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function StatCard({ icon, label, value, bg }: { icon: React.ReactNode; label: string; value: string | number; bg: string }) {
  return (
    <View style={[s.statCard, { backgroundColor: bg }]}>
      <View style={s.statIcon}>{icon}</View>
      <Text style={s.statValue}>{value}</Text>
      <Text style={s.statLabel}>{label}</Text>
    </View>
  );
}

function VisitRow({ visit, onPress }: { visit: Visit; onPress: () => void }) {
  const driver = typeof visit.driver === 'object' ? visit.driver : null;
  return (
    <TouchableOpacity style={s.visitRow} onPress={onPress} activeOpacity={0.8}>
      <View style={s.visitLeft}>
        <Text style={s.visitDriver}>{driver?.name ?? 'Unknown Driver'}</Text>
        <Text style={s.visitDest}>{visit.destination}</Text>
        <Text style={s.visitMeta}>{visit.totalDays} days · {visit.distance} km</Text>
      </View>
      <ChevronRight size={18} color={colors.textFaint} />
    </TouchableOpacity>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bgSubtle },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.bgSubtle },
  header: {
    paddingHorizontal: spacing['2xl'],
    paddingTop: spacing.xl,
    paddingBottom: spacing['3xl'],
    borderBottomLeftRadius: radius.xl,
    borderBottomRightRadius: radius.xl,
  },
  greeting: { color: 'rgba(255,255,255,0.8)', fontFamily: fonts.regular, fontSize: 13 },
  name: { color: colors.white, fontFamily: fonts.extrabold, fontSize: 24, marginTop: 2 },
  role: { color: 'rgba(255,255,255,0.7)', fontFamily: fonts.medium, fontSize: 12, marginTop: 2 },
  body: { padding: spacing.lg, paddingTop: spacing.xl },
  sectionRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.sm, marginTop: spacing.lg },
  sectionTitle: { fontFamily: fonts.bold, fontSize: 16, color: colors.text, marginBottom: spacing.sm, marginTop: spacing.sm },
  seeAll: { fontFamily: fonts.semibold, fontSize: 13, color: colors.primary },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: spacing.sm },
  statCard: {
    width: '47.5%',
    borderRadius: radius.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.borderSoft,
    ...shadow.sm,
  },
  statIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
    ...shadow.sm,
  },
  statValue: { fontFamily: fonts.extrabold, fontSize: 20, color: colors.text },
  statLabel: { fontFamily: fonts.medium, fontSize: 12, color: colors.textSecondary, marginTop: 2 },
  approvalBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.dangerSoft,
    borderRadius: radius.md,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.dangerBorder,
    marginBottom: spacing.lg,
  },
  approvalLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  approvalText: { fontFamily: fonts.semibold, fontSize: 13, color: colors.danger },
  visitRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    borderRadius: radius.md,
    padding: spacing.lg,
    marginBottom: spacing.sm,
    borderLeftWidth: 4,
    borderLeftColor: colors.primary,
    ...shadow.sm,
  },
  visitLeft: { flex: 1 },
  visitDriver: { fontFamily: fonts.semibold, fontSize: 14, color: colors.text },
  visitDest: { fontFamily: fonts.regular, fontSize: 13, color: colors.textSecondary, marginTop: 2 },
  visitMeta: { fontFamily: fonts.medium, fontSize: 11, color: colors.textMuted, marginTop: 4 },
  empty: { alignItems: 'center', padding: spacing['3xl'] },
  emptyText: { fontFamily: fonts.medium, fontSize: 14, color: colors.textFaint },
});
