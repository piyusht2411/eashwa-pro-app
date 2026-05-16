import { useAuthStore } from "@/stores/authStore";
import { isNearScrollBottom } from "@/lib/scrollPagination";
import { Container, Payment, useProductionStore } from "@/stores/productionStore";
import { CheckCircle, Clock, CreditCard, X } from "lucide-react-native";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";

const getPaymentContainerId = (payment: Payment) =>
  typeof payment.container === "string" ? payment.container : payment.container._id;

const getPaymentContainerModel = (payment: Payment) =>
  typeof payment.container === "string" ? "Container" : payment.container.model;

const getPaymentRate = (payment: Payment) =>
  typeof payment.container === "string" ? 0 : payment.container.ratePerUnit;

const getPaymentTeamName = (payment: Payment) =>
  typeof payment.team === "string" ? "Team" : payment.team.name;

const getAssignedTeamName = (container: Container) =>
  typeof container.assignedTeam === "string" ? "Team" : container.assignedTeam.name;

const getVerificationContainerId = (value: string | { _id: string }) =>
  typeof value === "string" ? value : value._id;

const uniqueById = <T extends { _id: string }>(items: T[]) =>
  Array.from(new Map(items.map((item) => [item._id, item])).values());

export default function AdminPayments() {
  const insets = useSafeAreaInsets();
  const {
    containers,
    paymentsPagination,
    payments,
    pdiVerifications,
    fetchContainers,
    fetchPayments,
    fetchVerificationsByContainer,
    recordPayment,
  } = useProductionStore();
  const { token } = useAuthStore();
  const [selectedPaymentId, setSelectedPaymentId] = useState<string | null>(null);
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const fallbackPaymentItems = useMemo(
    () =>
      containers
        .map((container) => {
          const hasPayment = payments.some((payment) => getPaymentContainerId(payment) === container._id);
          if (hasPayment) return null;

          const verifiedQuantity = uniqueById(pdiVerifications)
            .filter((verification) => getVerificationContainerId(verification.container) === container._id)
            .reduce((sum, verification) => sum + (verification.verifiedQuantity || 0), 0);
          if (verifiedQuantity <= 0) return null;

          const totalAmount = verifiedQuantity * container.ratePerUnit;
          return {
            _id: `fallback-${container._id}`,
            containerId: container._id,
            model: container.model,
            teamName: getAssignedTeamName(container),
            verifiedQuantity,
            ratePerUnit: container.ratePerUnit,
            totalAmount,
            paidAmount: 0,
            remainingAmount: totalAmount,
            payments: [],
          };
        })
        .filter((item): item is NonNullable<typeof item> => Boolean(item)),
    [containers, payments, pdiVerifications],
  );

  const paymentItems = useMemo(
    () => [
      ...payments.map((payment) => ({
        _id: payment._id,
        containerId: getPaymentContainerId(payment),
        model: getPaymentContainerModel(payment),
        teamName: getPaymentTeamName(payment),
        verifiedQuantity: payment.totalVerifiedQuantity,
        ratePerUnit: getPaymentRate(payment),
        totalAmount: payment.totalAmount,
        paidAmount: payment.paidAmount,
        remainingAmount: payment.remainingAmount,
        payments: payment.payments,
      })),
      ...fallbackPaymentItems,
    ],
    [fallbackPaymentItems, payments],
  );

  const selected = paymentItems.find((payment) => payment._id === selectedPaymentId);

  const loadPayments = useCallback(async () => {
    if (!token) return;
    await Promise.all([fetchPayments(token), fetchContainers(token)]);
  }, [fetchContainers, fetchPayments, token]);

  useEffect(() => {
    loadPayments().catch((error: any) => {
      Alert.alert("Error", error.message || "Failed to load payments");
    });
  }, [loadPayments]);

  useEffect(() => {
    if (!token || containers.length === 0) return;

    containers.forEach((container) => {
      fetchVerificationsByContainer(container._id, token).catch(() => undefined);
    });
  }, [containers, fetchVerificationsByContainer, token]);

  const handleRefresh = async () => {
    if (!token) return;
    setRefreshing(true);
    try {
      await loadPayments();
    } catch (error: any) {
      Alert.alert("Error", error.message || "Failed to refresh payments");
    } finally {
      setRefreshing(false);
    }
  };

  const handleLoadMore = async () => {
    if (!token || loadingMore || !paymentsPagination.hasNextPage) return;
    setLoadingMore(true);
    try {
      await fetchPayments(token, paymentsPagination.page + 1);
    } catch (error: any) {
      Alert.alert("Error", error.message || "Failed to load more payments");
    } finally {
      setLoadingMore(false);
    }
  };

  const handlePay = async () => {
    if (submitting) return;
    if (!selected || !amount || Number(amount) <= 0) {
      Alert.alert("Error", "Enter a valid amount");
      return;
    }
    if (!token) {
      Alert.alert("Error", "Not authenticated");
      return;
    }
    if (Number(amount) > selected.remainingAmount) {
      Alert.alert(
        "Error",
        `Amount exceeds remaining balance Rs ${selected.remainingAmount}`,
      );
      return;
    }

    try {
      setSubmitting(true);
      await recordPayment(selected.containerId, Number(amount), note, token);
      await loadPayments();
      setSelectedPaymentId(null);
      setAmount("");
      setNote("");
      Alert.alert(
        "Payment Recorded",
        `Rs ${Number(amount).toLocaleString()} paid to ${selected.teamName}`,
      );
    } catch (error: any) {
      Alert.alert("Error", error.message || "Failed to record payment");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={s.safe}>
      <View style={s.header}>
        <Text style={s.title}>Payments</Text>
      </View>

      <View style={s.summaryBanner}>
        <View style={s.summaryItem}>
          <Text style={s.summaryLabel}>Total Earned</Text>
          <Text style={[s.summaryValue, { color: "#F97316" }]}>
            Rs {paymentItems.reduce((sum, p) => sum + p.totalAmount, 0).toLocaleString()}
          </Text>
        </View>
        <View style={s.summaryDivider} />
        <View style={s.summaryItem}>
          <Text style={s.summaryLabel}>Total Paid</Text>
          <Text style={[s.summaryValue, { color: "#059669" }]}>
            Rs {paymentItems.reduce((sum, p) => sum + p.paidAmount, 0).toLocaleString()}
          </Text>
        </View>
        <View style={s.summaryDivider} />
        <View style={s.summaryItem}>
          <Text style={s.summaryLabel}>Remaining</Text>
          <Text style={[s.summaryValue, { color: "#DC2626" }]}>
            Rs {paymentItems.reduce((sum, p) => sum + p.remainingAmount, 0).toLocaleString()}
          </Text>
        </View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        onScroll={({ nativeEvent }) => {
          if (isNearScrollBottom(nativeEvent)) handleLoadMore();
        }}
        scrollEventThrottle={400}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor="#F97316" />
        }
      >
        {paymentItems.length === 0 && (
          <View style={s.emptyCard}>
            <Text style={s.emptyText}>No payment records yet</Text>
          </View>
        )}
        {paymentItems.map((p) => {
          const paidPct = p.totalAmount > 0 ? (p.paidAmount / p.totalAmount) * 100 : 0;
          return (
            <View key={p._id} style={s.card}>
              <View style={s.cardTop}>
                <View>
                  <Text style={s.cardModel}>{p.model}</Text>
                  <Text style={s.cardTeam}>{p.teamName}</Text>
                </View>
                {p.remainingAmount <= 0 ? (
                  <View style={s.paidBadge}>
                    <CheckCircle color="#059669" size={14} />
                    <Text style={s.paidBadgeText}>PAID</Text>
                  </View>
                ) : (
                  <Pressable
                    onPress={() => setSelectedPaymentId(p._id)}
                    style={s.payBtn}
                  >
                    <CreditCard color="#fff" size={14} />
                    <Text style={s.payBtnText}>Pay</Text>
                  </Pressable>
                )}
              </View>

              <View style={s.amountRow}>
                <View style={s.amountBox}>
                  <Text style={s.amtLabel}>Verified Units</Text>
                  <Text style={s.amtValue}>{p.verifiedQuantity}</Text>
                </View>
                <View style={s.amountBox}>
                  <Text style={s.amtLabel}>Rate</Text>
                  <Text style={s.amtValue}>Rs {p.ratePerUnit}</Text>
                </View>
                <View style={s.amountBox}>
                  <Text style={s.amtLabel}>Total</Text>
                  <Text style={[s.amtValue, { color: "#F97316" }]}>
                    Rs {p.totalAmount.toLocaleString()}
                  </Text>
                </View>
              </View>

              <View style={s.progressBg}>
                <View style={[s.progressFill, { width: `${paidPct}%` as any }]} />
              </View>
              <View style={s.progressInfo}>
                <Text style={s.paidText}>Paid: Rs {p.paidAmount.toLocaleString()}</Text>
                <Text style={s.dueText}>Due: Rs {p.remainingAmount.toLocaleString()}</Text>
              </View>

              {p.payments.length > 0 && (
                <View style={s.historyWrap}>
                  <Text style={s.historyTitle}>Payment History</Text>
                  {p.payments.map((entry) => (
                    <View key={`${entry.paidAt}-${entry.amount}`} style={s.historyItem}>
                      <Clock color="#94A3B8" size={12} />
                      <Text style={s.historyDate}>
                        {new Date(entry.paidAt).toLocaleDateString()}
                      </Text>
                      <Text style={s.historyAmt}>Rs {entry.amount.toLocaleString()}</Text>
                      {entry.note && <Text style={s.historyNote}>- {entry.note}</Text>}
                    </View>
                  ))}
                </View>
              )}
            </View>
          );
        })}
        {loadingMore && <ActivityIndicator color="#F97316" style={{ marginVertical: 16 }} />}
        <View style={{ height: 20 }} />
      </ScrollView>

      <Modal visible={!!selectedPaymentId} transparent animationType="slide">
        <View style={s.overlay}>
          <KeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "padding" : "height"}
            style={s.keyboardAvoid}
          >
            <View style={s.modal}>
              <ScrollView
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{ paddingBottom: Math.max(insets.bottom, 24) }}
              >
                <View style={s.modalHeader}>
                  <Text style={s.modalTitle}>Record Payment</Text>
                  <Pressable
                    onPress={() => {
                      setSelectedPaymentId(null);
                      setAmount("");
                      setNote("");
                    }}
                  >
                    <X color="#94A3B8" size={22} />
                  </Pressable>
                </View>
                {selected && (
                  <>
                    <Text style={s.modalSub}>
                      Remaining:{" "}
                      <Text style={{ color: "#DC2626" }}>
                        Rs {selected.remainingAmount.toLocaleString()}
                      </Text>{" "}
                      - Team: {selected.teamName}
                    </Text>
                    <View style={s.fieldWrap}>
                      <Text style={s.fieldLabel}>Amount (Rs)</Text>
                      <TextInput
                        style={s.fieldInput}
                        value={amount}
                        onChangeText={setAmount}
                        placeholder="Enter amount"
                        placeholderTextColor="#CBD5E1"
                        keyboardType="numeric"
                        editable={!submitting}
                      />
                    </View>
                    <View style={s.fieldWrap}>
                      <Text style={s.fieldLabel}>Note (optional)</Text>
                      <TextInput
                        style={s.fieldInput}
                        value={note}
                        onChangeText={setNote}
                        placeholder="e.g. Advance payment"
                        placeholderTextColor="#CBD5E1"
                        editable={!submitting}
                      />
                    </View>
                    <Pressable
                      onPress={handlePay}
                      disabled={submitting}
                      style={[s.confirmBtn, submitting && s.confirmBtnDisabled]}
                    >
                      {submitting ? (
                        <ActivityIndicator color="#fff" />
                      ) : (
                        <Text style={s.confirmBtnText}>Confirm Payment</Text>
                      )}
                    </Pressable>
                  </>
                )}
              </ScrollView>
            </View>
          </KeyboardAvoidingView>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#F8FAFC" },
  header: { paddingHorizontal: 20, paddingTop: 20, paddingBottom: 12 },
  title: { fontSize: 20, fontWeight: "800", color: "#0F172A" },
  summaryBanner: { flexDirection: "row", marginHorizontal: 20, marginBottom: 16, backgroundColor: "#FFFFFF", borderRadius: 16, borderWidth: 1, borderColor: "#E2E8F0", padding: 16 },
  summaryItem: { flex: 1, alignItems: "center" },
  summaryLabel: { fontSize: 10, color: "#94A3B8", marginBottom: 4 },
  summaryValue: { fontSize: 16, fontWeight: "800" },
  summaryDivider: { width: 1, backgroundColor: "#E2E8F0", marginHorizontal: 8 },
  emptyCard: { marginHorizontal: 20, padding: 24, backgroundColor: "#FFFFFF", borderRadius: 16, borderWidth: 1, borderColor: "#E2E8F0", alignItems: "center" },
  emptyText: { color: "#94A3B8", fontSize: 14 },
  card: { marginHorizontal: 20, marginBottom: 14, backgroundColor: "#FFFFFF", borderRadius: 18, borderWidth: 1, borderColor: "#E2E8F0", padding: 16 },
  cardTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 14 },
  cardModel: { fontSize: 16, fontWeight: "700", color: "#0F172A" },
  cardTeam: { fontSize: 12, color: "#64748B", marginTop: 2 },
  paidBadge: { flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: "#F0FDF4", borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6, borderWidth: 1, borderColor: "#DCFCE7" },
  paidBadgeText: { fontSize: 11, fontWeight: "700", color: "#059669" },
  payBtn: { flexDirection: "row", alignItems: "center", gap: 5, backgroundColor: "#F97316", borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8 },
  payBtnText: { color: "#fff", fontWeight: "700", fontSize: 13 },
  amountRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 14 },
  amountBox: { alignItems: "center" },
  amtLabel: { fontSize: 10, color: "#94A3B8", marginBottom: 4 },
  amtValue: { fontSize: 15, fontWeight: "700", color: "#0F172A" },
  progressBg: { height: 8, backgroundColor: "#F1F5F9", borderRadius: 10, marginBottom: 8, overflow: "hidden" },
  progressFill: { height: "100%", backgroundColor: "#059669", borderRadius: 10 },
  progressInfo: { flexDirection: "row", justifyContent: "space-between", marginBottom: 12 },
  paidText: { fontSize: 11, color: "#059669", fontWeight: "600" },
  dueText: { fontSize: 11, color: "#DC2626", fontWeight: "600" },
  historyWrap: { borderTopWidth: 1, borderColor: "#E2E8F0", paddingTop: 12, gap: 6 },
  historyTitle: { fontSize: 10, fontWeight: "700", color: "#94A3B8", letterSpacing: 1, marginBottom: 4 },
  historyItem: { flexDirection: "row", alignItems: "center", gap: 6 },
  historyDate: { fontSize: 12, color: "#64748B" },
  historyAmt: { fontSize: 13, fontWeight: "700", color: "#0F172A", marginLeft: "auto" },
  historyNote: { fontSize: 11, color: "#94A3B8" },
  overlay: { flex: 1, backgroundColor: "#00000040", justifyContent: "flex-end" },
  keyboardAvoid: { width: "100%" },
  modal: { backgroundColor: "#FFFFFF", borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 24, borderTopWidth: 1, borderColor: "#E2E8F0", maxHeight: "90%" },
  modalHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 8 },
  modalTitle: { fontSize: 20, fontWeight: "800", color: "#0F172A" },
  modalSub: { fontSize: 13, color: "#64748B", marginBottom: 20 },
  fieldWrap: { marginBottom: 14 },
  fieldLabel: { fontSize: 12, fontWeight: "600", color: "#475569", marginBottom: 6 },
  fieldInput: { backgroundColor: "#F8FAFC", borderWidth: 1.5, borderColor: "#E2E8F0", borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, color: "#0F172A", fontSize: 14 },
  confirmBtn: { backgroundColor: "#059669", borderRadius: 14, paddingVertical: 15, alignItems: "center", marginTop: 8 },
  confirmBtnDisabled: { opacity: 0.65 },
  confirmBtnText: { color: "#fff", fontWeight: "700", fontSize: 16 },
});
