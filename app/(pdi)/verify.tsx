import { useAuthStore } from "@/stores/authStore";
import { editVerification, getProductionLogById } from "@/lib/api";
import { isNearScrollBottom } from "@/lib/scrollPagination";
import { PDIVerification, ProductionLog, useProductionStore } from "@/stores/productionStore";
import { GradientHeader } from "@/components/ui/GradientHeader";
import { AlertTriangle, CheckCircle, ClipboardCheck, Edit3, RotateCcw, X } from "lucide-react-native";
import { useCallback, useEffect, useState } from "react";
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

const getLogContainerModel = (log: ProductionLog) =>
  typeof log.container === "string" ? "Job" : log.container.model ?? "Job";

const getLogTeamName = (log: ProductionLog) =>
  typeof log.team === "string" ? "Team" : log.team.name;

const getVerificationContainerModel = (verification: PDIVerification) =>
  typeof verification.container === "string" ? "Job" : verification.container.model;

const getLogPenaltyPerUnit = (log: ProductionLog) =>
  typeof log.container === "string" ? 0 : log.container.penaltyPerUnit ?? 0;

const getVerificationLogId = (verification: PDIVerification) =>
  typeof verification.productionLog === "string"
    ? verification.productionLog
    : verification.productionLog._id;

const toSafeNumber = (value: unknown) => {
  const numberValue = Number(value);
  return Number.isFinite(numberValue) ? numberValue : 0;
};

