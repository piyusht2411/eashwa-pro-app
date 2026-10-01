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
import {
  AlertCircle,
  CheckCircle2,
  ChevronRight,
  Gauge,
  HandCoins,
  Hourglass,
  Receipt,
  Route,
  Truck,
  Users,
  Wallet,
} from 'lucide-react-native';

import { getAdminDashboard } from '@/lib/api';
import { useAuthStore } from '@/stores/authStore';
import { colors, fonts, radius, shadow, spacing } from '@/lib/theme';
import { formatCount, formatINR, formatINRCompact, formatKm } from '@/lib/format';
import DashboardHeader from '@/components/ui/DashboardHeader';
import { PortalSwitchPill } from '@/components/PortalSwitch';
import StatTile from '@/components/ui/StatTile';
import SectionHeader from '@/components/ui/SectionHeader';
import EmptyState from '@/components/ui/EmptyState';
import VisitCard from '@/components/ui/VisitCard';
import type { AdminDashboard } from '@/types';

const HERO_OVERLAP = 26;

export default function AdminDashboardScreen() {
  const { token, user } = useAuthStore();
  const [data, setData] = useState<AdminDashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    if (!token) return;
    try { setData(await getAdminDashboard(token)); }
    catch (e) { console.error(e); }
    finally { setLoading(false); setRefreshing(false); }
  }, [token]);

  useEffect(() => { load(); }, [load]);

  if (loading) {
    return (
      <SafeAreaView style={s.centered}>
        <ActivityIndicator size="large" color={colors.primary} />
      </SafeAreaView>
    );
  }

  const stats = data?.stats;
  const recentVisits = data?.recentVisits ?? [];
  const pending = stats?.pendingApprovals ?? 0;

  return (
    <SafeAreaView style={s.root} edges={['top']}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={s.scroll}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={colors.primary} />
        }
      >
        <DashboardHeader
          name={user?.name}
          subtitle="Fleet activity at a glance"
          /* Only renders for an admin who runs both portals. */
          right={<PortalSwitchPill />}
        />

        <View style={s.body}>
          {/* Reimbursement split — the number an admin actually acts on. */}
          <View style={s.heroCard}>
            <View style={s.heroTop}>
              <View style={s.heroIcon}>
                <Wallet size={19} color={colors.primaryDark} strokeWidth={2.3} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.heroLabel}>Total Expense (approved)</Text>
                <Text style={s.heroValue} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7}>
                  {formatINR(stats?.totalExpense)}
                </Text>
                {(stats?.pendingExpense ?? 0) > 0 ? (
                  <Text style={s.heroHint}>
                    {formatINR(stats?.pendingExpense)} awaiting approval — not counted
                  </Text>
                ) : null}
              </View>
            </View>

            <View style={s.heroDivider} />

            <View style={s.splitRow}>
              <View style={s.splitCol}>
                <View style={s.splitHead}>
                  <Hourglass size={12} color={colors.warning} strokeWidth={2.4} />
                  <Text style={s.splitLabel}>Pending</Text>
                </View>
                <Text style={[s.splitValue, { color: colors.warning }]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7}>
                  {formatINR(stats?.pendingReimbursements)}
                </Text>
              </View>
              <View style={s.splitDivider} />
              <View style={s.splitCol}>
                <View style={s.splitHead}>
                  <CheckCircle2 size={12} color={colors.success} strokeWidth={2.4} />
                  <Text style={s.splitLabel}>Approved</Text>
                </View>
                <Text style={[s.splitValue, { color: colors.success }]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7}>
                  {formatINR(stats?.approvedReimbursements)}
                </Text>
              </View>
            </View>
          </View>

          {pending > 0 ? (
            <TouchableOpacity
              style={s.approvalBanner}
              onPress={() => router.push('/(transport-admin)/expense-approvals' as any)}
              activeOpacity={0.88}
            >
              <View style={s.approvalIcon}>
                <AlertCircle size={17} color={colors.danger} strokeWidth={2.3} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.approvalTitle}>
                  {pending} expense{pending !== 1 ? 's' : ''} awaiting approval
                </Text>
                <Text style={s.approvalSub}>Tap to review and clear the queue</Text>
              </View>
              <ChevronRight size={17} color={colors.danger} />
            </TouchableOpacity>
          ) : null}

          <SectionHeader title="Overview" />
          <View style={s.grid}>
            <StatTile
              icon={<Users size={19} color={colors.primaryDark} strokeWidth={2.2} />}
              label="Drivers"
              value={formatCount(stats?.totalDrivers)}
              accent="brand"
            />
            <StatTile
              icon={<Truck size={19} color={colors.info} strokeWidth={2.2} />}
              label="Total Visits"
              value={formatCount(stats?.totalVisits)}
              accent="info"
            />
            <StatTile
              icon={<Gauge size={19} color={colors.success} strokeWidth={2.2} />}
              label="Distance Covered"
              value={formatKm(stats?.totalDistance)}
              accent="success"
            />
            <StatTile
              icon={<Receipt size={19} color={colors.warning} strokeWidth={2.2} />}
              label="Approved Expense"
              value={formatINRCompact(stats?.totalExpense)}
              accent="warning"
            />
            <StatTile
              icon={<Hourglass size={19} color={colors.danger} strokeWidth={2.2} />}
              label="Pending Reimb."
              value={formatINRCompact(stats?.pendingReimbursements)}
              accent="danger"
            />
            <StatTile
              icon={<HandCoins size={19} color={colors.success} strokeWidth={2.2} />}
              label="Approved Reimb."
              value={formatINRCompact(stats?.approvedReimbursements)}
              accent="success"
            />
          </View>

          <SectionHeader
            title="Recent Visits"
            actionLabel="See all"
            onAction={() => router.push('/(transport-admin)/visits' as any)}
          />

          {recentVisits.length === 0 ? (
            <EmptyState
              icon={<Route size={24} color={colors.primary} strokeWidth={2} />}
              title="No visits recorded"
              subtitle="Visits created by the accounts team will appear here."
            />
          ) : (
            recentVisits.map((v) => (
              <VisitCard
                key={v._id}
                visit={v}
                onPress={() => router.push({ pathname: '/(transport-admin)/visit-detail' as any, params: { id: v._id } })}
              />
            ))
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bgSubtle },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.bgSubtle },
  scroll: { paddingBottom: spacing['4xl'] },
  body: { paddingHorizontal: spacing.lg, marginTop: -HERO_OVERLAP },

  heroCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.borderSoft,
    ...shadow.md,
  },
  heroTop: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  heroIcon: {
    width: 42,
    height: 42,
    borderRadius: radius.md,
    backgroundColor: colors.primarySofter,
    borderWidth: 1,
    borderColor: colors.primaryBorder,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroLabel: { fontFamily: fonts.medium, fontSize: 12.5, color: colors.textMuted },
  heroValue: { fontFamily: fonts.extrabold, fontSize: 27, lineHeight: 33, letterSpacing: -0.7, color: colors.text, marginTop: 1 },
  heroHint: { fontFamily: fonts.medium, fontSize: 11, color: colors.warning, marginTop: 3 },
  heroDivider: { height: 1, backgroundColor: colors.borderSoft, marginVertical: spacing.md },

  splitRow: { flexDirection: 'row', alignItems: 'stretch' },
  splitCol: { flex: 1 },
  splitHead: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  splitLabel: { fontFamily: fonts.medium, fontSize: 11.5, color: colors.textMuted },
  splitValue: { fontFamily: fonts.bold, fontSize: 16, letterSpacing: -0.3, marginTop: 3 },
  splitDivider: { width: 1, backgroundColor: colors.borderSoft, marginHorizontal: spacing.lg },

  approvalBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.dangerSoft,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.dangerBorder,
    padding: spacing.md,
    marginTop: spacing.md,
  },
  approvalIcon: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  approvalTitle: { fontFamily: fonts.semibold, fontSize: 13.5, color: colors.text },
  approvalSub: { fontFamily: fonts.regular, fontSize: 11.5, color: colors.textMuted, marginTop: 1 },

  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },
});
