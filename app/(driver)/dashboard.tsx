import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import {
  Truck,
  MapPin,
  DollarSign,
  CheckCircle,
  Clock,
  ChevronRight,
} from "lucide-react-native";

import { getMyDriverDashboard } from "@/lib/api";
import { useAuthStore } from "@/stores/authStore";
import { colors, fonts, radius, shadow, spacing } from "@/lib/theme";
import type { DriverDashboard, Visit } from "@/types";

export default function DriverDashboardScreen() {
  const { token, user } = useAuthStore();
  const [data, setData] = useState<DriverDashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const load = useCallback(async () => {
    if (!token) return;
    try {
      setData(await getMyDriverDashboard(token));
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [token]);

  useEffect(() => {
    load();
  }, [load]);

  if (loading)
    return (
      <SafeAreaView style={s.centered}>
        <ActivityIndicator size="large" color={colors.primary} />
      </SafeAreaView>
    );

  const stats = data?.stats;

  return (
    <SafeAreaView style={s.root} edges={["top"]}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              load();
            }}
            tintColor={colors.primary}
          />
        }
      >
        <LinearGradient
          colors={[colors.primaryLight, colors.primary, colors.primaryDark]}
          style={s.header}
        >
          <Text style={s.greeting}>Hello! 👋</Text>
          <Text style={s.name}>{user?.name ?? data?.driver?.name}</Text>
          <Text style={s.vehicle}>{data?.driver?.vehicleNumber}</Text>
        </LinearGradient>

        <View style={s.body}>
          <Text style={s.sectionTitle}>My Summary</Text>
          <View style={s.grid}>
            <StatCard
              icon={<Truck size={20} color={colors.primary} />}
              label="Total Visits"
              value={stats?.totalVisits ?? 0}
              bg={colors.primarySoft}
            />
            <StatCard
              icon={<MapPin size={20} color={colors.info} />}
              label="Distance (km)"
              value={stats?.totalDistance ?? 0}
              bg={colors.infoSoft}
            />
            <StatCard
              icon={<DollarSign size={20} color={colors.warning} />}
              label="Total Expense"
              value={`₹${(stats?.totalExpense ?? 0).toLocaleString("en-IN")}`}
              bg={colors.warningSoft}
            />
            <StatCard
              icon={<CheckCircle size={20} color={colors.success} />}
              label="Approved Reimb."
              value={`₹${(stats?.approvedReimbursements ?? 0).toLocaleString("en-IN")}`}
              bg={colors.successSoft}
            />
          </View>

          {/* Pending Balance */}
          <LinearGradient
            colors={[colors.primaryLight, colors.primary, colors.primaryDark]}
            style={s.balanceCard}
          >
            <View>
              <Text style={s.balanceLabel}>Pending Reimbursement</Text>
              <Text style={s.balanceSubLabel}>Awaiting admin approval</Text>
            </View>
            <Text style={s.balanceAmount}>
              ₹{(stats?.pendingBalance ?? 0).toLocaleString("en-IN")}
            </Text>
          </LinearGradient>

          {/* Recent Visits */}
          <Text style={s.sectionTitle}>Recent Visits</Text>
          {(data?.recentVisits ?? []).length === 0 ? (
            <View style={s.empty}>
              <Text style={s.emptyText}>No visits assigned yet</Text>
            </View>
          ) : (
            (data?.recentVisits ?? []).map((v) => (
              <TouchableOpacity
                key={v._id}
                style={s.visitRow}
                onPress={() =>
                  router.push({
                    pathname: "/(driver)/visit-detail" as any,
                    params: { id: v._id },
                  })
                }
                activeOpacity={0.8}
              >
                <View style={s.visitLeft}>
                  <Text style={s.visitDest}>{v.destination}</Text>
                  <Text style={s.visitMeta}>
                    {new Date(v.startDate).toLocaleDateString("en-IN")} –{" "}
                    {new Date(v.endDate).toLocaleDateString("en-IN")}
                  </Text>
                  <Text style={s.visitMeta}>
                    {v.totalDays} days · {v.distance} km
                  </Text>
                </View>
                <ChevronRight size={18} color={colors.textFaint} />
              </TouchableOpacity>
            ))
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function StatCard({
  icon,
  label,
  value,
  bg,
}: {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  bg: string;
}) {
  return (
    <View style={[s.statCard, { backgroundColor: bg }]}>
      <View style={s.statIcon}>{icon}</View>
      <Text style={s.statValue}>{value}</Text>
      <Text style={s.statLabel}>{label}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bgSubtle },
  centered: { flex: 1, alignItems: "center", justifyContent: "center" },
  header: {
    paddingHorizontal: spacing["2xl"],
    paddingTop: spacing.xl,
    paddingBottom: spacing["3xl"],
    borderBottomLeftRadius: radius.xl,
    borderBottomRightRadius: radius.xl,
  },
  greeting: {
    color: "rgba(255,255,255,0.8)",
    fontFamily: fonts.regular,
    fontSize: 13,
  },
  name: {
    color: colors.white,
    fontFamily: fonts.extrabold,
    fontSize: 24,
    marginTop: 2,
  },
  vehicle: {
    color: "rgba(255,255,255,0.75)",
    fontFamily: fonts.medium,
    fontSize: 13,
    marginTop: 2,
  },
  body: { padding: spacing.lg, paddingTop: spacing.xl },
  sectionTitle: {
    fontFamily: fonts.bold,
    fontSize: 16,
    color: colors.text,
    marginBottom: spacing.sm,
    marginTop: spacing.sm,
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginBottom: spacing.lg,
  },
  statCard: {
    width: "47.5%",
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
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.sm,
    ...shadow.sm,
  },
  statValue: { fontFamily: fonts.extrabold, fontSize: 20, color: colors.text },
  statLabel: {
    fontFamily: fonts.medium,
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
  },
  balanceCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderRadius: radius.lg,
    padding: spacing.xl,
    marginBottom: spacing.xl,
    ...shadow.lg,
  },
  balanceLabel: { fontFamily: fonts.bold, fontSize: 14, color: colors.white },
  balanceSubLabel: {
    fontFamily: fonts.regular,
    fontSize: 11,
    color: "rgba(255,255,255,0.75)",
    marginTop: 2,
  },
  balanceAmount: {
    fontFamily: fonts.extrabold,
    fontSize: 22,
    color: colors.white,
  },
  visitRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.white,
    borderRadius: radius.md,
    padding: spacing.lg,
    marginBottom: spacing.sm,
    borderLeftWidth: 4,
    borderLeftColor: colors.primary,
    ...shadow.sm,
  },
  visitLeft: { flex: 1 },
  visitDest: { fontFamily: fonts.semibold, fontSize: 14, color: colors.text },
  visitMeta: {
    fontFamily: fonts.medium,
    fontSize: 11,
    color: colors.textMuted,
    marginTop: 3,
  },
  empty: { alignItems: "center", padding: spacing["3xl"] },
  emptyText: {
    fontFamily: fonts.medium,
    fontSize: 14,
    color: colors.textFaint,
  },
});
