import { Card } from "@/components/ui/Card";
import { isNearScrollBottom } from "@/lib/scrollPagination";
import { colors, fonts, radius, shadow } from "@/lib/theme";
import { useAuthStore } from "@/stores/authStore";
import { Container, PDIVerification, Payment, ProductionLog, useProductionStore } from "@/stores/productionStore";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { CheckCircle, Clock, LogOut, Package, TrendingUp } from "lucide-react-native";
import { useCallback, useEffect, useState } from "react";
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
import { SafeAreaView } from "react-native-safe-area-context";

const getAssignedTeamId = (container: Container) =>
  typeof container.assignedTeam === "string" ? container.assignedTeam : container.assignedTeam._id;

const getLogTeamId = (log: ProductionLog) =>
  typeof log.team === "string" ? log.team : log.team._id;

const getLogContainerId = (log: ProductionLog) =>
  typeof log.container === "string" ? log.container : log.container._id;

const getVerificationContainerId = (verification: PDIVerification) =>
  typeof verification.container === "string" ? verification.container : verification.container._id;

const getVerificationLogId = (verification: PDIVerification) =>
  typeof verification.productionLog === "string"
    ? verification.productionLog
    : verification.productionLog._id;

const getPaymentTeamId = (payment: Payment) =>
  typeof payment.team === "string" ? payment.team : payment.team._id;

