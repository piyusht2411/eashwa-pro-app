import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import {
  CheckCircle2,
  Gauge,
  HandCoins,
  Hourglass,
  Receipt,
  Route,
  Truck,
} from "lucide-react-native";

import { getMyDriverDashboard } from "@/lib/api";
import { useAuthStore } from "@/stores/authStore";
import { colors, fonts, radius, shadow, spacing } from "@/lib/theme";
import { formatCount, formatINR, formatINRCompact, formatKm } from "@/lib/format";
import DashboardHeader from "@/components/ui/DashboardHeader";
import StatTile from "@/components/ui/StatTile";
import SectionHeader from "@/components/ui/SectionHeader";
import EmptyState from "@/components/ui/EmptyState";
import VisitCard from "@/components/ui/VisitCard";
import type { DriverDashboard } from "@/types";

const HERO_OVERLAP = 26;

export default function DriverDashboardScreen() {
  const { token, user } = useAuthStore();
  const [data, setData] = useState<DriverDashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    if (!token) return;
    try { setData(await getMyDriverDashboard(token)); }
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
  const vehicle = data?.driver?.vehicleNumber;

  return (
    <SafeAreaView style={s.root} edges={["top"]}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={s.scroll}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={colors.primary} />
        }
      >
        <DashboardHeader
          name={user?.name ?? data?.driver?.name}
          right={
            <View style={s.vehicleChip}>
              <Truck size={13} color={colors.white} strokeWidth={2.3} />
              <Text style={s.vehicleChipText} numberOfLines={1}>
                {vehicle || "No vehicle"}
              </Text>
            </View>
          }
        />

        <View style={s.body}>
          {/* What the driver is owed — the reason they open the app. */}
          <View style={s.heroCard}>
            <View style={s.heroTop}>
              <View style={s.heroIcon}>
                <Hourglass size={19} color={colors.primaryDark} strokeWidth={2.3} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.heroLabel}>Pending Reimbursement</Text>
                <Text style={s.heroValue} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7}>
                  {formatINR(stats?.pendingBalance)}
                </Text>
              </View>
            </View>
            <View style={s.heroDivider} />
            <View style={s.heroFooter}>
              <CheckCircle2 size={13} color={colors.success} strokeWidth={2.4} />
              <Text style={s.heroFootLabel}>Approved so far</Text>
              <Text style={s.heroFootValue}>{formatINR(stats?.approvedReimbursements)}</Text>
            </View>
          </View>

          <SectionHeader title="My Summary" />
          <View style={s.grid}>
            <StatTile
              icon={<Truck size={19} color={colors.primaryDark} strokeWidth={2.2} />}
              label="Total Visits"
              value={formatCount(stats?.totalVisits)}
              accent="brand"
            />
            <StatTile
              icon={<Gauge size={19} color={colors.info} strokeWidth={2.2} />}
              label="Distance"
              value={formatKm(stats?.totalDistance)}
              accent="info"
            />
            <StatTile
              icon={<Receipt size={19} color={colors.warning} strokeWidth={2.2} />}
              label="Approved Expense"
              value={formatINRCompact(stats?.totalExpense)}
              accent="warning"
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
            onAction={() => router.push("/(driver)/visits" as any)}
          />

          {recentVisits.length === 0 ? (
            <EmptyState
              icon={<Route size={24} color={colors.primary} strokeWidth={2} />}
              title="No visits assigned yet"
              subtitle="Your trips will show up here once the accounts team assigns them."
            />
          ) : (
            recentVisits.map((v) => (
              <VisitCard
                key={v._id}
                visit={v}
                showDriver={false}
                onPress={() =>
                  router.push({ pathname: "/(driver)/visit-detail" as any, params: { id: v._id } })
                }
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
  centered: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: colors.bgSubtle },
  scroll: { paddingBottom: spacing["4xl"] },
  body: { paddingHorizontal: spacing.lg, marginTop: -HERO_OVERLAP },

  vehicleChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    maxWidth: 150,
    backgroundColor: "rgba(255,255,255,0.2)",
    borderRadius: radius.full,
    paddingHorizontal: 11,
    paddingVertical: 6,
  },
  vehicleChipText: {
    fontFamily: fonts.bold,
    fontSize: 11.5,
    letterSpacing: 0.4,
    color: colors.white,
  },

  heroCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.borderSoft,
    ...shadow.md,
  },
  heroTop: { flexDirection: "row", alignItems: "center", gap: spacing.md },
  heroIcon: {
    width: 42,
    height: 42,
    borderRadius: radius.md,
    backgroundColor: colors.primarySofter,
    borderWidth: 1,
    borderColor: colors.primaryBorder,
    alignItems: "center",
    justifyContent: "center",
  },
  heroLabel: { fontFamily: fonts.medium, fontSize: 12.5, color: colors.textMuted },
  heroValue: { fontFamily: fonts.extrabold, fontSize: 27, lineHeight: 33, letterSpacing: -0.7, color: colors.text, marginTop: 1 },
  heroDivider: { height: 1, backgroundColor: colors.borderSoft, marginVertical: spacing.md },
  heroFooter: { flexDirection: "row", alignItems: "center", gap: 6 },
  heroFootLabel: { flex: 1, fontFamily: fonts.regular, fontSize: 12, color: colors.textMuted },
  heroFootValue: { fontFamily: fonts.bold, fontSize: 13, color: colors.success },

  grid: { flexDirection: "row", flexWrap: "wrap", gap: spacing.md },
});
