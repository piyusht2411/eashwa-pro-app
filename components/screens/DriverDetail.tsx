import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, RefreshControl, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { ArrowLeft, CircleCheckBig, Gauge, HandCoins, Receipt, Route, Truck } from 'lucide-react-native';

import { getDriverSummary } from '@/lib/api';
import { useAuthStore } from '@/stores/authStore';
import { colors, fonts, gradients, radius, shadow, spacing } from '@/lib/theme';
import { formatCount, formatINR, formatINRCompact, formatKm } from '@/lib/format';
import StatTile from '@/components/ui/StatTile';
import SectionHeader from '@/components/ui/SectionHeader';
import EmptyState from '@/components/ui/EmptyState';
import VisitCard from '@/components/ui/VisitCard';
import type { DriverSummary } from '@/types';

/** Initials from a name: "Ravi Kumar" → "RK". */
function initials(name?: string): string {
  const parts = (name ?? '').trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '—';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

/**
 * Driver profile + summary. Shared by the accounts and admin routes, which
 * differ only in where a visit tap navigates.
 */
export function DriverDetail({ visitDetailPath }: { visitDetailPath: string }) {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { token } = useAuthStore();
  const [data, setData] = useState<DriverSummary | null>(null);
  // Which driver the data on screen belongs to. This screen sits inside a tab
  // navigator, so opening another driver swaps the `id` param on the component
  // that is already mounted rather than mounting a fresh one. Without this the
  // previous driver stays on screen until the new one arrives.
  const [loadedId, setLoadedId] = useState<string | null>(null);
  const requestSeq = useRef(0);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    if (!token || !id) return;
    const seq = ++requestSeq.current;
    try {
      const summary = await getDriverSummary(id, token);
      // Another driver was opened while this was in flight — drop the answer.
      if (seq !== requestSeq.current) return;
      setData(summary);
    } catch (e) {
      if (seq !== requestSeq.current) return;
      console.error(e);
      setData(null);
    } finally {
      if (seq === requestSeq.current) {
        setLoadedId(id);
        setRefreshing(false);
      }
    }
  }, [token, id]);

  useEffect(() => { load(); }, [load]);

  // Show the spinner until the data on screen is this driver's, not the last one's.
  if (loadedId !== id) {
    return (
      <SafeAreaView style={s.centered}>
        <ActivityIndicator size="large" color={colors.primary} />
      </SafeAreaView>
    );
  }
  if (!data) {
    return (
      <SafeAreaView style={s.centered}>
        <Text style={s.notFound}>Driver not found</Text>
      </SafeAreaView>
    );
  }

  const { driver, summary, recentVisits } = data;

  return (
    <SafeAreaView style={s.root} edges={['top']}>
      <LinearGradient colors={gradients.brandDeep} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={s.header}>
        <TouchableOpacity style={s.back} onPress={() => router.back()} hitSlop={8}>
          <ArrowLeft size={20} color={colors.white} strokeWidth={2.4} />
        </TouchableOpacity>

        <View style={s.identity}>
          <View style={s.avatar}>
            <Text style={s.avatarText}>{initials(driver.name)}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={s.driverName} numberOfLines={1}>{driver.name}</Text>
            {driver.vehicleNumber ? (
              <View style={s.plate}>
                <Truck size={12} color={colors.white} strokeWidth={2.3} />
                <Text style={s.plateText}>{driver.vehicleNumber}</Text>
              </View>
            ) : (
              <Text style={s.noVehicle}>No vehicle assigned</Text>
            )}
          </View>
        </View>
      </LinearGradient>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={s.body}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={colors.primary} />
        }
      >
        {/* Pending balance — the number this screen exists to answer. */}
        <View style={s.balanceCard}>
          <View style={s.balanceLeft}>
            <Text style={s.balanceLabel}>Pending Reimbursement</Text>
            <Text style={s.balanceAmount} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7}>
              {formatINR(summary.pendingReimbursement)}
            </Text>
          </View>
          <View style={s.balanceIcon}>
            <HandCoins size={22} color={colors.white} strokeWidth={2.2} />
          </View>
        </View>

        <SectionHeader title="Summary" />
        <View style={s.grid}>
          <StatTile
            icon={<Truck size={19} color={colors.primaryDark} strokeWidth={2.2} />}
            label="Total Visits"
            value={formatCount(summary.totalVisits)}
            accent="brand"
          />
          <StatTile
            icon={<Gauge size={19} color={colors.info} strokeWidth={2.2} />}
            label="Distance"
            value={formatKm(summary.totalDistance)}
            accent="info"
          />
          <StatTile
            icon={<Receipt size={19} color={colors.warning} strokeWidth={2.2} />}
            label="Approved Expense"
            value={formatINRCompact(summary.totalExpense)}
            accent="warning"
          />
          <StatTile
            icon={<CircleCheckBig size={19} color={colors.success} strokeWidth={2.2} />}
            label="Approved Reimb."
            value={formatINRCompact(summary.approvedReimbursement)}
            accent="success"
          />
        </View>

        <SectionHeader title="Recent Visits" />
        {recentVisits.length === 0 ? (
          <EmptyState
            icon={<Route size={24} color={colors.primary} strokeWidth={2} />}
            title="No visits recorded"
            subtitle="This driver has not been assigned any visits yet."
          />
        ) : (
          recentVisits.map((v) => (
            <VisitCard
              key={v._id}
              visit={v}
              showDriver={false}
              onPress={() => router.push({ pathname: visitDetailPath as any, params: { id: v._id } })}
            />
          ))
        )}
      </ScrollView>
    </SafeAreaView>
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
  back: {
    width: 36,
    height: 36,
    borderRadius: radius.md,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  identity: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginTop: spacing.lg },
  avatar: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: 'rgba(255,255,255,0.22)',
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.35)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { fontFamily: fonts.extrabold, fontSize: 18, letterSpacing: 0.4, color: colors.white },
  driverName: { fontFamily: fonts.extrabold, fontSize: 22, letterSpacing: -0.4, color: colors.white },
  plate: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255,255,255,0.18)',
    borderRadius: radius.full,
    paddingHorizontal: 9,
    paddingVertical: 3,
    marginTop: 5,
  },
  plateText: { fontFamily: fonts.bold, fontSize: 11.5, letterSpacing: 0.4, color: colors.white },
  noVehicle: { fontFamily: fonts.medium, fontSize: 12.5, color: 'rgba(255,255,255,0.75)', marginTop: 4, fontStyle: 'italic' },

  body: { padding: spacing.lg, paddingBottom: spacing['4xl'] },

  balanceCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.primaryDark,
    borderRadius: radius.xl,
    padding: spacing.lg,
    ...shadow.brand,
  },
  balanceLeft: { flex: 1 },
  balanceLabel: { fontFamily: fonts.medium, fontSize: 12.5, color: 'rgba(255,255,255,0.85)' },
  balanceAmount: { fontFamily: fonts.extrabold, fontSize: 28, lineHeight: 34, letterSpacing: -0.8, color: colors.white, marginTop: 2 },
  balanceIcon: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },
});

export default DriverDetail;
