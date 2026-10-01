import { useAuthStore } from "@/stores/authStore";
import { Card } from "@/components/ui/Card";
import { PortalSwitchPill } from "@/components/PortalSwitch";
import { AdminDashboardSummary, getAdminDashboardSummary } from "@/lib/api";
import { isNearScrollBottom } from "@/lib/scrollPagination";
import { colors, fonts, radius, shadow } from "@/lib/theme";
import { formatDateOnly } from "@/lib/utils";
import { Container, Payment, PDIVerification, useProductionStore } from "@/stores/productionStore";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import {
  AlertCircle,
  Bell,
  ClipboardList,
  IndianRupee,
  MinusCircle,
  Package,
  TrendingUp,
  Wallet,
} from "lucide-react-native";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useCallback, useEffect, useState } from "react";
import { SafeAreaView } from "react-native-safe-area-context";

const getContainerRefId = (value: string | { _id: string }) =>
  typeof value === "string" ? value : value._id;

const getTeamName = (container: Container) =>
  typeof container.assignedTeam === "string" ? "Team" : container.assignedTeam.name;

const getVerifiedForContainer = (verifications: PDIVerification[], containerId: string) =>
  verifications
    .filter((verification) => getContainerRefId(verification.container) === containerId)
    .reduce((sum, verification) => sum + (verification.verifiedQuantity || 0), 0);

