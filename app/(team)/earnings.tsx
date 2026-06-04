import { useAuthStore } from "@/stores/authStore";
import { isNearScrollBottom } from "@/lib/scrollPagination";
import { Container, Payment, ProductionLog, useProductionStore } from "@/stores/productionStore";
import { GradientHeader } from "@/components/ui/GradientHeader";
import { CheckCircle, Clock, IndianRupee, TrendingUp } from "lucide-react-native";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Alert, RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const getPaymentTeamId = (payment: Payment) =>
  typeof payment.team === "string" ? payment.team : payment.team._id;

const getPaymentContainerModel = (payment: Payment) =>
  typeof payment.container === "string" ? "Job" : payment.container.model;

const getPaymentRate = (payment: Payment) =>
  typeof payment.container === "string" ? 0 : payment.container.ratePerUnit;

const getPaymentContainerId = (payment: Payment) =>
  typeof payment.container === "string" ? payment.container : payment.container._id;

const getPaymentVerifiedQuantity = (payment: Payment) =>
  payment.totalVerifiedQuantity ?? (payment as Payment & { totalVerifiedQty?: number }).totalVerifiedQty ?? 0;

const getAssignedTeamId = (container: Container) =>
  typeof container.assignedTeam === "string" ? container.assignedTeam : container.assignedTeam._id;

const getLogContainerId = (log: ProductionLog) =>
  typeof log.container === "string" ? log.container : log.container._id;

const getLogTeamId = (log: ProductionLog) =>
  typeof log.team === "string" ? log.team : log.team._id;