export default function PdiVerify() {
  const insets = useSafeAreaInsets();
  const { token } = useAuthStore();
  const { pendingVerificationsPagination, productionLogs, pdiVerifications, fetchPendingVerifications, fetchPDIDashboard, verifyProductionLog, unverifyProductionLog } =
    useProductionStore();
  const [unverifyingId, setUnverifyingId] = useState<string | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [verifiedQty, setVerifiedQty] = useState("");
  const [note, setNote] = useState("");
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Edit incomplete verification state
  const [editing, setEditing] = useState<PDIVerification | null>(null);
  const [editQty, setEditQty] = useState("");
  const [editRemarks, setEditRemarks] = useState("");
  const [editReported, setEditReported] = useState<number | null>(null);
  const [editTeamName, setEditTeamName] = useState<string>("");
  const [editLoading, setEditLoading] = useState(false);
  const [editSubmitting, setEditSubmitting] = useState(false);

  const pending = productionLogs.filter((log) => log.status === "pending");
  const done = pdiVerifications;
  const selectedItem = pending.find((log) => log._id === selected);

  const loadPending = useCallback(async () => {
    if (!token) return;
    await fetchPendingVerifications(token);
  }, [fetchPendingVerifications, token]);

  useEffect(() => {
    loadPending().catch((error: any) => {
      Alert.alert("Error", error.message || "Failed to load pending verifications");
    });
  }, [loadPending]);

  const handleRefresh = async () => {
    if (!token) return;
    setRefreshing(true);
    try {
      await loadPending();
    } catch (error: any) {
      Alert.alert("Error", error.message || "Failed to refresh verifications");
    } finally {
      setRefreshing(false);
    }
  };

  const handleLoadMore = async () => {
    if (!token || loadingMore || !pendingVerificationsPagination.hasNextPage) return;
    setLoadingMore(true);
    try {
      await fetchPendingVerifications(token, pendingVerificationsPagination.page + 1);
    } catch (error: any) {
      Alert.alert("Error", error.message || "Failed to load more pending verifications");
    } finally {
      setLoadingMore(false);
    }
  };

  const openVerify = (log: ProductionLog) => {
    setSelected(log._id);
    setVerifiedQty(String(log.reportedQuantity));
    setNote("");
  };

  const closeModal = () => {
    setSelected(null);
    setVerifiedQty("");
    setNote("");
  };

  const openEdit = async (verification: PDIVerification) => {
    setEditing(verification);
    setEditQty(String(verification.verifiedQuantity ?? ""));
    setEditRemarks(verification.remarks ?? "");
    setEditReported(null);
    setEditTeamName("");
    if (!token) return;
    const logId =
      typeof verification.productionLog === "string"
        ? verification.productionLog
        : verification.productionLog._id;
    if (!logId) return;
    setEditLoading(true);
    try {
      const res = await getProductionLogById(logId, token);
      const log = res.log as any;
      if (log) {
        setEditReported(log.reportedQuantity ?? null);
        if (log.team && typeof log.team === "object" && log.team.name) {
          setEditTeamName(log.team.name);
        }
      }
    } catch {
      // Non-fatal — fields stay empty
    } finally {
      setEditLoading(false);
    }
  };

  const closeEdit = () => {
    setEditing(null);
    setEditQty("");
    setEditRemarks("");
    setEditReported(null);
    setEditTeamName("");
  };

  const handleSaveEdit = async () => {
    if (editSubmitting || !editing || !token) return;
    const qty = Number(editQty);
    if (!editQty || Number.isNaN(qty) || qty < 0) {
      Alert.alert("Error", "Enter a valid corrected quantity");
      return;
    }
    if (editReported != null && qty > editReported) {
      Alert.alert("Error", `Corrected quantity cannot exceed reported (${editReported})`);
      return;
    }
    setEditSubmitting(true);
    try {
      await editVerification(
        editing._id,
        { verifiedQuantity: qty, remarks: editRemarks || undefined },
        token,
      );
      closeEdit();
      await fetchPendingVerifications(token);
      Alert.alert("Updated", "Verification corrected");
    } catch (e: any) {
      Alert.alert("Error", e.message || "Failed to update verification");
    } finally {
      setEditSubmitting(false);
    }
  };

  const handleVerify = async () => {
    if (submitting) return;
    if (!selected || !verifiedQty) {
      Alert.alert("Error", "Enter verified quantity");
      return;
    }
    if (!token) {
      Alert.alert("Error", "Not authenticated");
      return;
    }

    const qty = Number(verifiedQty);
    if (Number.isNaN(qty) || qty < 0) {
      Alert.alert("Error", "Enter a valid number");
      return;
    }
    if (selectedItem && qty > selectedItem.reportedQuantity) {
      Alert.alert("Error", `Cannot verify more than reported (${selectedItem.reportedQuantity})`);
      return;
    }

    const isIncomplete = qty < (selectedItem?.reportedQuantity ?? 0);
    try {
      setSubmitting(true);
      await verifyProductionLog(selected, qty, isIncomplete, note || undefined, token);
      closeModal();
      await loadPending();
      Alert.alert("Verified", `${qty} units marked as ${isIncomplete ? "incomplete" : "verified"}`);
    } catch (error: any) {
      Alert.alert("Error", error.message || "Failed to submit verification");
    } finally {
      setSubmitting(false);
    }
  };

  const handleUnverify = (verification: PDIVerification) => {
    const logId = getVerificationLogId(verification);
    if (!logId || !token) return;
    Alert.alert(
      "Unverify entry?",
      "This will revert the verification and send the entry back to pending for re-verification.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Unverify",
          style: "destructive",
          onPress: async () => {
            if (!token) return;
            setUnverifyingId(verification._id);
            try {
              await unverifyProductionLog(logId, token);
              await Promise.all([fetchPendingVerifications(token), fetchPDIDashboard(token)]);
              Alert.alert("Reverted", "Entry sent back to pending");
            } catch (error: any) {
              Alert.alert("Error", error.message || "Failed to unverify");
            } finally {
              setUnverifyingId(null);
            }
          },
        },
      ],
    );
  };

  return (
    <View style={s.safe}>
      <GradientHeader
        title="Verify Production"
        subtitle="Approve or flag reported quantities"
        leftIcon={<ClipboardCheck color="#fff" size={20} />}
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

        <Text style={s.sectionLabel}>PENDING VERIFICATION ({pending.length})</Text>
        {pending.length === 0 && (
          <View style={s.emptyCard}>
            <Text style={s.emptyTitle}>All Clear</Text>
            <Text style={s.emptyText}>No pending verifications</Text>
          </View>
        )}
        {pending.map((log) => (
          <View key={log._id} style={s.pendingCard}>
            <View style={s.cardTop}>
              <View style={s.cardInfo}>
                <Text style={s.cardModel}>{getLogContainerModel(log)}</Text>
                <Text style={s.cardMeta}>
                  {getLogTeamName(log)} - {log.date}
                </Text>
              </View>
              <View style={s.pendingBadge}>
                <Text style={s.pendingBadgeText}>PENDING</Text>
              </View>
            </View>
            <View style={s.reportedRow}>
              <Text style={s.reportedLabel}>Team reported:</Text>
              <Text style={s.reportedValue}>{log.reportedQuantity} units</Text>
            </View>
            {getLogPenaltyPerUnit(log) > 0 && (
              <View style={s.penaltyPill}>
                <Text style={s.penaltyPillText}>Hold / vehicle: Rs {getLogPenaltyPerUnit(log)}</Text>
              </View>
            )}
            <Pressable onPress={() => openVerify(log)} style={s.verifyBtn}>
              <ClipboardCheck color="#fff" size={16} />
              <Text style={s.verifyBtnText}>Verify Now</Text>
            </Pressable>
          </View>
        ))}

        {done.length > 0 && (
          <>
            <Text style={s.sectionLabel}>COMPLETED ({done.length})</Text>
            {done.map((verification) => {
              const color = verification.isIncomplete ? "#D97706" : "#059669";
              const bg = verification.isIncomplete ? "#FFFBEB" : "#F0FDF4";
              const verifiedQuantity = toSafeNumber(verification.verifiedQuantity);
              const missingQuantity = toSafeNumber(verification.missingQuantity);
              return (
                <View key={verification._id} style={s.doneCard}>
                  <View style={s.cardTop}>
                    <View style={s.cardInfo}>
                      <Text style={s.cardModel}>{getVerificationContainerModel(verification)}</Text>
                      <Text style={s.cardMeta}>{new Date(verification.verifiedAt).toLocaleDateString()}</Text>
                    </View>
                    <View style={[s.doneBadge, { backgroundColor: bg, borderColor: color + "50" }]}>
                      <Text style={[s.doneBadgeText, { color }]}>
                        {verification.isIncomplete ? "INCOMPLETE" : "VERIFIED"}
                      </Text>
                    </View>
                  </View>
                  <View style={s.doneStats}>
                    <View style={s.doneStat}>
                      <Text style={s.doneStatLabel}>Verified</Text>
                      <Text style={[s.doneStatValue, { color }]}>{verifiedQuantity}</Text>
                    </View>
                    {missingQuantity > 0 && (
                      <View style={s.doneStat}>
                        <Text style={s.doneStatLabel}>Missing</Text>
                        <Text style={[s.doneStatValue, { color: "#DC2626" }]}>{missingQuantity}</Text>
                      </View>
                    )}
                  </View>
                  {verification.remarks && <Text style={s.doneNote}>{verification.remarks}</Text>}
                  <View style={s.doneActions}>
                    <Pressable onPress={() => openEdit(verification)} style={s.editBtn}>
                      <Edit3 color="#D97706" size={14} />
                      <Text style={s.editBtnText}>Edit</Text>
                    </Pressable>
                    <Pressable
                      onPress={() => handleUnverify(verification)}
                      disabled={unverifyingId === verification._id}
                      style={s.unverifyBtn}
                    >
                      {unverifyingId === verification._id ? (
                        <ActivityIndicator color="#DC2626" size="small" />
                      ) : (
                        <>
                          <RotateCcw color="#DC2626" size={14} />
                          <Text style={s.unverifyBtnText}>Unverify</Text>
                        </>
                      )}
                    </Pressable>
                  </View>
                </View>
              );
            })}
          </>
        )}
        {loadingMore && <ActivityIndicator color="#F97316" style={{ marginVertical: 16 }} />}
        <View style={{ height: 24 }} />
      </ScrollView>

      {/* Edit incomplete modal */}
      <Modal visible={!!editing} transparent animationType="slide" onRequestClose={closeEdit}>
        <View style={s.overlay}>
          <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={s.keyboardAvoid}>
            <View style={s.modal}>
              <ScrollView
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{ paddingBottom: Math.max(insets.bottom, 24) }}
              >
                <View style={s.modalHeader}>
                  <Text style={s.modalTitle}>Edit Verification</Text>
                  <Pressable onPress={closeEdit}>
                    <X color="#94A3B8" size={22} />
                  </Pressable>
                </View>

                {editing && (
                  <>
                    <View style={s.modalInfo}>
                      <Text style={s.modalModel}>
                        {typeof editing.container === "string"
                          ? "Container"
                          : editing.container.model ?? "Container"}
                      </Text>
                      <Text style={s.modalMeta}>
                        {editTeamName || "Team"} · {new Date(editing.verifiedAt).toLocaleDateString()}
                      </Text>
                      <View style={s.editInfoRow}>
                        <View style={s.editInfoCell}>
                          <Text style={s.editInfoLabel}>Reported</Text>
                          <Text style={s.editInfoValue}>
                            {editLoading ? "…" : editReported != null ? editReported : "—"}
                          </Text>
                        </View>
                        <View style={s.editInfoCell}>
                          <Text style={s.editInfoLabel}>Current verified</Text>
                          <Text style={[s.editInfoValue, { color: "#D97706" }]}>
                            {editing.verifiedQuantity}
                          </Text>
                        </View>
                      </View>
                    </View>

                    <View style={s.fieldWrap}>
                      <Text style={s.fieldLabel}>Corrected quantity</Text>
                      <TextInput
                        style={s.fieldInput}
                        value={editQty}
                        onChangeText={setEditQty}
                        placeholder="Enter corrected count"
                        placeholderTextColor="#CBD5E1"
                        keyboardType="numeric"
                        returnKeyType="done"
                        editable={!editSubmitting}
                      />
                    </View>

                    <View style={s.fieldWrap}>
                      <Text style={s.fieldLabel}>Remarks (optional)</Text>
                      <TextInput
                        style={s.fieldInput}
                        value={editRemarks}
                        onChangeText={setEditRemarks}
                        placeholder="e.g. recount after rework"
                        placeholderTextColor="#CBD5E1"
                        editable={!editSubmitting}
                      />
                    </View>

                    <Pressable
                      onPress={handleSaveEdit}
                      disabled={editSubmitting}
                      style={[s.confirmBtn, editSubmitting && s.confirmBtnDisabled]}
                    >
                      {editSubmitting ? (
                        <ActivityIndicator color="#fff" />
                      ) : (
                        <Text style={s.confirmBtnText}>Save correction</Text>
                      )}
                    </Pressable>
                  </>
                )}
              </ScrollView>
            </View>
          </KeyboardAvoidingView>
        </View>
      </Modal>

      <Modal visible={!!selected} transparent animationType="slide">
        <View style={s.overlay}>
          <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={s.keyboardAvoid}>
            <View style={s.modal}>
              <ScrollView
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{ paddingBottom: Math.max(insets.bottom, 24) }}
              >
                <View style={s.modalHeader}>
                  <Text style={s.modalTitle}>Verify Entry</Text>
                  <Pressable onPress={closeModal}>
                    <X color="#94A3B8" size={22} />
                  </Pressable>
                </View>

                {selectedItem && (
                  <>
                    <View style={s.modalInfo}>
                      <Text style={s.modalModel}>{getLogContainerModel(selectedItem)}</Text>
                      <Text style={s.modalMeta}>
                        {getLogTeamName(selectedItem)} - {selectedItem.date}
                      </Text>
                      <View style={s.reportedPill}>
                        <Text style={s.reportedPillText}>Team reported: {selectedItem.reportedQuantity} units</Text>
                      </View>
                    </View>

                    <View style={s.fieldWrap}>
                      <Text style={s.fieldLabel}>Verified Quantity</Text>
                      <TextInput
                        style={s.fieldInput}
                        value={verifiedQty}
                        onChangeText={setVerifiedQty}
                        placeholder="Enter actual verified count"
                        placeholderTextColor="#CBD5E1"
                        keyboardType="numeric"
                        editable={!submitting}
                      />
                    </View>

                    <View style={s.quickRow}>
                      <Pressable
                        onPress={() => setVerifiedQty(String(selectedItem.reportedQuantity))}
                        disabled={submitting}
                        style={[s.quickChip, { backgroundColor: "#F0FDF4", borderColor: "#BBF7D0" }]}
                      >
                        <CheckCircle color="#059669" size={14} />
                        <Text style={[s.quickChipText, { color: "#059669" }]}>Full ({selectedItem.reportedQuantity})</Text>
                      </Pressable>
                      <Pressable
                        onPress={() => setVerifiedQty("")}
                        disabled={submitting}
                        style={[s.quickChip, { backgroundColor: "#FFFBEB", borderColor: "#FDE68A" }]}
                      >
                        <AlertTriangle color="#D97706" size={14} />
                        <Text style={[s.quickChipText, { color: "#D97706" }]}>Incomplete</Text>
                      </Pressable>
                    </View>

                    <View style={s.fieldWrap}>
                      <Text style={s.fieldLabel}>Note (optional)</Text>
                      <TextInput
                        style={s.fieldInput}
                        value={note}
                        onChangeText={setNote}
                        placeholder="e.g. 2 units had paint defects"
                        placeholderTextColor="#CBD5E1"
                        editable={!submitting}
                      />
                    </View>

                    <Pressable
                      onPress={handleVerify}
                      disabled={submitting}
                      style={[s.confirmBtn, submitting && s.confirmBtnDisabled]}
                    >
                      {submitting ? (
                        <ActivityIndicator color="#fff" />
                      ) : (
                        <Text style={s.confirmBtnText}>Submit Verification</Text>
                      )}
                    </Pressable>
                  </>
                )}
              </ScrollView>
            </View>
          </KeyboardAvoidingView>
        </View>
      </Modal>
    </View>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#F8FAFC" },
  header: { flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: 20, paddingTop: 20, paddingBottom: 16 },
  title: { fontSize: 22, fontWeight: "800", color: "#0F172A" },
  sectionLabel: { fontSize: 11, fontWeight: "700", color: "#94A3B8", letterSpacing: 1.5, paddingHorizontal: 20, marginBottom: 12 },
  emptyCard: { marginHorizontal: 20, padding: 32, backgroundColor: "#FFFFFF", borderRadius: 18, borderWidth: 1, borderColor: "#E2E8F0", alignItems: "center", marginBottom: 20 },
  emptyTitle: { fontSize: 18, fontWeight: "800", color: "#0F172A", marginBottom: 4 },
  emptyText: { fontSize: 13, color: "#94A3B8" },
  pendingCard: { marginHorizontal: 20, marginBottom: 12, backgroundColor: "#FFFBEB", borderRadius: 18, borderWidth: 1, borderColor: "#FDE68A", padding: 16 },
  cardTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 },
  cardInfo: { flex: 1 },
  cardModel: { fontSize: 16, fontWeight: "700", color: "#0F172A" },
  cardMeta: { fontSize: 12, color: "#64748B", marginTop: 2 },
  pendingBadge: { backgroundColor: "#FFF7ED", borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4, borderWidth: 1, borderColor: "#FED7AA" },
  pendingBadgeText: { fontSize: 10, fontWeight: "700", color: "#D97706" },
  reportedRow: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 14 },
  reportedLabel: { fontSize: 13, color: "#64748B" },
  reportedValue: { fontSize: 18, fontWeight: "800", color: "#0F172A" },
  verifyBtn: { backgroundColor: "#F97316", borderRadius: 12, paddingVertical: 12, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8 },
  verifyBtnText: { color: "#fff", fontWeight: "700", fontSize: 14 },
  doneCard: { marginHorizontal: 20, marginBottom: 10, backgroundColor: "#FFFFFF", borderRadius: 14, borderWidth: 1, borderColor: "#E2E8F0", padding: 14 },
  doneBadge: { borderRadius: 8, borderWidth: 1, paddingHorizontal: 8, paddingVertical: 4 },
  doneBadgeText: { fontSize: 10, fontWeight: "700" },
  doneStats: { flexDirection: "row", gap: 24 },
  doneStat: { gap: 2 },
  doneStatLabel: { fontSize: 10, color: "#94A3B8" },
  doneStatValue: { fontSize: 15, fontWeight: "700", color: "#0F172A" },
  doneNote: { fontSize: 12, color: "#D97706", marginTop: 8 },
  editBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    alignSelf: "flex-start",
    marginTop: 10,
    backgroundColor: "#FFFBEB",
    borderWidth: 1,
    borderColor: "#FDE68A",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  editBtnText: { fontSize: 12, fontWeight: "700", color: "#D97706" },
  doneActions: { flexDirection: "row", gap: 8, marginTop: 10 },
  unverifyBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    alignSelf: "flex-start",
    backgroundColor: "#FEF2F2",
    borderWidth: 1,
    borderColor: "#FECACA",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    minWidth: 92,
    justifyContent: "center",
  },
  unverifyBtnText: { fontSize: 12, fontWeight: "700", color: "#DC2626" },
  penaltyPill: {
    backgroundColor: "#FEF2F2",
    borderRadius: 8,
    paddingVertical: 6,
    paddingHorizontal: 12,
    alignSelf: "flex-start",
    borderWidth: 1,
    borderColor: "#FECACA",
    marginBottom: 14,
  },
  penaltyPillText: { fontSize: 12, fontWeight: "700", color: "#DC2626" },
  editInfoRow: { flexDirection: "row", marginTop: 12, gap: 16 },
  editInfoCell: { flex: 1 },
  editInfoLabel: { fontSize: 10, color: "#94A3B8", letterSpacing: 0.4, marginBottom: 3 },
  editInfoValue: { fontSize: 16, fontWeight: "700", color: "#0F172A" },
  overlay: { flex: 1, backgroundColor: "#00000080", justifyContent: "flex-end" },
  keyboardAvoid: { width: "100%" },
  modal: { backgroundColor: "#FFFFFF", borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 24, borderTopWidth: 1, borderColor: "#E2E8F0", maxHeight: "90%" },
  modalHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 16 },
  modalTitle: { fontSize: 20, fontWeight: "800", color: "#0F172A" },
  modalInfo: { backgroundColor: "#F8FAFC", borderRadius: 14, padding: 14, marginBottom: 16, borderWidth: 1, borderColor: "#E2E8F0" },
  modalModel: { fontSize: 16, fontWeight: "700", color: "#0F172A", marginBottom: 2 },
  modalMeta: { fontSize: 12, color: "#64748B", marginBottom: 10 },
  reportedPill: { backgroundColor: "#FFF7ED", borderRadius: 8, paddingVertical: 6, paddingHorizontal: 12, alignSelf: "flex-start", borderWidth: 1, borderColor: "#FED7AA" },
  reportedPillText: { fontSize: 13, fontWeight: "600", color: "#F97316" },
  fieldWrap: { marginBottom: 14 },
  fieldLabel: { fontSize: 12, fontWeight: "600", color: "#475569", marginBottom: 6 },
  fieldInput: { backgroundColor: "#F8FAFC", borderWidth: 1, borderColor: "#E2E8F0", borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, color: "#0F172A", fontSize: 14 },
  quickRow: { flexDirection: "row", gap: 10, marginBottom: 14 },
  quickChip: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, borderRadius: 10, borderWidth: 1, paddingVertical: 10 },
  quickChipText: { fontSize: 13, fontWeight: "700" },
  confirmBtn: { backgroundColor: "#F97316", borderRadius: 14, paddingVertical: 15, alignItems: "center", marginTop: 4 },
  confirmBtnDisabled: { opacity: 0.65 },
  confirmBtnText: { color: "#fff", fontWeight: "700", fontSize: 16 },
});