export default function TeamDashboard() {
  const { user, token, logout } = useAuthStore();
  const {
    containers,
    containersPagination,
    productionLogs,
    pdiVerifications,
    payments,
    fetchContainers,
    fetchMyPayments,
  } = useProductionStore();
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);

  const loadDashboard = useCallback(async () => {
    if (!token) return;
    await Promise.all([fetchContainers(token), fetchMyPayments(token)]);
  }, [fetchContainers, fetchMyPayments, token]);

  useEffect(() => {
    loadDashboard().catch((error: any) => {
      Alert.alert("Error", error.message || "Failed to load dashboard");
    });
  }, [loadDashboard]);

  const myContainers = containers.filter((c) => getAssignedTeamId(c) === user?._id);
  const myLogs = productionLogs.filter((l) => getLogTeamId(l) === user?._id);
  const myVerifs = pdiVerifications.filter((v) =>
    myContainers.some((c) => c._id === getVerificationContainerId(v)),
  );
  const myPayment = payments.filter((p) => getPaymentTeamId(p) === user?._id);

  const totalReported = myLogs.reduce((sum, l) => sum + l.reportedQuantity, 0);
  const totalVerified = myVerifs.reduce((sum, v) => sum + (v.verifiedQuantity || 0), 0);
  const totalEarned = myPayment.reduce((sum, p) => sum + p.totalAmount, 0);
  const totalPaid = myPayment.reduce((sum, p) => sum + p.paidAmount, 0);

  const handleLogout = async () => {
    await logout();
    router.replace("/(auth)/login");
  };

  const handleRefresh = async () => {
    if (!token) return;
    setRefreshing(true);
    try {
      await loadDashboard();
    } catch (e: any) {
      Alert.alert("Error", e.message || "Failed to refresh dashboard");
    } finally {
      setRefreshing(false);
    }
  };

  const handleLoadMore = async () => {
    if (!token || loadingMore || !containersPagination.hasNextPage) return;
    setLoadingMore(true);
    try {
      await fetchContainers(token, containersPagination.page + 1);
    } catch (e: any) {
      Alert.alert("Error", e.message || "Failed to load more jobs");
    } finally {
      setLoadingMore(false);
    }
  };

  const stats = [
    {
      label: "Active Containers",
      value: String(myContainers.filter((c) => c.status === "active").length),
      color: colors.primary,
      bg: colors.primarySofter,
      ring: colors.primaryBorder,
      icon: Package,
    },
    {
      label: "Total Reported",
      value: String(totalReported),
      color: colors.warning,
      bg: colors.warningSoft,
      ring: colors.warningBorder,
      icon: TrendingUp,
    },
    {
      label: "PDI Verified",
      value: String(totalVerified),
      color: colors.success,
      bg: colors.successSoft,
      ring: colors.successBorder,
      icon: CheckCircle,
    },
    {
      label: "Amount Due",
      value: `₹${(totalEarned - totalPaid).toLocaleString()}`,
      color: colors.danger,
      bg: colors.dangerSoft,
      ring: colors.dangerBorder,
      icon: Clock,
    },
  ];

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
              <Text style={s.greeting}>Welcome back,</Text>
              <Text style={s.name}>{user?.name}</Text>
              <View style={s.roleBadge}>
                <Text style={s.roleBadgeText}>PRODUCTION TEAM</Text>
              </View>
            </View>
            <Pressable onPress={handleLogout} style={s.logoutBtn} hitSlop={8}>
              <LogOut color={colors.white} size={20} />
            </Pressable>
          </View>

          <View style={s.contentWrap}>
            <Text style={s.sectionTitle}>MY STATS</Text>
            <View style={s.statsGrid}>
              {stats.map((stat) => (
                <View key={stat.label} style={[s.statCard, { backgroundColor: stat.bg, borderColor: stat.ring }]}>
                  <View style={s.statIconWrap}>
                    <stat.icon color={stat.color} size={18} />
                  </View>
                  <Text style={[s.statValue, { color: stat.color }]} numberOfLines={1}>
                    {stat.value}
                  </Text>
                  <Text style={s.statLabel}>{stat.label}</Text>
                </View>
              ))}
            </View>

            <Text style={s.sectionTitle}>MY ASSIGNED JOBS</Text>
            {myContainers.length === 0 && (
              <Card variant="outlined" style={s.emptyCard} padding={24}>
                <Text style={s.emptyText}>No jobs assigned yet</Text>
              </Card>
            )}
            {myContainers.map((container) => {
              const logs = myLogs.filter((l) => getLogContainerId(l) === container._id);
              const reported = logs.reduce((sum, l) => sum + l.reportedQuantity, 0);
              const verified = myVerifs
                .filter((v) => getVerificationContainerId(v) === container._id)
                .reduce((sum, v) => sum + (v.verifiedQuantity || 0), 0);
              const progress =
                container.quantity > 0
                  ? Math.min((verified / container.quantity) * 100, 100)
                  : 0;
              const statusMap: Record<string, string> = {
                active: colors.success,
                completed: colors.primary,
                cancelled: colors.danger,
              };
              const color = statusMap[container.status] ?? colors.textMuted;

              return (
                <Card key={container._id} style={s.card} variant="elevated" padding={16}>
                  <View style={s.cardTop}>
                    <View style={{ flex: 1, paddingRight: 8 }}>
                      <Text style={s.cardModel}>{container.model}</Text>
                      <Text style={s.cardDate}>
                        {container.date} · ₹{container.ratePerUnit}/unit
                      </Text>
                    </View>
                    <View style={[s.badge, { backgroundColor: color + "18", borderColor: color + "40" }]}>
                      <Text style={[s.badgeText, { color }]}>{container.status.toUpperCase()}</Text>
                    </View>
                  </View>
                  <View style={s.progressBg}>
                    <View style={[s.progressFill, { width: `${progress}%` as any, backgroundColor: color }]} />
                  </View>
                  <Text style={s.progressLabel}>
                    {verified} / {container.quantity} verified ({progress.toFixed(0)}%)
                  </Text>
                  <View style={s.statsRow}>
                    <Stat label="Target" value={String(container.quantity)} />
                    <Stat label="Reported" value={String(reported)} color={colors.warning} />
                    <Stat label="Verified" value={String(verified)} color={colors.success} />
                    <Stat
                      label="Earned"
                      value={`₹${(verified * container.ratePerUnit).toLocaleString()}`}
                      color={colors.primary}
                    />
                  </View>
                  {logs.length > 0 && (
                    <View style={s.logsWrap}>
                      <Text style={s.logsTitle}>RECENT LOGS</Text>
                      {logs.slice(0, 3).map((log) => {
                        const verification = myVerifs.find((v) => getVerificationLogId(v) === log._id);
                        const isVerified = !!verification;
                        return (
                          <View key={log._id} style={s.logRow}>
                            <Text style={s.logDate}>{log.date}</Text>
                            <Text style={s.logQty}>{log.reportedQuantity} units</Text>
                            <View
                              style={[
                                s.verifBadge,
                                {
                                  backgroundColor: isVerified ? colors.successSoft : colors.primarySofter,
                                  borderColor: isVerified ? colors.successBorder : colors.primaryBorder,
                                },
                              ]}
                            >
                              <Text
                                style={{
                                  fontFamily: fonts.bold,
                                  fontSize: 10,
                                  color: isVerified ? colors.success : colors.primary,
                                }}
                              >
                                {isVerified ? `${verification!.verifiedQuantity} verified` : "Pending"}
                              </Text>
                            </View>
                          </View>
                        );
                      })}
                    </View>
                  )}
                </Card>
              );
            })}
            {loadingMore && <ActivityIndicator color={colors.primary} style={{ marginVertical: 16 }} />}
            <View style={{ height: 28 }} />
          </View>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

