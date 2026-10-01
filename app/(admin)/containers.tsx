import { useAuthStore } from "@/stores/authStore";
import { isNearScrollBottom } from "@/lib/scrollPagination";
import { Container, PDIVerification, ProductionLog, Team, useProductionStore } from "@/stores/productionStore";
import { GradientHeader } from "@/components/ui/GradientHeader";
import { Package, PackageSearch, Pencil, Plus, Trash2, X } from "lucide-react-native";
import { useEffect, useState } from "react";
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

const getTeamName = (container: Container) =>
  typeof container.assignedTeam === "string" ? "Team" : container.assignedTeam.name;

const getContainerId = (value: string | { _id: string }) =>
  typeof value === "string" ? value : value._id;

const getVerifiedForContainer = (verifications: PDIVerification[], containerId: string) =>
  verifications
    .filter((v) => getContainerId(v.container) === containerId)
    .reduce((sum, v) => sum + (v.verifiedQuantity || 0), 0);

const getReportedForContainer = (logs: ProductionLog[], containerId: string) =>
  logs
    .filter((log) => getContainerId(log.container) === containerId)
    .reduce((sum, log) => sum + log.reportedQuantity, 0);

const formatDateOnly = (value: string) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

export default function AdminContainers() {
  const insets = useSafeAreaInsets();
  const { containers, containersPagination, pdiVerifications, productionLogs, teams, fetchContainers, fetchTeams, createContainer, updateContainer, deleteContainer } =
    useProductionStore();
  const { token } = useAuthStore();
  const productionTeams = teams.filter((team) => team.role === "team");
  const firstTeam = productionTeams[0];
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({
    model: "",
    quantity: "",
    ratePerUnit: "",
    penaltyPerUnit: "",
    assignedTeamId: firstTeam?._id ?? "",
    date: new Date().toISOString().split("T")[0],
  });
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Edit penalty state
  const [penaltyTarget, setPenaltyTarget] = useState<Container | null>(null);
  const [penaltyValue, setPenaltyValue] = useState("");
  const [penaltySubmitting, setPenaltySubmitting] = useState(false);

  // Full edit container state
  const [editTarget, setEditTarget] = useState<Container | null>(null);
  const [editForm, setEditForm] = useState({
    model: "",
    quantity: "",
    ratePerUnit: "",
    date: "",
    status: "active" as "active" | "completed" | "cancelled",
  });
  const [editSubmitting, setEditSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    if (!token) return;

    Promise.all([fetchContainers(token), fetchTeams(token)]).catch((error: any) => {
      Alert.alert("Error", error.message || "Failed to load jobs");
    });
  }, [fetchContainers, fetchTeams, token]);

  useEffect(() => {
    if (form.assignedTeamId || !firstTeam?._id) return;

    setForm((prev) => ({ ...prev, assignedTeamId: firstTeam._id }));
  }, [firstTeam?._id, form.assignedTeamId]);

  const handleRefresh = async () => {
    if (!token) return;
    setRefreshing(true);
    try {
      await Promise.all([fetchContainers(token), fetchTeams(token)]);
    } catch (error: any) {
      Alert.alert("Error", error.message || "Failed to refresh jobs");
    } finally {
      setRefreshing(false);
    }
  };

  const handleLoadMore = async () => {
    if (!token || loadingMore || !containersPagination.hasNextPage) return;
    setLoadingMore(true);
    try {
      await fetchContainers(token, containersPagination.page + 1);
    } catch (error: any) {
      Alert.alert("Error", error.message || "Failed to load more jobs");
    } finally {
      setLoadingMore(false);
    }
  };

  const handleCreate = async () => {
    if (submitting) return;
    if (!form.model || !form.quantity || !form.ratePerUnit || !form.assignedTeamId) {
      Alert.alert("Error", "Fill all fields and select a team");
      return;
    }
    if (!token) {
      Alert.alert("Error", "Not authenticated");
      return;
    }

    try {
      setSubmitting(true);
      await createContainer(
        form.model,
        Number(form.quantity),
        form.date,
        Number(form.ratePerUnit),
        Number(form.penaltyPerUnit) || 0,
        form.assignedTeamId,
        token,
      );
      setShowModal(false);
      setForm({
        model: "",
        quantity: "",
        ratePerUnit: "",
        penaltyPerUnit: "",
        assignedTeamId: firstTeam?._id ?? "",
        date: new Date().toISOString().split("T")[0],
      });
      Alert.alert("Success", "Job assigned successfully!");
    } catch (error: any) {
      Alert.alert("Error", error.message || "Failed to assign job");
    } finally {
      setSubmitting(false);
    }
  };

  const openPenaltyEdit = (container: Container) => {
    setPenaltyTarget(container);
    setPenaltyValue(String(container.penaltyPerUnit ?? 0));
  };

  const closePenaltyEdit = () => {
    setPenaltyTarget(null);
    setPenaltyValue("");
  };

  const handleSavePenalty = async () => {
    if (penaltySubmitting || !penaltyTarget) return;
    const value = Number(penaltyValue);
    if (penaltyValue === "" || Number.isNaN(value) || value < 0) {
      Alert.alert("Error", "Enter a valid hold amount (0 or more)");
      return;
    }
    if (!token) {
      Alert.alert("Error", "Not authenticated");
      return;
    }
    try {
      setPenaltySubmitting(true);
      await updateContainer(penaltyTarget._id, { penaltyPerUnit: value }, token);
      closePenaltyEdit();
      Alert.alert("Updated", "Hold per vehicle updated");
    } catch (error: any) {
      Alert.alert("Error", error.message || "Failed to update hold");
    } finally {
      setPenaltySubmitting(false);
    }
  };

  const openEdit = (container: Container) => {
    setEditTarget(container);
    setEditForm({
      model: container.model,
      quantity: String(container.quantity),
      ratePerUnit: String(container.ratePerUnit),
      date: new Date(container.date).toISOString().split("T")[0],
      status: container.status,
    });
  };

  const closeEdit = () => {
    setEditTarget(null);
  };

  const handleSaveEdit = async () => {
    if (editSubmitting || !editTarget || !token) return;
    if (!editForm.model || !editForm.quantity || !editForm.ratePerUnit) {
      Alert.alert("Error", "Model, quantity and rate are required");
      return;
    }
    if (Number(editForm.quantity) < 1) {
      Alert.alert("Error", "Target quantity must be at least 1");
      return;
    }
    try {
      setEditSubmitting(true);
      await updateContainer(
        editTarget._id,
        {
          model: editForm.model,
          quantity: Number(editForm.quantity),
          ratePerUnit: Number(editForm.ratePerUnit),
          date: editForm.date,
          status: editForm.status,
        },
        token,
      );
      closeEdit();
      Alert.alert("Updated", "Container updated");
    } catch (error: any) {
      Alert.alert("Error", error.message || "Failed to update container");
    } finally {
      setEditSubmitting(false);
    }
  };

  const handleDeleteContainer = (container: Container) => {
    if (!token) return;
    Alert.alert(
      "Delete container?",
      `Delete ${container.model}? This cannot be undone and also removes its production logs, verifications and payment ledger.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            if (!token) return;
            setDeletingId(container._id);
            try {
              await deleteContainer(container._id, token);
              if (editTarget?._id === container._id) closeEdit();
              Alert.alert("Deleted", "Container removed");
            } catch (error: any) {
              Alert.alert("Error", error.message || "Failed to delete container");
            } finally {
              setDeletingId(null);
            }
          },
        },
      ],
    );
  };

  const statusColors: Record<string, string> = { active: "#059669", completed: "#F97316", cancelled: "#DC2626" };
  const statusBg: Record<string, string> = { active: "#F0FDF4", completed: "#FFF7ED", cancelled: "#FEF2F2" };

  return (
    <View style={s.safe}>
      <GradientHeader
        title="Containers"
        subtitle="Assign and track production jobs"
        leftIcon={<PackageSearch color="#fff" size={20} />}
        right={
          <Pressable onPress={() => setShowModal(true)} style={s.addBtn}>
            <Plus color="#fff" size={16} />
            <Text style={s.addBtnText}>Assign</Text>
          </Pressable>
        }
      />

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
        {containers.map((container) => {
          const verified = container.verifiedQuantity ?? getVerifiedForContainer(pdiVerifications, container._id);
          const reported = getReportedForContainer(productionLogs, container._id);
          const progress =
            container.quantity > 0 ? Math.min((verified / container.quantity) * 100, 100) : 0;
          const statusColor = statusColors[container.status] ?? "#64748B";
          const penaltyPerUnit = container.penaltyPerUnit ?? 0;
          const pending = container.pendingQuantity ?? Math.max(0, container.quantity - verified);
          const totalPenalty = container.totalPenalty ?? pending * penaltyPerUnit;
          return (
            <View key={container._id} style={s.card}>
              <View style={s.cardTop}>
                <View style={s.cardIcon}>
                  <Package color="#F97316" size={20} />
                </View>
                <View style={s.cardInfo}>
                  <Text style={s.cardModel}>{container.model}</Text>
                  <Text style={s.cardMeta}>
                    {getTeamName(container)} - {formatDateOnly(container.date)}
                  </Text>
                </View>
                <View style={[s.badge, { backgroundColor: statusBg[container.status] ?? "#F1F5F9" }]}>
                  <Text style={[s.badgeText, { color: statusColor }]}>
                    {container.status.toUpperCase()}
                  </Text>
                </View>
                <Pressable onPress={() => openEdit(container)} style={s.cardActionBtn} hitSlop={6}>
                  <Pencil color="#475569" size={15} />
                </Pressable>
                <Pressable
                  onPress={() => handleDeleteContainer(container)}
                  disabled={deletingId === container._id}
                  style={s.cardActionBtn}
                  hitSlop={6}
                >
                  {deletingId === container._id ? (
                    <ActivityIndicator color="#DC2626" size="small" />
                  ) : (
                    <Trash2 color="#DC2626" size={15} />
                  )}
                </Pressable>
              </View>
              <View style={s.progressBg}>
                <View style={[s.progressFill, { width: `${progress}%` as any, backgroundColor: statusColor }]} />
              </View>
              <Text style={s.progressLabel}>
                {verified} / {container.quantity} verified - {progress.toFixed(0)}%
              </Text>
              <View style={s.statsRow}>
                <View style={s.stat}><Text style={s.statLbl}>Target</Text><Text style={s.statVal}>{container.quantity}</Text></View>
                <View style={s.stat}><Text style={s.statLbl}>Reported</Text><Text style={[s.statVal, { color: "#D97706" }]}>{reported}</Text></View>
                <View style={s.stat}><Text style={s.statLbl}>Verified</Text><Text style={[s.statVal, { color: "#059669" }]}>{verified}</Text></View>
                <View style={s.stat}><Text style={s.statLbl}>Rate</Text><Text style={[s.statVal, { color: "#F97316" }]}>Rs {container.ratePerUnit}</Text></View>
              </View>

              {/* Penalty section */}
              <View style={s.penaltyBox}>
                <View style={s.penaltyRow}>
                  <View style={s.stat}><Text style={s.statLbl}>Pending</Text><Text style={[s.statVal, { color: "#DC2626" }]}>{pending}</Text></View>
                  <View style={s.stat}><Text style={s.statLbl}>Hold / Vehicle</Text><Text style={[s.statVal, { color: "#DC2626" }]}>Rs {penaltyPerUnit}</Text></View>
                  <View style={s.stat}><Text style={s.statLbl}>Total Hold</Text><Text style={[s.statVal, { color: "#DC2626" }]}>Rs {totalPenalty}</Text></View>
                  <Pressable onPress={() => openPenaltyEdit(container)} style={s.penaltyEditBtn} hitSlop={8}>
                    <Pencil color="#DC2626" size={14} />
                  </Pressable>
                </View>
              </View>
            </View>
          );
        })}
        {loadingMore && <ActivityIndicator color="#F97316" style={{ marginVertical: 16 }} />}
        <View style={{ height: 20 }} />
      </ScrollView>

      <Modal visible={showModal} transparent animationType="slide" statusBarTranslucent navigationBarTranslucent>
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
                  <Text style={s.modalTitle}>Assign New Job</Text>
                  <Pressable onPress={() => setShowModal(false)}>
                    <X color="#94A3B8" size={22} />
                  </Pressable>
                </View>
                {[
                  { label: "Scooter Model", key: "model", placeholder: "e.g. Ola S1 Pro" },
                  { label: "Target Quantity", key: "quantity", placeholder: "e.g. 100", keyboard: "numeric" as const },
                  { label: "Rate per Unit (Rs)", key: "ratePerUnit", placeholder: "e.g. 250", keyboard: "numeric" as const },
                  { label: "Hold per Pending Vehicle (Rs)", key: "penaltyPerUnit", placeholder: "e.g. 100", keyboard: "numeric" as const },
                  { label: "Date", key: "date", placeholder: "YYYY-MM-DD" },
                ].map((field) => (
                  <View key={field.key} style={s.fieldWrap}>
                    <Text style={s.fieldLabel}>{field.label}</Text>
                    <TextInput
                      style={s.fieldInput}
                      value={form[field.key as keyof typeof form]}
                      onChangeText={(value) => setForm((prev) => ({ ...prev, [field.key]: value }))}
                      placeholder={field.placeholder}
                      placeholderTextColor="#CBD5E1"
                      keyboardType={field.keyboard ?? "default"}
                      editable={!submitting}
                    />
                  </View>
                ))}
                <View style={s.fieldWrap}>
                  <Text style={s.fieldLabel}>Assign Production Team</Text>
                  {productionTeams.length === 0 ? (
                    <Text style={s.noTeamText}>No production teams yet. Create one in the Teams tab.</Text>
                  ) : (
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
                      {productionTeams.map((team: Team) => (
                        <Pressable
                          key={team._id}
                          onPress={() => setForm((prev) => ({ ...prev, assignedTeamId: team._id }))}
                          disabled={submitting}
                          style={[s.teamChip, form.assignedTeamId === team._id && s.teamChipActive]}
                        >
                          <Text style={[s.teamChipText, form.assignedTeamId === team._id && { color: "#F97316" }]}>
                            {team.name}
                          </Text>
                          <Text style={s.teamChipCount}>{team.email}</Text>
                        </Pressable>
                      ))}
                    </ScrollView>
                  )}
                </View>
                <Pressable
                  onPress={handleCreate}
                  disabled={submitting}
                  style={[s.createBtn, submitting && s.createBtnDisabled]}
                >
                  {submitting ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <Text style={s.createBtnText}>Assign Job</Text>
                  )}
                </Pressable>
              </ScrollView>
            </View>
          </KeyboardAvoidingView>
        </View>
      </Modal>

      {/* Edit penalty modal */}
      <Modal visible={!!penaltyTarget} transparent animationType="slide" onRequestClose={closePenaltyEdit} statusBarTranslucent navigationBarTranslucent>
        <View style={s.overlay}>
          <KeyboardAvoidingView behavior="padding" style={s.keyboardAvoid}>
            <View style={s.modal}>
              <View style={s.modalHeader}>
                <Text style={s.modalTitle}>Edit Hold</Text>
                <Pressable onPress={closePenaltyEdit}>
                  <X color="#94A3B8" size={22} />
                </Pressable>
              </View>
              {penaltyTarget && (
                <ScrollView
                  keyboardShouldPersistTaps="handled"
                  showsVerticalScrollIndicator={false}
                  contentContainerStyle={{ paddingBottom: Math.max(insets.bottom, 24) }}
                >
                  <Text style={s.penaltyHint}>
                    {penaltyTarget.model} — hold charged per pending (undelivered) vehicle.
                  </Text>
                  <View style={s.fieldWrap}>
                    <Text style={s.fieldLabel}>Hold per Pending Vehicle (Rs)</Text>
                    <TextInput
                      style={s.fieldInput}
                      value={penaltyValue}
                      onChangeText={setPenaltyValue}
                      placeholder="e.g. 100"
                      placeholderTextColor="#CBD5E1"
                      keyboardType="numeric"
                      editable={!penaltySubmitting}
                    />
                  </View>
                  <Pressable
                    onPress={handleSavePenalty}
                    disabled={penaltySubmitting}
                    style={[s.createBtn, penaltySubmitting && s.createBtnDisabled]}
                  >
                    {penaltySubmitting ? (
                      <ActivityIndicator color="#fff" />
                    ) : (
                      <Text style={s.createBtnText}>Save Hold</Text>
                    )}
                  </Pressable>
                </ScrollView>
              )}
            </View>
          </KeyboardAvoidingView>
        </View>
      </Modal>

      {/* Full edit container modal */}
      <Modal visible={!!editTarget} transparent animationType="slide" onRequestClose={closeEdit} statusBarTranslucent navigationBarTranslucent>
        <View style={s.overlay}>
          <KeyboardAvoidingView behavior="padding" style={s.keyboardAvoid}>
            <View style={s.modal}>
              <ScrollView
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{ paddingBottom: Math.max(insets.bottom, 24) }}
              >
                <View style={s.modalHeader}>
                  <Text style={s.modalTitle}>Edit Container</Text>
                  <Pressable onPress={closeEdit}>
                    <X color="#94A3B8" size={22} />
                  </Pressable>
                </View>
                {editTarget && (
                  <>
                    {[
                      { label: "Scooter Model", key: "model", placeholder: "e.g. Ola S1 Pro" },
                      { label: "Target Quantity", key: "quantity", placeholder: "e.g. 100", keyboard: "numeric" as const },
                      { label: "Rate per Unit (Rs)", key: "ratePerUnit", placeholder: "e.g. 250", keyboard: "numeric" as const },
                      { label: "Date", key: "date", placeholder: "YYYY-MM-DD" },
                    ].map((field) => (
                      <View key={field.key} style={s.fieldWrap}>
                        <Text style={s.fieldLabel}>{field.label}</Text>
                        <TextInput
                          style={s.fieldInput}
                          value={editForm[field.key as keyof typeof editForm]}
                          onChangeText={(value) => setEditForm((prev) => ({ ...prev, [field.key]: value }))}
                          placeholder={field.placeholder}
                          placeholderTextColor="#CBD5E1"
                          keyboardType={field.keyboard ?? "default"}
                          editable={!editSubmitting}
                        />
                      </View>
                    ))}
                    <View style={s.fieldWrap}>
                      <Text style={s.fieldLabel}>Status</Text>
                      <View style={s.statusRow}>
                        {(["active", "completed", "cancelled"] as const).map((st) => (
                          <Pressable
                            key={st}
                            onPress={() => setEditForm((prev) => ({ ...prev, status: st }))}
                            disabled={editSubmitting}
                            style={[s.statusChip, editForm.status === st && s.statusChipActive]}
                          >
                            <Text style={[s.statusChipText, editForm.status === st && { color: "#F97316" }]}>
                              {st.toUpperCase()}
                            </Text>
                          </Pressable>
                        ))}
                      </View>
                    </View>
                    <Pressable
                      onPress={handleSaveEdit}
                      disabled={editSubmitting}
                      style={[s.createBtn, editSubmitting && s.createBtnDisabled]}
                    >
                      {editSubmitting ? (
                        <ActivityIndicator color="#fff" />
                      ) : (
                        <Text style={s.createBtnText}>Save Changes</Text>
                      )}
                    </Pressable>
                    <Pressable
                      onPress={() => handleDeleteContainer(editTarget)}
                      disabled={deletingId === editTarget._id}
                      style={s.deleteContainerBtn}
                    >
                      {deletingId === editTarget._id ? (
                        <ActivityIndicator color="#DC2626" />
                      ) : (
                        <>
                          <Trash2 color="#DC2626" size={16} />
                          <Text style={s.deleteContainerBtnText}>Delete Container</Text>
                        </>
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
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 20, paddingTop: 20, paddingBottom: 16 },
  title: { fontSize: 20, fontWeight: "800", color: "#0F172A" },
  addBtn: { flexDirection: "row", alignItems: "center", gap: 5, backgroundColor: "rgba(255,255,255,0.22)", borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8 },
  addBtnText: { color: "#fff", fontWeight: "700", fontSize: 13 },
  card: { marginHorizontal: 20, marginBottom: 12, backgroundColor: "#FFFFFF", borderRadius: 16, borderWidth: 1, borderColor: "#E2E8F0", padding: 16 },
  cardTop: { flexDirection: "row", alignItems: "center", marginBottom: 12, gap: 12 },
  cardIcon: { width: 40, height: 40, backgroundColor: "#FFF7ED", borderRadius: 12, alignItems: "center", justifyContent: "center" },
  cardInfo: { flex: 1 },
  cardModel: { fontSize: 15, fontWeight: "700", color: "#0F172A" },
  cardMeta: { fontSize: 12, color: "#64748B", marginTop: 2 },
  badge: { borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4 },
  badgeText: { fontSize: 10, fontWeight: "700" },
  progressBg: { height: 5, backgroundColor: "#F1F5F9", borderRadius: 10, marginBottom: 6, overflow: "hidden" },
  progressFill: { height: "100%", borderRadius: 10 },
  progressLabel: { fontSize: 11, color: "#94A3B8", marginBottom: 12 },
  statsRow: { flexDirection: "row", justifyContent: "space-between" },
  stat: { alignItems: "center" },
  statLbl: { fontSize: 10, color: "#94A3B8", marginBottom: 2 },
  statVal: { fontSize: 14, fontWeight: "700", color: "#0F172A" },
  penaltyBox: { marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: "#FEE2E2" },
  penaltyRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  penaltyEditBtn: { width: 32, height: 32, borderRadius: 8, backgroundColor: "#FEF2F2", alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: "#FECACA" },
  cardActionBtn: { width: 32, height: 32, borderRadius: 8, backgroundColor: "#F1F5F9", alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: "#E2E8F0", marginLeft: 6 },
  statusRow: { flexDirection: "row", gap: 8 },
  statusChip: { flex: 1, alignItems: "center", paddingVertical: 10, borderRadius: 10, backgroundColor: "#F8FAFC", borderWidth: 1, borderColor: "#E2E8F0" },
  statusChipActive: { backgroundColor: "#FFF7ED", borderColor: "#F97316" },
  statusChipText: { fontSize: 12, fontWeight: "700", color: "#64748B" },
  deleteContainerBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, marginTop: 12, paddingVertical: 14, borderRadius: 14, backgroundColor: "#FEF2F2", borderWidth: 1, borderColor: "#FECACA" },
  deleteContainerBtnText: { color: "#DC2626", fontWeight: "700", fontSize: 15 },
  penaltyHint: { fontSize: 13, color: "#64748B", marginBottom: 14 },
  overlay: { flex: 1, backgroundColor: "#00000080", justifyContent: "flex-end" },
  keyboardAvoid: { width: "100%" },
  modal: { backgroundColor: "#FFFFFF", borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 24, borderTopWidth: 1, borderColor: "#E2E8F0", maxHeight: "90%" },
  modalHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 20 },
  modalTitle: { fontSize: 20, fontWeight: "800", color: "#0F172A" },
  fieldWrap: { marginBottom: 14 },
  fieldLabel: { fontSize: 12, fontWeight: "600", color: "#475569", marginBottom: 6 },
  fieldInput: { backgroundColor: "#F8FAFC", borderWidth: 1.5, borderColor: "#E2E8F0", borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, color: "#0F172A", fontSize: 14 },
  noTeamText: { fontSize: 13, color: "#94A3B8", fontStyle: "italic" },
  teamChip: { padding: 12, borderRadius: 12, backgroundColor: "#F8FAFC", borderWidth: 1.5, borderColor: "#E2E8F0", minWidth: 120 },
  teamChipActive: { backgroundColor: "#FFF7ED", borderColor: "#FED7AA" },
  teamChipText: { fontSize: 13, fontWeight: "700", color: "#0F172A", marginBottom: 2 },
  teamChipCount: { fontSize: 11, color: "#94A3B8" },
  createBtn: { backgroundColor: "#F97316", borderRadius: 14, paddingVertical: 15, alignItems: "center", marginTop: 8 },
  createBtnDisabled: { opacity: 0.65 },
  createBtnText: { color: "#fff", fontWeight: "700", fontSize: 16 },
});
