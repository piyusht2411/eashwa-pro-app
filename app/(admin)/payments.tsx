import { useAuthStore } from "@/stores/authStore";
import { isNearScrollBottom } from "@/lib/scrollPagination";
import { formatDateOnly } from "@/lib/utils";
import { Container, Payment, useProductionStore } from "@/stores/productionStore";
import { GradientHeader } from "@/components/ui/GradientHeader";
import {
  MiscellaneousEntry,
  addMiscellaneous,
  deleteMiscellaneous,
  getMiscellaneous,
  updateMiscellaneous,
} from "@/lib/api";
import { CheckCircle, Clock, CreditCard, Edit3, Info, MinusCircle, Plus, Trash2, X } from "lucide-react-native";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { KeyboardAvoidingView } from "react-native-keyboard-controller";

const getPaymentContainerId = (payment: Payment) =>
  typeof payment.container === "string" ? payment.container : payment.container._id;

const getPaymentContainerModel = (payment: Payment) =>
  typeof payment.container === "string" ? "Container" : payment.container.model;

const getPaymentRate = (payment: Payment) =>
  typeof payment.container === "string" ? 0 : payment.container.ratePerUnit;

const getPaymentTeamName = (payment: Payment) =>
  typeof payment.team === "string" ? "Team" : payment.team.name;

const getPaymentContainerDate = (payment: Payment) =>
  typeof payment.container === "string" ? undefined : payment.container.date;

const getPaymentPenalty = (payment: Payment) => payment.totalPenalty ?? 0;