const formatINR = (n: number) =>
  `₹${(n ?? 0).toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;

const findPaymentForContainer = (payments: Payment[], containerId: string) =>
  payments.find((payment) => getContainerRefId(payment.container) === containerId);

export default function AdminDashboard() {
  const { user, token } = useAuthStore();
  const {
    containers,
    containersPagination,
    payments,
    paymentsPagination,
    pdiVerifications,
    productionLogs,
    teams,
    teamsPagination,
    fetchContainers,
    fetchPayments,
    fetchTeams,
  } = useProductionStore();
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [summary, setSummary] = useState<AdminDashboardSummary | null>(null);
  const [summaryLoading, setSummaryLoading] = useState(true);

  const loadSummary = useCallback(async () => {
    if (!token) return;
    setSummaryLoading(true);
    try {
      const data = await getAdminDashboardSummary(token);
      setSummary(data);
    } catch (e: any) {
      Alert.alert("Error", e.message || "Failed to load summary");
    } finally {
      setSummaryLoading(false);
    }
  }, [token]);

  const loadDashboard = useCallback(async () => {
    if (!token) return;
    await Promise.all([
      fetchContainers(token),
      fetchPayments(token),
      fetchTeams(token),
      loadSummary(),
    ]);
  }, [fetchContainers, fetchPayments, fetchTeams, loadSummary, token]);

  useEffect(() => {
    loadDashboard().catch((error: any) => {
      Alert.alert("Error", error.message || "Failed to load dashboard");
    });
  }, [loadDashboard]);

  const handleRefresh = async () => {
    if (!token) return;
    setRefreshing(true);
    try {
      await loadDashboard();
    } catch (error: any) {
      Alert.alert("Error", error.message || "Failed to refresh dashboard");
    } finally {
      setRefreshing(false);
    }
  };

  const handleLoadMore = async () => {
    if (!token || loadingMore) return;
    const jobsNextPage = containersPagination.hasNextPage ? containersPagination.page + 1 : null;
    const paymentsNextPage = paymentsPagination.hasNextPage ? paymentsPagination.page + 1 : null;
    const teamsNextPage = teamsPagination.hasNextPage ? teamsPagination.page + 1 : null;
    if (!jobsNextPage && !paymentsNextPage && !teamsNextPage) return;

    setLoadingMore(true);
    try {
      await Promise.all([
        jobsNextPage ? fetchContainers(token, jobsNextPage) : Promise.resolve(),
        paymentsNextPage ? fetchPayments(token, paymentsNextPage) : Promise.resolve(),
        teamsNextPage ? fetchTeams(token, teamsNextPage) : Promise.resolve(),
      ]);
    } catch (error: any) {
      Alert.alert("Error", error.message || "Failed to load more dashboard data");
    } finally {
      setLoadingMore(false);
    }
  };

  const goToNotifications = () => router.push("/(admin)/notifications" as any);

  const pendingVerif = summary?.pendingVerify ?? productionLogs.filter((l) => l.status === "pending").length;

  const stats: { label: string; value: string; icon: any; color: string; bg: string; ring: string }[] = summary
    ? [
        { label: "Total Production", value: String(summary.totalProduction), icon: TrendingUp, color: colors.primary, bg: colors.primarySofter, ring: colors.primaryBorder },
        { label: "Pending Verify", value: String(summary.pendingVerify), icon: ClipboardList, color: colors.warning, bg: colors.warningSoft, ring: colors.warningBorder },
        { label: "Total Amount", value: formatINR(summary.totalAmount), icon: IndianRupee, color: colors.primary, bg: colors.primarySofter, ring: colors.primaryBorder },
        { label: "Paid", value: formatINR(summary.paidAmount), icon: Wallet, color: colors.success, bg: colors.successSoft, ring: colors.successBorder },
        { label: "Miscellaneous", value: formatINR(summary.miscellaneousAmount ?? 0), icon: MinusCircle, color: colors.warning, bg: colors.warningSoft, ring: colors.warningBorder },
        { label: "Remaining", value: formatINR(summary.remainingAmount), icon: Package, color: colors.danger, bg: colors.dangerSoft, ring: colors.dangerBorder },
        { label: "Total Hold", value: formatINR(summary.totalPenalty), icon: AlertCircle, color: colors.danger, bg: colors.dangerSoft, ring: colors.dangerBorder },
      ]
    : [];

  const statusColors: Record<string, string> = {
    active: colors.success,
    completed: colors.primary,
    cancelled: colors.danger,
  };
  const statusBg: Record<string, string> = {
    active: colors.successSoft,
    completed: colors.primarySofter,
    cancelled: colors.dangerSoft,
  };

  return (
    <View style={s.root}>
      <LinearGradient
        colors={[colors.primary, colors.primaryDark]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={s.headerBg}
      />
      <SafeAreaView style={s.safe} edges={["top"]}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          onScroll={({ nativeEvent }) => {
            if (isNearScrollBottom(nativeEvent)) handleLoadMore();
          }}
          scrollEventThrottle={400}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={colors.white} />
          }
        >
          <View style={s.headerRow}>
            <View style={{ flex: 1 }}>
              <Text style={s.greeting}>Good day,</Text>
              <Text style={s.name}>{user?.name}</Text>
              <View style={s.roleBadge}>
                <Text style={s.roleBadgeText}>ADMIN · FULL ACCESS</Text>
              </View>
            </View>
            <View style={s.headerActions}>
              {/* Only renders for an admin who runs both portals. */}
              <PortalSwitchPill />
              <Pressable onPress={goToNotifications} style={s.logoutBtn} hitSlop={8}>
                <Bell color={colors.white} size={20} />
              </Pressable>
            </View>
          </View>

          <View style={s.contentWrap}>
            {pendingVerif > 0 && (
              <View style={s.alert}>
                <AlertCircle color={colors.warning} size={18} />
                <Text style={s.alertText}>{pendingVerif} entries waiting for PDI verification</Text>
              </View>
            )}

            <Text style={s.sectionTitle}>OVERVIEW</Text>
            <View style={s.statsGrid}>
              {summaryLoading && !summary ? (
                [0, 1, 2].map((i) => <View key={i} style={[s.statCard, s.statSkeleton]} />)
              ) : (
                stats.map((stat) => (
                  <View
                    key={stat.label}
                    style={[s.statCard, { backgroundColor: stat.bg, borderColor: stat.ring }]}
                  >
                    <View style={[s.statIconWrap, { backgroundColor: colors.white }]}>
                      <stat.icon color={stat.color} size={18} />
                    </View>
                    <Text style={[s.statValue, { color: stat.color }]} numberOfLines={1}>
                      {stat.value}
                    </Text>
                    <Text style={s.statLabel}>{stat.label}</Text>
                  </View>
                ))
              )}
            </View>

            <Text style={s.sectionTitle}>RECENT CONTAINERS</Text>
            {containers.slice(0, 4).map((container) => {
              const verified = container.verifiedQuantity ?? getVerifiedForContainer(pdiVerifications, container._id);
              const payment = findPaymentForContainer(payments, container._id);
              const progress = container.quantity > 0
                ? Math.min((verified / container.quantity) * 100, 100)
                : 0;
              const statusColor = statusColors[container.status] ?? colors.textMuted;
              const penaltyPerUnit = container.penaltyPerUnit ?? 0;
              const pending = container.pendingQuantity ?? Math.max(0, container.quantity - verified);
              const totalPenalty = container.totalPenalty ?? pending * penaltyPerUnit;
              return (
                <Card key={container._id} style={s.jobCard} variant="elevated" padding={16}>
                  <View style={s.jobCardTop}>
                    <View style={s.jobLeft}>
                      <Text style={s.jobModel}>{container.model}</Text>
                      <Text style={s.jobTeam}>
                        {getTeamName(container)} · {formatDateOnly(container.date)}
                      </Text>
                    </View>
                    <View style={[s.badge, { backgroundColor: statusBg[container.status] ?? colors.surfaceAlt }]}>
                      <Text style={[s.badgeText, { color: statusColor }]}>
                        {container.status.toUpperCase()}
                      </Text>
                    </View>
                  </View>
                  <View style={s.progressBg}>
                    <View
                      style={[
                        s.progressFill,
                        { width: `${progress}%` as any, backgroundColor: statusColor },
                      ]}
                    />
                  </View>
                  <View style={s.jobStats}>
                    <JobStat label="Target" value={String(container.quantity)} />
                    <JobStat label="Verified" value={String(verified)} color={colors.success} />
                    <JobStat label="Rate" value={`₹${container.ratePerUnit}`} color={colors.primary} />
                    <JobStat label="Due" value={`₹${payment?.remainingAmount.toLocaleString() ?? 0}`} color={colors.danger} />
                  </View>
                  <View style={s.penaltyRow}>
                    <JobStat label="Pending" value={String(pending)} color={colors.danger} />
                    <JobStat label="Hold/Veh" value={`₹${penaltyPerUnit}`} color={colors.danger} />
                    <JobStat label="Total Hold" value={formatINR(totalPenalty)} color={colors.danger} />
                  </View>
                </Card>
              );
            })}

            <Text style={s.sectionTitle}>TEAMS ({teams.length})</Text>
            <View style={s.teamsRow}>
              {teams.map((team) => {
                const isPdi = team.role === "pdi";
                return (
                  <View
                    key={team._id}
                    style={[
                      s.teamChip,
                      {
                        backgroundColor: isPdi ? colors.warningSoft : colors.successSoft,
                        borderColor: isPdi ? colors.warningBorder : colors.successBorder,
                      },
                    ]}
                  >
                    <Text style={[s.teamChipType, { color: isPdi ? colors.warning : colors.success }]}>
                      {isPdi ? "PDI" : "PRODUCTION"}
                    </Text>
                    <Text style={s.teamChipName}>{team.name}</Text>
                    <Text style={s.teamChipCount} numberOfLines={1}>{team.email}</Text>
                  </View>
                );
              })}
            </View>
            {loadingMore && <ActivityIndicator color={colors.primary} style={{ marginVertical: 16 }} />}
            <View style={{ height: 32 }} />
          </View>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

function JobStat({ label, value, color = colors.text }: { label: string; value: string; color?: string }) {
  return (
    <View style={s.jobStat}>
      <Text style={s.jobStatLbl}>{label}</Text>
      <Text style={[s.jobStatVal, { color }]} numberOfLines={1}>
        {value}
      </Text>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bgSubtle },
  headerBg: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 220,
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
  },
  safe: { flex: 1 },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 24,
  },
  greeting: { fontFamily: fonts.medium, fontSize: 13, color: "rgba(255,255,255,0.85)" },
  name: {
    fontFamily: fonts.extrabold,
    fontSize: 24,
    color: colors.white,
    letterSpacing: -0.3,
    marginTop: 2,
  },
  roleBadge: {
    marginTop: 10,
    backgroundColor: "rgba(255,255,255,0.22)",
    borderRadius: radius.md,
    paddingVertical: 5,
    paddingHorizontal: 12,
    alignSelf: "flex-start",
  },
  roleBadgeText: {
    fontFamily: fonts.bold,
    fontSize: 10,
    color: colors.white,
    letterSpacing: 1.4,
  },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: 8, flexShrink: 0 },
  logoutBtn: {
    padding: 10,
    backgroundColor: "rgba(255,255,255,0.18)",
    borderRadius: radius.md,
  },
  contentWrap: {
    backgroundColor: colors.bgSubtle,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingTop: 22,
    minHeight: 600,
  },
  alert: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginHorizontal: 20,
    marginBottom: 16,
    backgroundColor: colors.warningSoft,
    borderRadius: radius.md,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.warningBorder,
  },
  alertText: {
    fontFamily: fonts.semibold,
    fontSize: 13,
    color: colors.warning,
    flex: 1,
  },
  sectionTitle: {
    fontFamily: fonts.bold,
    fontSize: 11,
    color: colors.textFaint,
    letterSpacing: 1.6,
    paddingHorizontal: 20,
    marginBottom: 12,
    marginTop: 6,
  },
  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    paddingHorizontal: 20,
    marginBottom: 22,
  },
  statCard: {
    width: "47%",
    borderRadius: radius.lg,
    padding: 16,
    gap: 10,
    borderWidth: 1,
  },
  statSkeleton: {
    height: 110,
    backgroundColor: colors.surfaceAlt,
    borderColor: colors.borderSoft,
  },
  statIconWrap: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    ...(shadow.sm as object),
  },
  statValue: { fontFamily: fonts.extrabold, fontSize: 22, letterSpacing: -0.3 },
  statLabel: { fontFamily: fonts.medium, fontSize: 12, color: colors.textMuted },
  jobCard: { marginHorizontal: 20, marginBottom: 12 },
  jobCardTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 12,
  },
  jobLeft: { flex: 1, paddingRight: 8 },
  jobModel: { fontFamily: fonts.bold, fontSize: 15, color: colors.text },
  jobTeam: { fontFamily: fonts.regular, fontSize: 12, color: colors.textMuted, marginTop: 2 },
  badge: { borderRadius: radius.sm, paddingHorizontal: 8, paddingVertical: 4 },
  badgeText: { fontFamily: fonts.bold, fontSize: 10, letterSpacing: 0.5 },
  progressBg: {
    height: 6,
    backgroundColor: colors.surfaceAlt,
    borderRadius: radius.full,
    marginBottom: 12,
    overflow: "hidden",
  },
  progressFill: { height: "100%", borderRadius: radius.full },
  jobStats: { flexDirection: "row", justifyContent: "space-between" },
  penaltyRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: colors.dangerBorder,
  },
  jobStat: { alignItems: "center", flex: 1 },
  jobStatLbl: {
    fontFamily: fonts.medium,
    fontSize: 10,
    color: colors.textFaint,
    marginBottom: 2,
    letterSpacing: 0.4,
    textTransform: "uppercase",
  },
  jobStatVal: { fontFamily: fonts.bold, fontSize: 14 },
  teamsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    paddingHorizontal: 20,
  },
  teamChip: {
    borderRadius: radius.md,
    padding: 14,
    flex: 1,
    minWidth: "45%",
    borderWidth: 1,
  },
  teamChipType: { fontFamily: fonts.bold, fontSize: 10, letterSpacing: 1, marginBottom: 4 },
  teamChipName: { fontFamily: fonts.bold, fontSize: 14, color: colors.text, marginBottom: 2 },
  teamChipCount: { fontFamily: fonts.regular, fontSize: 11, color: colors.textMuted },
});
