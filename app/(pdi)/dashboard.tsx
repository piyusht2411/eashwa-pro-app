import { Card } from "@/components/ui/Card";
import { isNearScrollBottom } from "@/lib/scrollPagination";
import { colors, fonts, radius, shadow } from "@/lib/theme";
import { useAuthStore } from "@/stores/authStore";
import { PDIVerification, useProductionStore } from "@/stores/productionStore";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { AlertTriangle, CheckCircle, Clock, LayoutDashboard, LogOut } from "lucide-react-native";
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

const getVerificationContainerModel = (v: PDIVerification) =>
  typeof v.container === "string" ? "Job" : v.container.model ?? "Job";

const toSafeNumber = (value: unknown) => {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
};

export default function PdiDashboard() {
  const { user, token, logout } = useAuthStore();
  const {
    productionLogs,
    pdiDashboardPagination,
    pdiPendingCount,
    pdiVerifications,
    fetchPDIDashboard,
    fetchPendingVerifications,
  } = useProductionStore();
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);

  const loadDashboard = useCallback(async () => {
    if (!token) return;
    await Promise.all([fetchPendingVerifications(token), fetchPDIDashboard(token)]);
  }, [fetchPDIDashboard, fetchPendingVerifications, token]);

  useEffect(() => {
    loadDashboard().catch((e: any) => {
      Alert.alert("Error", e.message || "Failed to load PDI dashboard");
    });
  }, [loadDashboard]);

  const handleRefresh = async () => {
    if (!token) return;
    setRefreshing(true);
    try {
      await loadDashboard();
    } catch (e: any) {
      Alert.alert("Error", e.message || "Failed to refresh PDI dashboard");
    } finally {
      setRefreshing(false);
    }
  };

  const handleLoadMore = async () => {
    if (!token || loadingMore || !pdiDashboardPagination.hasNextPage) return;
    setLoadingMore(true);
    try {
      await fetchPDIDashboard(token, pdiDashboardPagination.page + 1);
    } catch (e: any) {
      Alert.alert("Error", e.message || "Failed to load more verifications");
    } finally {
      setLoadingMore(false);
    }
  };

  const pending = productionLogs.filter((l) => l.status === "pending");
  const pendingCount = Math.max(pdiPendingCount, pending.length);
  const verified = pdiVerifications.filter((v) => !v.isIncomplete);
  const incomplete = pdiVerifications.filter((v) => v.isIncomplete);
  const totalVerifiedQty = pdiVerifications.reduce((s, v) => s + toSafeNumber(v.verifiedQuantity), 0);
  const discrepancy = pdiVerifications.reduce((s, v) => s + toSafeNumber(v.missingQuantity), 0);

  const handleLogout = async () => {
    await logout();
    router.replace("/(auth)/login");
  };

  const stats = [
    { label: "Pending", value: String(pendingCount), color: colors.warning, bg: colors.warningSoft, ring: colors.warningBorder, icon: Clock },
    { label: "Verified", value: String(verified.length), color: colors.success, bg: colors.successSoft, ring: colors.successBorder, icon: CheckCircle },
    { label: "Incomplete", value: String(incomplete.length), color: colors.danger, bg: colors.dangerSoft, ring: colors.dangerBorder, icon: AlertTriangle },
    { label: "Discrepancy", value: String(discrepancy), color: colors.primary, bg: colors.primarySofter, ring: colors.primaryBorder, icon: LayoutDashboard },
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
              <Text style={s.greeting}>Welcome,</Text>
              <Text style={s.name}>{user?.name}</Text>
              <View style={s.roleBadge}>
                <Text style={s.roleBadgeText}>PDI INSPECTOR</Text>
              </View>
            </View>
            <Pressable onPress={handleLogout} style={s.logoutBtn} hitSlop={8}>
              <LogOut color={colors.white} size={20} />
            </Pressable>
          </View>

          <View style={s.contentWrap}>
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

            {pendingCount > 0 && (
              <View style={s.alertCard}>
                <View style={s.alertIcon}>
                  <Clock color={colors.warning} size={22} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={s.alertTitle}>
                    {pendingCount} {pendingCount === 1 ? "entry" : "entries"} awaiting your verification
                  </Text>
                  <Text style={s.alertSub}>Go to the Verify tab to review</Text>
                </View>
              </View>
            )}

            <Text style={s.sectionLabel}>ALL VERIFICATIONS</Text>
            {pdiVerifications.length === 0 && (
              <Card variant="outlined" style={s.emptyCard} padding={24}>
                <Text style={s.emptyText}>No completed verifications yet</Text>
              </Card>
            )}
            {pdiVerifications.map((v) => {
              const color = v.isIncomplete ? colors.warning : colors.success;
              const bg = v.isIncomplete ? colors.warningSoft : colors.successSoft;
              const verifiedQuantity = toSafeNumber(v.verifiedQuantity);
              const missingQuantity = toSafeNumber(v.missingQuantity);
              return (
                <Card key={v._id} variant="elevated" style={s.card} padding={14}>
                  <View style={s.cardTop}>
                    <View style={{ flex: 1, paddingRight: 8 }}>
                      <Text style={s.cardModel}>{getVerificationContainerModel(v)}</Text>
                      <Text style={s.cardTeam}>{new Date(v.verifiedAt).toLocaleDateString()}</Text>
                    </View>
                    <View style={[s.badge, { backgroundColor: bg, borderColor: color + "50" }]}>
                      <Text style={[s.badgeText, { color }]}>
                        {v.isIncomplete ? "INCOMPLETE" : "VERIFIED"}
                      </Text>
                    </View>
                  </View>
                  <View style={s.cardStats}>
                    <View style={s.cardStat}>
                      <Text style={s.cardStatLabel}>Verified</Text>
                      <Text style={[s.cardStatValue, { color }]}>{verifiedQuantity}</Text>
                    </View>
                    <View style={s.cardStat}>
                      <Text style={s.cardStatLabel}>Missing</Text>
                      <Text style={[s.cardStatValue, { color: colors.danger }]}>{missingQuantity}</Text>
                    </View>
                    <View style={s.cardStat}>
                      <Text style={s.cardStatLabel}>Total Verified</Text>
                      <Text style={s.cardStatValue}>{totalVerifiedQty}</Text>
                    </View>
                  </View>
                  {v.remarks ? <Text style={s.cardNote}>{v.remarks}</Text> : null}
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

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bgSubtle },
  headerBg: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 200,
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
  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    paddingHorizontal: 20,
    marginBottom: 18,
  },
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
  alertCard: {
    marginHorizontal: 20,
    marginBottom: 20,
    backgroundColor: colors.warningSoft,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.warningBorder,
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
    gap: 12,
  },
  alertIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: colors.white,
    alignItems: "center",
    justifyContent: "center",
  },
  alertTitle: { fontFamily: fonts.bold, fontSize: 14, color: colors.warning },
  alertSub: { fontFamily: fonts.regular, fontSize: 12, color: colors.textMuted, marginTop: 2 },
  sectionLabel: {
    fontFamily: fonts.bold,
    fontSize: 11,
    color: colors.textFaint,
    letterSpacing: 1.6,
    paddingHorizontal: 20,
    marginBottom: 12,
  },
  emptyCard: { marginHorizontal: 20, alignItems: "center" },
  emptyText: { fontFamily: fonts.medium, color: colors.textFaint, fontSize: 14 },
  card: { marginHorizontal: 20, marginBottom: 12 },
  cardTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 },
  cardModel: { fontFamily: fonts.bold, fontSize: 15, color: colors.text },
  cardTeam: { fontFamily: fonts.regular, fontSize: 11, color: colors.textFaint, marginTop: 2 },
  badge: { borderRadius: radius.sm, borderWidth: 1, paddingHorizontal: 8, paddingVertical: 4 },
  badgeText: { fontFamily: fonts.bold, fontSize: 10, letterSpacing: 0.5 },
  cardStats: { flexDirection: "row", gap: 24, marginBottom: 4 },
  cardStat: { gap: 2 },
  cardStatLabel: { fontFamily: fonts.medium, fontSize: 10, color: colors.textFaint, letterSpacing: 0.4 },
  cardStatValue: { fontFamily: fonts.bold, fontSize: 15, color: colors.text },
  cardNote: { fontFamily: fonts.medium, fontSize: 12, color: colors.warning, marginTop: 8 },
});