function Stat({ label, value, color = colors.text }: { label: string; value: string; color?: string }) {
  return (
    <View style={s.stat}>
      <Text style={s.statLbl}>{label}</Text>
      <Text style={[s.statVal, { color }]} numberOfLines={1}>
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
  name: { fontFamily: fonts.extrabold, fontSize: 24, color: colors.white, letterSpacing: -0.3, marginTop: 2 },
  roleBadge: {
    marginTop: 10,
    backgroundColor: "rgba(255,255,255,0.22)",
    borderRadius: radius.md,
    paddingVertical: 5,
    paddingHorizontal: 12,
    alignSelf: "flex-start",
  },
  roleBadgeText: { fontFamily: fonts.bold, fontSize: 10, color: colors.white, letterSpacing: 1.4 },
  logoutBtn: { padding: 10, backgroundColor: "rgba(255,255,255,0.18)", borderRadius: radius.md },
  contentWrap: {
    backgroundColor: colors.bgSubtle,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingTop: 22,
    minHeight: 600,
  },
  sectionTitle: {
    fontFamily: fonts.bold,
    fontSize: 11,
    color: colors.textFaint,
    letterSpacing: 1.6,
    paddingHorizontal: 20,
    marginBottom: 12,
  },
  statsGrid: { flexDirection: "row", flexWrap: "wrap", gap: 12, paddingHorizontal: 20, marginBottom: 22 },
  statCard: { width: "47%", borderRadius: radius.lg, padding: 16, gap: 10, borderWidth: 1 },
  statIconWrap: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: colors.white,
    alignItems: "center",
    justifyContent: "center",
    ...(shadow.sm as object),
  },
  statValue: { fontFamily: fonts.extrabold, fontSize: 22, letterSpacing: -0.3 },
  statLabel: { fontFamily: fonts.medium, fontSize: 12, color: colors.textMuted },
  emptyCard: { marginHorizontal: 20, alignItems: "center" },
  emptyText: { fontFamily: fonts.medium, color: colors.textFaint, fontSize: 14 },
  card: { marginHorizontal: 20, marginBottom: 14 },
  cardTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 14 },
  cardModel: { fontFamily: fonts.bold, fontSize: 16, color: colors.text },
  cardDate: { fontFamily: fonts.regular, fontSize: 12, color: colors.textMuted, marginTop: 2 },
  badge: { borderRadius: radius.sm, borderWidth: 1, paddingHorizontal: 8, paddingVertical: 4 },
  badgeText: { fontFamily: fonts.bold, fontSize: 10, letterSpacing: 0.8 },
  progressBg: { height: 6, backgroundColor: colors.surfaceAlt, borderRadius: radius.full, marginBottom: 6, overflow: "hidden" },
  progressFill: { height: "100%", borderRadius: radius.full },
  progressLabel: { fontFamily: fonts.medium, fontSize: 11, color: colors.textFaint, marginBottom: 12 },
  statsRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 14 },
  stat: { alignItems: "center", flex: 1 },
  statLbl: {
    fontFamily: fonts.medium,
    fontSize: 10,
    color: colors.textFaint,
    marginBottom: 4,
    letterSpacing: 0.4,
    textTransform: "uppercase",
  },
  statVal: { fontFamily: fonts.bold, fontSize: 14 },
  logsWrap: { borderTopWidth: 1, borderColor: colors.borderSoft, paddingTop: 12, gap: 8 },
  logsTitle: {
    fontFamily: fonts.bold,
    fontSize: 10,
    color: colors.textFaint,
    letterSpacing: 1,
    marginBottom: 4,
  },
  logRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  logDate: { fontFamily: fonts.medium, fontSize: 12, color: colors.textMuted, flex: 1 },
  logQty: { fontFamily: fonts.semibold, fontSize: 13, color: colors.text },
  verifBadge: { borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4, borderWidth: 1 },
});