const getContainerPenalty = (container: Container) =>
  container.totalPenalty ??
  Math.max(0, (container.pendingQuantity ?? 0)) * (container.penaltyPerUnit ?? 0);

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
    updatePaymentEntry,
    deletePaymentEntry,
  } = useProductionStore();
  const { token } = useAuthStore();
  const [selectedPaymentId, setSelectedPaymentId] = useState<string | null>(null);
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Miscellaneous (ad-hoc deductions) state
  const [miscEntries, setMiscEntries] = useState<MiscellaneousEntry[]>([]);
  const [miscTotal, setMiscTotal] = useState(0);
  const [miscModalVisible, setMiscModalVisible] = useState(false);
  const [miscAmount, setMiscAmount] = useState("");
  const [miscNote, setMiscNote] = useState("");
  const [miscSubmitting, setMiscSubmitting] = useState(false);
  const [miscEditingId, setMiscEditingId] = useState<string | null>(null);

  // Edit a recorded payment transaction
  const [payEntryEdit, setPayEntryEdit] = useState<
    { containerId: string; index: number; amount: string; note: string } | null
  >(null);
  const [payEntrySaving, setPayEntrySaving] = useState(false);
  const [payEntryDeleting, setPayEntryDeleting] = useState<string | null>(null);

  // Payment breakdown (gross → hold → misc → net) modal
  const [breakdownVisible, setBreakdownVisible] = useState(false);

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
            date: container.date,
            teamName: getAssignedTeamName(container),
            verifiedQuantity,
            ratePerUnit: container.ratePerUnit,
            totalAmount,
            paidAmount: 0,
            remainingAmount: totalAmount,
            totalPenalty: getContainerPenalty(container),
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
        date: getPaymentContainerDate(payment),
        teamName: getPaymentTeamName(payment),
        verifiedQuantity: payment.totalVerifiedQuantity,
        ratePerUnit: getPaymentRate(payment),
        totalAmount: payment.totalAmount,
        paidAmount: payment.paidAmount,
        remainingAmount: payment.remainingAmount,
        totalPenalty: getPaymentPenalty(payment),
        payments: payment.payments,
      })),
      ...fallbackPaymentItems,
    ],
    [fallbackPaymentItems, payments],
  );

  const selected = paymentItems.find((payment) => payment._id === selectedPaymentId);

  const totals = useMemo(() => {
    const grossTotal = paymentItems.reduce((sum, p) => sum + p.totalAmount, 0);
    const paid = paymentItems.reduce((sum, p) => sum + p.paidAmount, 0);
    const grossRemaining = paymentItems.reduce((sum, p) => sum + p.remainingAmount, 0);
    const hold = paymentItems.reduce((sum, p) => sum + (p.totalPenalty ?? 0), 0);
    const netTotal = grossTotal - hold;
    const netRemaining = grossRemaining - hold - miscTotal;
    return { grossTotal, paid, grossRemaining, hold, netTotal, netRemaining };
  }, [paymentItems, miscTotal]);

  const loadMiscellaneous = useCallback(async () => {
    if (!token) return;
    const res = await getMiscellaneous(token);
    setMiscEntries(res.entries);
    setMiscTotal(res.totalMiscellaneous);
  }, [token]);

  const loadPayments = useCallback(async () => {
    if (!token) return;
    await Promise.all([fetchPayments(token), fetchContainers(token), loadMiscellaneous()]);
  }, [fetchContainers, fetchPayments, loadMiscellaneous, token]);

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

  const handleAddMisc = async () => {
    if (miscSubmitting) return;
    if (!miscAmount || Number(miscAmount) <= 0) {
      Alert.alert("Error", "Enter a valid amount");
      return;
    }
    if (!token) {
      Alert.alert("Error", "Not authenticated");
      return;
    }

    try {
      setMiscSubmitting(true);
      if (miscEditingId) {
        await updateMiscellaneous(
          miscEditingId,
          { amount: Number(miscAmount), note: miscNote },
          token,
        );
      } else {
        await addMiscellaneous({ amount: Number(miscAmount), note: miscNote }, token);
      }
      await loadMiscellaneous();
      setMiscAmount("");
      setMiscNote("");
      setMiscEditingId(null);
    } catch (error: any) {
      Alert.alert("Error", error.message || "Failed to save miscellaneous amount");
    } finally {
      setMiscSubmitting(false);
    }
  };

  const openMiscEdit = (entry: MiscellaneousEntry) => {
    setMiscEditingId(entry._id);
    setMiscAmount(String(entry.amount));
    setMiscNote(entry.note ?? "");
  };

  const handleDeleteMisc = (id: string) => {
    if (!token) return;
    Alert.alert("Delete entry", "Remove this miscellaneous amount?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          try {
            await deleteMiscellaneous(id, token);
            if (miscEditingId === id) {
              setMiscEditingId(null);
              setMiscAmount("");
              setMiscNote("");
            }
            await loadMiscellaneous();
          } catch (error: any) {
            Alert.alert("Error", error.message || "Failed to delete entry");
          }
        },
      },
    ]);
  };

  const handleSavePayEntry = async () => {
    if (payEntrySaving || !payEntryEdit || !token) return;
    const amt = Number(payEntryEdit.amount);
    if (!payEntryEdit.amount || Number.isNaN(amt) || amt <= 0) {
      Alert.alert("Error", "Enter a valid amount");
      return;
    }
    setPayEntrySaving(true);
    try {
      await updatePaymentEntry(
        payEntryEdit.containerId,
        payEntryEdit.index,
        { amount: amt, note: payEntryEdit.note },
        token,
      );
      setPayEntryEdit(null);
      await loadPayments();
      Alert.alert("Updated", "Payment transaction updated");
    } catch (error: any) {
      Alert.alert("Error", error.message || "Failed to update payment");
    } finally {
      setPayEntrySaving(false);
    }
  };

  const handleDeletePayEntry = (containerId: string, index: number, key: string) => {
    if (!token) return;
    Alert.alert(
      "Delete payment?",
      "Remove this recorded payment transaction? The paid/remaining totals will be recalculated.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            if (!token) return;
            setPayEntryDeleting(key);
            try {
              await deletePaymentEntry(containerId, index, token);
              await loadPayments();
            } catch (error: any) {
              Alert.alert("Error", error.message || "Failed to delete payment");
            } finally {
              setPayEntryDeleting(null);
            }
          },
        },
      ],
    );
  };

  return (
    <View style={s.safe}>
      <GradientHeader
        title="Payments"
        subtitle="Track and record team payouts"
        leftIcon={<CreditCard color="#fff" size={20} />}
      />

      <View style={s.summaryBanner}>
        <View style={s.summaryItem}>
          <Text style={s.summaryLabel}>Total to Pay</Text>
          <Text style={[s.summaryValue, { color: "#F97316" }]}>
            Rs {totals.netTotal.toLocaleString()}
          </Text>
        </View>
        <View style={s.summaryDivider} />
        <View style={s.summaryItem}>
          <Text style={s.summaryLabel}>Paid</Text>
          <Text style={[s.summaryValue, { color: "#059669" }]}>
            Rs {totals.paid.toLocaleString()}
          </Text>
        </View>
        <View style={s.summaryDivider} />
        <View style={s.summaryItem}>
          <Text style={s.summaryLabel}>Remaining</Text>
          <Text style={[s.summaryValue, { color: "#DC2626" }]}>
            Rs {totals.netRemaining.toLocaleString()}
          </Text>
        </View>
      </View>

      <Pressable style={s.deductStrip} onPress={() => setBreakdownVisible(true)}>
        <Info color="#64748B" size={15} />
        <Text style={s.deductText}>
          Hold <Text style={s.deductRed}>− Rs {totals.hold.toLocaleString()}</Text>
        </Text>
        <Text style={s.deductDot}>•</Text>
        <Text style={s.deductText}>
          Misc <Text style={s.deductAmber}>− Rs {miscTotal.toLocaleString()}</Text>
        </Text>
        <Text style={s.deductTap}>Details</Text>
      </Pressable>

      <Pressable style={s.miscBtn} onPress={() => setMiscModalVisible(true)}>
        <MinusCircle color="#D97706" size={16} />
        <Text style={s.miscBtnText}>Add Miscellaneous</Text>
      </Pressable>

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
          const hold = p.totalPenalty ?? 0;
          const netDue = p.remainingAmount - hold;
          return (
            <View key={p._id} style={s.card}>
              <View style={s.cardTop}>
                <View>
                  <Text style={s.cardModel}>{p.model}</Text>
                  <Text style={s.cardTeam}>
                    {p.teamName}
                    {p.date ? ` · ${formatDateOnly(p.date)}` : ""}
                  </Text>
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
                <Text style={s.dueText}>Due: Rs {netDue.toLocaleString()}</Text>
              </View>
              {hold > 0 && (
                <View style={s.holdRow}>
                  <Text style={s.holdLabel}>Hold (pending vehicles)</Text>
                  <Text style={s.holdValue}>− Rs {hold.toLocaleString()}</Text>
                </View>
              )}

              {p.payments.length > 0 && (
                <View style={s.historyWrap}>
                  <Text style={s.historyTitle}>Payment History</Text>
                  {p.payments.map((entry, index) => {
                    const entryKey = `${p._id}-${index}`;
                    const isFallback = p._id.startsWith("fallback-");
                    return (
                      <View key={entryKey} style={s.historyItem}>
                        <Clock color="#94A3B8" size={12} />
                        <Text style={s.historyDate}>
                          {new Date(entry.paidAt).toLocaleDateString()}
                        </Text>
                        <Text style={s.historyAmt}>Rs {entry.amount.toLocaleString()}</Text>
                        {entry.note ? <Text style={s.historyNote}>- {entry.note}</Text> : null}
                        {!isFallback && (
                          <View style={s.entryActions}>
                            <Pressable
                              onPress={() =>
                                setPayEntryEdit({
                                  containerId: p.containerId,
                                  index,
                                  amount: String(entry.amount),
                                  note: entry.note ?? "",
                                })
                              }
                              hitSlop={8}
                            >
                              <Edit3 color="#F97316" size={14} />
                            </Pressable>
                            <Pressable
                              onPress={() => handleDeletePayEntry(p.containerId, index, entryKey)}
                              disabled={payEntryDeleting === entryKey}
                              hitSlop={8}
                            >
                              {payEntryDeleting === entryKey ? (
                                <ActivityIndicator color="#DC2626" size="small" />
                              ) : (
                                <Trash2 color="#DC2626" size={14} />
                              )}
                            </Pressable>
                          </View>
                        )}
                      </View>
                    );
                  })}
                </View>
              )}
            </View>
          );
        })}
        {loadingMore && <ActivityIndicator color="#F97316" style={{ marginVertical: 16 }} />}
        <View style={{ height: 20 }} />
      </ScrollView>

      <Modal visible={!!selectedPaymentId} transparent animationType="slide" statusBarTranslucent navigationBarTranslucent>
        <View style={s.overlay}>
          <KeyboardAvoidingView
            behavior="padding"
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
                        returnKeyType="done"
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
                <View style={{ height: insets.bottom + 80 }} />
              </ScrollView>
            </View>
          </KeyboardAvoidingView>
        </View>
      </Modal>

      <Modal visible={miscModalVisible} transparent animationType="slide" statusBarTranslucent navigationBarTranslucent>
        <View style={s.overlay}>
          <KeyboardAvoidingView
            behavior="padding"
            style={s.keyboardAvoid}
          >
            <View style={s.modal}>
              <ScrollView
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{ paddingBottom: Math.max(insets.bottom, 24) }}
              >
                <View style={s.modalHeader}>
                  <Text style={s.modalTitle}>Miscellaneous</Text>
                  <Pressable
                    onPress={() => {
                      setMiscModalVisible(false);
                      setMiscAmount("");
                      setMiscNote("");
                      setMiscEditingId(null);
                    }}
                  >
                    <X color="#94A3B8" size={22} />
                  </Pressable>
                </View>
                <Text style={s.modalSub}>
                  Total Miscellaneous:{" "}
                  <Text style={{ color: "#D97706" }}>Rs {miscTotal.toLocaleString()}</Text>
                  {" "}- deducted from remaining
                </Text>

                <View style={s.fieldWrap}>
                  <Text style={s.fieldLabel}>Amount (Rs)</Text>
                  <TextInput
                    style={s.fieldInput}
                    value={miscAmount}
                    onChangeText={setMiscAmount}
                    placeholder="Enter amount"
                    placeholderTextColor="#CBD5E1"
                    keyboardType="numeric"
                    returnKeyType="done"
                    editable={!miscSubmitting}
                  />
                </View>
                <View style={s.fieldWrap}>
                  <Text style={s.fieldLabel}>Note (optional)</Text>
                  <TextInput
                    style={s.fieldInput}
                    value={miscNote}
                    onChangeText={setMiscNote}
                    placeholder="e.g. Transport, repairs"
                    placeholderTextColor="#CBD5E1"
                    editable={!miscSubmitting}
                  />
                </View>
                <Pressable
                  onPress={handleAddMisc}
                  disabled={miscSubmitting}
                  style={[s.miscConfirmBtn, miscSubmitting && s.confirmBtnDisabled]}
                >
                  {miscSubmitting ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <>
                      {miscEditingId ? <Edit3 color="#fff" size={16} /> : <Plus color="#fff" size={16} />}
                      <Text style={s.confirmBtnText}>{miscEditingId ? "Update Amount" : "Add Amount"}</Text>
                    </>
                  )}
                </Pressable>

                {miscEntries.length > 0 && (
                  <View style={s.historyWrap}>
                    <Text style={s.historyTitle}>Entries</Text>
                    {miscEntries.map((entry) => (
                      <View key={entry._id} style={s.miscItem}>
                        <Clock color="#94A3B8" size={12} />
                        <Text style={s.historyDate}>
                          {new Date(entry.createdAt).toLocaleDateString()}
                        </Text>
                        {entry.note ? <Text style={s.historyNote}>- {entry.note}</Text> : null}
                        <Text style={s.miscItemAmt}>Rs {entry.amount.toLocaleString()}</Text>
                        <View style={s.entryActions}>
                          <Pressable onPress={() => openMiscEdit(entry)} hitSlop={8}>
                            <Edit3 color="#D97706" size={15} />
                          </Pressable>
                          <Pressable onPress={() => handleDeleteMisc(entry._id)} hitSlop={8}>
                            <Trash2 color="#DC2626" size={15} />
                          </Pressable>
                        </View>
                      </View>
                    ))}
                  </View>
                )}
                <View style={{ height: insets.bottom + 80 }} />
              </ScrollView>
            </View>
          </KeyboardAvoidingView>
        </View>
      </Modal>

      <Modal visible={breakdownVisible} transparent animationType="fade" statusBarTranslucent navigationBarTranslucent>
        <Pressable style={s.centerOverlay} onPress={() => setBreakdownVisible(false)}>
          <Pressable style={s.breakdownCard} onPress={() => {}}>
            <View style={s.modalHeader}>
              <Text style={s.modalTitle}>Payment Breakdown</Text>
              <Pressable onPress={() => setBreakdownVisible(false)}>
                <X color="#94A3B8" size={22} />
              </Pressable>
            </View>

            <View style={s.bdRow}>
              <Text style={s.bdLabel}>Gross total to pay</Text>
              <Text style={s.bdValue}>Rs {totals.grossTotal.toLocaleString()}</Text>
            </View>
            <View style={s.bdRow}>
              <Text style={s.bdLabel}>Hold (pending vehicles)</Text>
              <Text style={[s.bdValue, { color: "#DC2626" }]}>− Rs {totals.hold.toLocaleString()}</Text>
            </View>
            <View style={[s.bdRow, s.bdSubtotal]}>
              <Text style={[s.bdLabel, s.bdStrong]}>Total to pay</Text>
              <Text style={[s.bdValue, s.bdStrong, { color: "#F97316" }]}>
                Rs {totals.netTotal.toLocaleString()}
              </Text>
            </View>

            <View style={s.bdRow}>
              <Text style={s.bdLabel}>Paid</Text>
              <Text style={[s.bdValue, { color: "#059669" }]}>− Rs {totals.paid.toLocaleString()}</Text>
            </View>
            <View style={s.bdRow}>
              <Text style={s.bdLabel}>Miscellaneous</Text>
              <Text style={[s.bdValue, { color: "#D97706" }]}>− Rs {miscTotal.toLocaleString()}</Text>
            </View>
            <View style={[s.bdRow, s.bdTotal]}>
              <Text style={[s.bdLabel, s.bdStrong]}>Remaining</Text>
              <Text style={[s.bdValue, s.bdStrong, { color: "#DC2626" }]}>
                Rs {totals.netRemaining.toLocaleString()}
              </Text>
            </View>

            <Text style={s.bdNote}>
              Hold = pending vehicles × hold per vehicle. It is withheld from the payable amount
              and released as those vehicles are verified.
            </Text>
          </Pressable>
        </Pressable>
      </Modal>

      {/* Edit payment transaction modal */}
      <Modal visible={!!payEntryEdit} transparent animationType="slide" onRequestClose={() => setPayEntryEdit(null)} statusBarTranslucent navigationBarTranslucent>
        <View style={s.overlay}>
          <KeyboardAvoidingView
            behavior="padding"
            style={s.keyboardAvoid}
          >
            <View style={s.modal}>
              <View style={s.modalHeader}>
                <Text style={s.modalTitle}>Edit Payment</Text>
                <Pressable onPress={() => setPayEntryEdit(null)}>
                  <X color="#94A3B8" size={22} />
                </Pressable>
              </View>
              {payEntryEdit && (
                <ScrollView
                  keyboardShouldPersistTaps="handled"
                  showsVerticalScrollIndicator={false}
                  contentContainerStyle={{ paddingBottom: Math.max(insets.bottom, 24) }}
                >
                  <View style={s.fieldWrap}>
                    <Text style={s.fieldLabel}>Amount (Rs)</Text>
                    <TextInput
                      style={s.fieldInput}
                      value={payEntryEdit.amount}
                      onChangeText={(t) =>
                        setPayEntryEdit((prev) => (prev ? { ...prev, amount: t } : prev))
                      }
                      placeholder="Enter amount"
                      placeholderTextColor="#CBD5E1"
                      keyboardType="numeric"
                      editable={!payEntrySaving}
                    />
                  </View>
                  <View style={s.fieldWrap}>
                    <Text style={s.fieldLabel}>Note (optional)</Text>
                    <TextInput
                      style={s.fieldInput}
                      value={payEntryEdit.note}
                      onChangeText={(t) =>
                        setPayEntryEdit((prev) => (prev ? { ...prev, note: t } : prev))
                      }
                      placeholder="e.g. Advance payment"
                      placeholderTextColor="#CBD5E1"
                      editable={!payEntrySaving}
                    />
                  </View>
                  <Pressable
                    onPress={handleSavePayEntry}
                    disabled={payEntrySaving}
                    style={[s.confirmBtn, payEntrySaving && s.confirmBtnDisabled]}
                  >
                    {payEntrySaving ? (
                      <ActivityIndicator color="#fff" />
                    ) : (
                      <Text style={s.confirmBtnText}>Save changes</Text>
                    )}
                  </Pressable>
                </ScrollView>
              )}
            </View>
          </KeyboardAvoidingView>
        </View>
      </Modal>
    </View>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#F8FAFC" },
  header: { paddingHorizontal: 20, paddingTop: 20, paddingBottom: 12 },
  title: { fontSize: 20, fontWeight: "800", color: "#0F172A" },
  summaryBanner: { flexDirection: "row", marginHorizontal: 20, marginTop: 16, marginBottom: 16, backgroundColor: "#FFFFFF", borderRadius: 16, borderWidth: 1, borderColor: "#E2E8F0", padding: 16 },
  summaryItem: { flex: 1, alignItems: "center" },
  summaryLabel: { fontSize: 10, color: "#94A3B8", marginBottom: 4 },
  summaryValue: { fontSize: 15, fontWeight: "800" },
  summaryDivider: { width: 1, backgroundColor: "#E2E8F0", marginHorizontal: 6 },
  deductStrip: { flexDirection: "row", alignItems: "center", gap: 8, marginHorizontal: 20, marginTop: -6, marginBottom: 12, backgroundColor: "#FFFFFF", borderWidth: 1, borderColor: "#E2E8F0", borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10 },
  deductText: { fontSize: 12, color: "#64748B", fontWeight: "600" },
  deductRed: { color: "#DC2626", fontWeight: "700" },
  deductAmber: { color: "#D97706", fontWeight: "700" },
  deductDot: { fontSize: 12, color: "#CBD5E1" },
  deductTap: { marginLeft: "auto", fontSize: 12, color: "#F97316", fontWeight: "700" },
  holdRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", backgroundColor: "#FEF2F2", borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8, marginBottom: 4 },
  holdLabel: { fontSize: 11, color: "#B91C1C", fontWeight: "600" },
  holdValue: { fontSize: 12, color: "#DC2626", fontWeight: "700" },
  centerOverlay: { flex: 1, backgroundColor: "#00000055", justifyContent: "center", paddingHorizontal: 24 },
  breakdownCard: { backgroundColor: "#FFFFFF", borderRadius: 20, padding: 22, borderWidth: 1, borderColor: "#E2E8F0" },
  bdRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: 9 },
  bdLabel: { fontSize: 13, color: "#475569" },
  bdValue: { fontSize: 14, color: "#0F172A", fontWeight: "600" },
  bdStrong: { fontWeight: "800" },
  bdSubtotal: { borderTopWidth: 1, borderColor: "#E2E8F0", marginTop: 2, paddingTop: 11 },
  bdTotal: { borderTopWidth: 1.5, borderColor: "#E2E8F0", marginTop: 2, paddingTop: 11 },
  bdNote: { fontSize: 11, color: "#94A3B8", marginTop: 14, lineHeight: 16 },
  miscBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, marginHorizontal: 20, marginTop: -4, marginBottom: 12, backgroundColor: "#FFF7ED", borderWidth: 1, borderColor: "#FED7AA", borderRadius: 12, paddingVertical: 12 },
  miscBtnText: { color: "#D97706", fontWeight: "700", fontSize: 14 },
  miscConfirmBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, backgroundColor: "#D97706", borderRadius: 14, paddingVertical: 15, marginTop: 8 },
  miscItem: { flexDirection: "row", alignItems: "center", gap: 6 },
  miscItemAmt: { fontSize: 13, fontWeight: "700", color: "#0F172A", marginLeft: "auto", marginRight: 10 },
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
  entryActions: { flexDirection: "row", alignItems: "center", gap: 14, marginLeft: 10 },
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
