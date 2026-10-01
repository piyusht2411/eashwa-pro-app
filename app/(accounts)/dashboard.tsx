import React, { useCallback, useState } from 'react';
import { ActivityIndicator, RefreshControl, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useFocusEffect } from 'expo-router';
import {
  AlertCircle,
  ChevronRight,
  MapPin,
  Plus,
  Receipt,
  Route,
  Truck,
  Users,
  Wallet,
} from 'lucide-react-native';

import { getAccountsDashboard } from '@/lib/api';
import { useAuthStore } from '@/stores/authStore';
import { colors, fonts, radius, shadow, spacing } from '@/lib/theme';
import { formatCount, formatINR, formatINRCompact } from '@/lib/format';
import DashboardHeader from '@/components/ui/DashboardHeader';
import StatTile from '@/components/ui/StatTile';
import SectionHeader from '@/components/ui/SectionHeader';
import EmptyState from '@/components/ui/EmptyState';
import VisitCard from '@/components/ui/VisitCard';
import type { AccountsDashboard } from '@/types';

const HERO_OVERLAP = 26;

export default function AccountsDashboardScreen() {
  const { token, user } = useAuthStore();
  const [data, setData] = useState<AccountsDashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    if (!token) return;
    try { setData(await getAccountsDashboard(token)); }
    catch (e) { console.error(e); }
    finally { setLoading(false); setRefreshing(false); }
  }, [token]);

  // Reload every time the tab comes into view, so a visit created (or edited)
  // elsewhere shows up without a manual pull-to-refresh.
  useFocusEffect(useCallback(() => { load(); }, [load]));

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
        <DashboardHeader name={user?.name} subtitle="Here's your transport overview" />

        <View style={s.body}>
          {/* Total expense — the headline figure, given its own card rather
              than being buried as one tile among six. */}
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
            <View style={s.heroFooter}>
              <Text style={s.heroFootLabel}>Across</Text>
              <Text style={s.heroFootValue}>{formatCount(stats?.totalVisits)} visits</Text>
              <View style={s.heroFootDot} />
              <Text style={s.heroFootValue}>{formatCount(stats?.totalDrivers)} drivers</Text>
            </View>
          </View>

          {pending > 0 ? (
            <TouchableOpacity
              style={s.alertBanner}
              onPress={() => router.push('/(accounts)/visits' as any)}
              activeOpacity={0.85}
            >
              <View style={s.alertIcon}>
                <AlertCircle size={17} color={colors.warning} strokeWidth={2.3} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.alertTitle}>
                  {pending} expense{pending !== 1 ? 's' : ''} awaiting approval
                </Text>
                <Text style={s.alertSub}>
                  {formatINR(stats?.pendingExpense)} held out of the total until approved
                </Text>
              </View>
              <ChevronRight size={17} color={colors.warning} />
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
              icon={<Receipt size={19} color={colors.warning} strokeWidth={2.2} />}
              label="Approved Expense"
              value={formatINRCompact(stats?.totalExpense)}
              accent="warning"
            />
            <StatTile
              icon={<AlertCircle size={19} color={colors.danger} strokeWidth={2.2} />}
              label="Pending Approvals"
              value={formatCount(pending)}
              accent="danger"
            />
          </View>

          <TouchableOpacity
            style={s.addVisitBtn}
            onPress={() => router.push('/(accounts)/create-visit' as any)}
            activeOpacity={0.88}
          >
            <View style={s.addVisitIcon}>
              <Plus size={16} color={colors.white} strokeWidth={2.8} />
            </View>
            <Text style={s.addVisitText}>Add New Visit</Text>
            <ChevronRight size={17} color="rgba(255,255,255,0.9)" />
          </TouchableOpacity>

          <SectionHeader
            title="Recent Visits"
            actionLabel="See all"
            onAction={() => router.push('/(accounts)/visits' as any)}
          />

          {recentVisits.length === 0 ? (
            <EmptyState
              icon={<Route size={24} color={colors.primary} strokeWidth={2} />}
              title="No visits yet"
              subtitle="Create the first visit to start tracking trips and expenses."
              actionLabel="Add a visit"
              onAction={() => router.push('/(accounts)/create-visit' as any)}
            />
          ) : (
            recentVisits.map((v) => (
              <VisitCard
                key={v._id}
                visit={v}
                onPress={() => router.push({ pathname: '/(accounts)/visit-detail' as any, params: { id: v._id } })}
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

  // Headline expense card, straddling the gradient header.
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
  heroFooter: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  heroFootLabel: { fontFamily: fonts.regular, fontSize: 12, color: colors.textFaint },
  heroFootValue: { fontFamily: fonts.semibold, fontSize: 12, color: colors.textSecondary },
  heroFootDot: { width: 3, height: 3, borderRadius: 2, backgroundColor: colors.borderStrong },

  alertBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.warningSoft,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.warningBorder,
    padding: spacing.md,
    marginTop: spacing.md,
  },
  alertIcon: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  alertTitle: { fontFamily: fonts.semibold, fontSize: 13.5, color: colors.text },
  alertSub: { fontFamily: fonts.regular, fontSize: 11.5, color: colors.textMuted, marginTop: 1 },

  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },

  addVisitBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.primary,
    borderRadius: radius.lg,
    paddingVertical: 14,
    paddingHorizontal: spacing.lg,
    marginTop: spacing.xl,
    ...shadow.brand,
  },
  addVisitIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.22)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  addVisitText: { flex: 1, fontFamily: fonts.bold, fontSize: 15, color: colors.white, letterSpacing: 0.1 },
});