export default function TeamEarnings() {
  const { user, token } = useAuthStore();
  const { containers, myPaymentsPagination, payments, productionLogs, fetchContainers, fetchLogsByContainer, fetchMyPayments } =
    useProductionStore();
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);

  const myContainers = useMemo(
    () => containers.filter((container) => getAssignedTeamId(container) === user?._id),
    [containers, user?._id],
  );
  const myPayments = payments.filter((payment) => getPaymentTeamId(payment) === user?._id);
  const fallbackItems = myContainers
    .map((container) => {
      const logs = productionLogs.filter(
        (log) => getLogContainerId(log) === container._id && getLogTeamId(log) === user?._id,
      );
      const verifiedQuantity = logs.reduce((sum, log) => sum + (log.verifiedQuantity || 0), 0);
      const existingPayment = myPayments.find((payment) => getPaymentContainerId(payment) === container._id);

      if (existingPayment && (existingPayment.totalAmount > 0 || getPaymentVerifiedQuantity(existingPayment) > 0)) {
        return null;
      }
      if (verifiedQuantity <= 0) return null;

      return {
        _id: `fallback-${container._id}`,
        model: container.model,
        verifiedQuantity,
        ratePerUnit: container.ratePerUnit,
        totalAmount: verifiedQuantity * container.ratePerUnit,
        paidAmount: 0,
        remainingAmount: verifiedQuantity * container.ratePerUnit,
        payments: [],
      };
    })
    .filter((item): item is NonNullable<typeof item> => Boolean(item));
  const paymentItems = myPayments.map((payment) => ({
    _id: payment._id,
    model: getPaymentContainerModel(payment),
    verifiedQuantity: getPaymentVerifiedQuantity(payment),
    ratePerUnit: getPaymentRate(payment),
    totalAmount: payment.totalAmount,
    paidAmount: payment.paidAmount,
    remainingAmount: payment.remainingAmount,
    payments: payment.payments,
  }));
  const earningItems = [...paymentItems, ...fallbackItems];
  const totalEarned = earningItems.reduce((sum, item) => sum + item.totalAmount, 0);
  const totalPaid = myPayments.reduce((sum, payment) => sum + payment.paidAmount, 0);
  const totalDue = earningItems.reduce((sum, item) => sum + item.remainingAmount, 0);
  const totalVerified = earningItems.reduce((sum, item) => sum + item.verifiedQuantity, 0);

  const loadPayments = useCallback(async () => {
    if (!token) return;
    await Promise.all([fetchMyPayments(token), fetchContainers(token)]);
  }, [fetchContainers, fetchMyPayments, token]);

  useEffect(() => {
    loadPayments().catch((error: any) => {
      Alert.alert("Error", error.message || "Failed to load earnings");
    });
  }, [loadPayments]);

  useEffect(() => {
    if (!token || myContainers.length === 0) return;

    myContainers.forEach((container) => {
      fetchLogsByContainer(container._id, token).catch(() => undefined);
    });
  }, [fetchLogsByContainer, myContainers, token]);

  const handleRefresh = async () => {
    if (!token) return;
    setRefreshing(true);
    try {
      await loadPayments();
    } catch (error: any) {
      Alert.alert("Error", error.message || "Failed to refresh earnings");
    } finally {
      setRefreshing(false);
    }
  };

  const handleLoadMore = async () => {
    if (!token || loadingMore || !myPaymentsPagination.hasNextPage) return;
    setLoadingMore(true);
    try {
      await fetchMyPayments(token, myPaymentsPagination.page + 1);
    } catch (error: any) {
      Alert.alert("Error", error.message || "Failed to load more earnings");
    } finally {
      setLoadingMore(false);
    }
  };

  return (
    <View style={s.safe}>
      <GradientHeader
        title="My Earnings"
        subtitle="Track your verified output and payouts"
        leftIcon={<IndianRupee color="#fff" size={20} />}
      />
      <ScrollView
        showsVerticalScrollIndicator={false}
        onScroll={({ nativeEvent }) => {
          if (isNearScrollBottom(nativeEvent)) handleLoadMore();
        }}
        scrollEventThrottle={400}
        contentContainerStyle={{ paddingTop: 16 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor="#F97316" />}
      >

        <View style={s.statsGrid}>
          {[
            { label: "Total Earned", value: `Rs ${totalEarned.toLocaleString()}`, color: "#F97316", bg: "#FFF7ED", icon: TrendingUp },
            { label: "Total Paid", value: `Rs ${totalPaid.toLocaleString()}`, color: "#059669", bg: "#F0FDF4", icon: CheckCircle },
            { label: "Remaining", value: `Rs ${totalDue.toLocaleString()}`, color: "#DC2626", bg: "#FEF2F2", icon: Clock },
            { label: "Verified Units", value: String(totalVerified), color: "#D97706", bg: "#FFFBEB", icon: IndianRupee },
          ].map((stat) => (
            <View key={stat.label} style={[s.statCard, { backgroundColor: stat.bg }]}>
              <stat.icon color={stat.color} size={20} />
              <Text style={[s.statValue, { color: stat.color }]}>{stat.value}</Text>
              <Text style={s.statLabel}>{stat.label}</Text>
            </View>
          ))}
        </View>

        <Text style={s.sectionLabel}>JOB BREAKDOWN</Text>
        {earningItems.length === 0 && (
          <View style={s.emptyCard}>
            <Text style={s.emptyText}>No payment records yet</Text>
          </View>
        )}
        {earningItems.map((item) => {
          const paidPct = item.totalAmount > 0 ? (item.paidAmount / item.totalAmount) * 100 : 0;
          return (
            <View key={item._id} style={s.card}>
              <Text style={s.cardModel}>{item.model}</Text>
              <View style={s.amtRow}>
                <View style={s.amtBox}>
                  <Text style={s.amtLabel}>Verified</Text>
                  <Text style={s.amtVal}>{item.verifiedQuantity} units</Text>
                </View>
                <View style={s.amtBox}>
                  <Text style={s.amtLabel}>Rate</Text>
                  <Text style={s.amtVal}>Rs {item.ratePerUnit}</Text>
                </View>
                <View style={s.amtBox}>
                  <Text style={s.amtLabel}>Total</Text>
                  <Text style={[s.amtVal, { color: "#F97316" }]}>Rs {item.totalAmount.toLocaleString()}</Text>
                </View>
              </View>
              <View style={s.progressBg}>
                <View style={[s.progressFill, { width: `${paidPct}%` as any }]} />
              </View>
              <View style={s.progressInfo}>
                <Text style={s.paidText}>Received: Rs {item.paidAmount.toLocaleString()}</Text>
                <Text style={s.dueText}>Pending: Rs {item.remainingAmount.toLocaleString()}</Text>
              </View>
              {item.payments.length > 0 && (
                <View style={s.historyWrap}>
                  <Text style={s.historyTitle}>PAYMENT HISTORY</Text>
                  {item.payments.map((entry) => (
                    <View key={`${entry.paidAt}-${entry.amount}`} style={s.historyRow}>
                      <Text style={s.historyDate}>{new Date(entry.paidAt).toLocaleDateString()}</Text>
                      <Text style={s.historyAmt}>Rs {entry.amount.toLocaleString()}</Text>
                      {entry.note && <Text style={s.historyNote}>{entry.note}</Text>}
                    </View>
                  ))}
                </View>
              )}
            </View>
          );
        })}
        {loadingMore && <ActivityIndicator color="#F97316" style={{ marginVertical: 16 }} />}
        <View style={{ height: 24 }} />
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#F8FAFC" },
  header: { flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: 20, paddingTop: 20, paddingBottom: 16 },
  title: { fontSize: 22, fontWeight: "800", color: "#0F172A" },
  statsGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10, paddingHorizontal: 20, marginBottom: 20 },
  statCard: { width: "47%", borderRadius: 16, borderWidth: 1, borderColor: "#E2E8F0", padding: 16, gap: 8 },
  statValue: { fontSize: 20, fontWeight: "800" },
  statLabel: { fontSize: 12, color: "#64748B" },
  sectionLabel: { fontSize: 11, fontWeight: "700", color: "#94A3B8", letterSpacing: 1.5, paddingHorizontal: 20, marginBottom: 12 },
  emptyCard: { marginHorizontal: 20, padding: 24, backgroundColor: "#FFFFFF", borderRadius: 16, borderWidth: 1, borderColor: "#E2E8F0", alignItems: "center" },
  emptyText: { color: "#94A3B8", fontSize: 14 },
  card: { marginHorizontal: 20, marginBottom: 14, backgroundColor: "#FFFFFF", borderRadius: 18, borderWidth: 1, borderColor: "#E2E8F0", padding: 16 },
  cardModel: { fontSize: 16, fontWeight: "700", color: "#0F172A", marginBottom: 14 },
  amtRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 14 },
  amtBox: { alignItems: "center" },
  amtLabel: { fontSize: 10, color: "#94A3B8", marginBottom: 4 },
  amtVal: { fontSize: 14, fontWeight: "700", color: "#0F172A" },
  progressBg: { height: 8, backgroundColor: "#F1F5F9", borderRadius: 10, overflow: "hidden", marginBottom: 8 },
  progressFill: { height: "100%", backgroundColor: "#059669", borderRadius: 10 },
  progressInfo: { flexDirection: "row", justifyContent: "space-between", marginBottom: 12 },
  paidText: { fontSize: 11, color: "#059669", fontWeight: "600" },
  dueText: { fontSize: 11, color: "#DC2626", fontWeight: "600" },
  historyWrap: { borderTopWidth: 1, borderColor: "#E2E8F0", paddingTop: 12, gap: 6 },
  historyTitle: { fontSize: 10, fontWeight: "700", color: "#94A3B8", letterSpacing: 1, marginBottom: 6 },
  historyRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  historyDate: { fontSize: 12, color: "#64748B", flex: 1 },
  historyAmt: { fontSize: 13, fontWeight: "700", color: "#059669" },
  historyNote: { fontSize: 11, color: "#64748B", flex: 1 },
});
