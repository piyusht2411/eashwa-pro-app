import { useAuthStore } from "@/stores/authStore";
import { isNearScrollBottom } from "@/lib/scrollPagination";
import { colors as theme } from "@/lib/theme";
import { formatDateOnly } from "@/lib/utils";
import { Container, ProductionLog, useProductionStore } from "@/stores/productionStore";
import { GradientHeader } from "@/components/ui/GradientHeader";
import { ClipboardList, Plus, Target } from "lucide-react-native";
import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, Alert, Pressable, RefreshControl, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const getAssignedTeamId = (container: Container) =>
  typeof container.assignedTeam === "string" ? container.assignedTeam : container.assignedTeam._id;

const getContainerId = (value: ProductionLog["container"]) =>
  typeof value === "string" ? value : value._id;

export default function LogProduction() {
  const { user, token } = useAuthStore();
  const { containers, containersPagination, productionLogs, fetchContainers, fetchLogsByContainer, submitProductionLog } =
    useProductionStore();
  const [selectedContainerId, setSelectedContainerId] = useState("");
  const [quantity, setQuantity] = useState("");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const myContainers = containers.filter(
    (container) => getAssignedTeamId(container) === user?._id && container.status === "active",
  );
  const selected = myContainers.find((container) => container._id === selectedContainerId);
  const logsForSelected = productionLogs.filter((log) => getContainerId(log.container) === selectedContainerId);

  const loadJobs = useCallback(async () => {
    if (!token) return;
    await fetchContainers(token);
  }, [fetchContainers, token]);

  useEffect(() => {
    loadJobs().catch((error: any) => {
      Alert.alert("Error", error.message || "Failed to load assigned jobs");
    });
  }, [loadJobs]);

  useEffect(() => {
    if (selectedContainerId || !myContainers[0]?._id) return;
    setSelectedContainerId(myContainers[0]._id);
  }, [myContainers, selectedContainerId]);

  useEffect(() => {
    if (!token || !selectedContainerId) return;
    fetchLogsByContainer(selectedContainerId, token).catch(() => undefined);
  }, [fetchLogsByContainer, selectedContainerId, token]);

  const handleRefresh = async () => {
    if (!token) return;
    setRefreshing(true);
    try {
      await loadJobs();
      if (selectedContainerId) {
        await fetchLogsByContainer(selectedContainerId, token);
      }
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

  const handleSubmit = async () => {
    if (submitting) return;
    if (!selectedContainerId || !quantity || Number(quantity) <= 0) {
      Alert.alert("Error", "Select a job and enter a valid quantity");
      return;
    }
    if (!token) {
      Alert.alert("Error", "Not authenticated");
      return;
    }

    const alreadyLogged = logsForSelected.some((log) => log.date === date);
    if (alreadyLogged) {
      Alert.alert("Already Logged", `Production for ${date} already submitted`);
      return;
    }

    try {
      setSubmitting(true);
      await submitProductionLog(selectedContainerId, date, Number(quantity), token);
      setQuantity("");
      Alert.alert("Submitted", `${quantity} units logged. PDI will verify soon.`);
    } catch (error: any) {
      Alert.alert("Error", error.message || "Failed to submit production log");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <View style={s.safe}>
      <GradientHeader
        title="Log Production"
        subtitle="Submit your daily output"
        leftIcon={<ClipboardList color="#fff" size={20} />}
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

        <Text style={s.sectionLabel}>SELECT JOB</Text>
        {myContainers.length === 0 ? (
          <View style={s.emptyCard}>
            <Text style={s.emptyText}>No active containers assigned</Text>
          </View>
        ) : (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.jobScroll}>
            {myContainers.map((container) => (
              <Pressable
                key={container._id}
                onPress={() => setSelectedContainerId(container._id)}
                style={[s.jobChip, selectedContainerId === container._id && s.jobChipActive]}
              >
                <Text style={[s.jobChipModel, selectedContainerId === container._id && { color: "#F97316" }]}>
                  {container.model}
                </Text>
                <Text style={s.jobChipRate}>Rs {container.ratePerUnit}/unit</Text>
              </Pressable>
            ))}
          </ScrollView>
        )}

        {selected && (() => {
          const targetTotal = selected.quantity;
          const verifiedSoFar = logsForSelected.reduce(
            (sum, log) => sum + (log.verifiedQuantity ?? 0),
            0,
          );
          const remaining = Math.max(0, targetTotal - verifiedSoFar);
          const pct = targetTotal > 0 ? Math.min((verifiedSoFar / targetTotal) * 100, 100) : 0;
          const remainColor = remaining > 0 ? theme.warning : theme.success;
          return (
            <View style={s.progressCard}>
              <View style={s.progressHeader}>
                <Target color={theme.primary} size={16} />
                <Text style={s.progressTitle}>Target Progress</Text>
              </View>
              <View style={s.progressStatsRow}>
                <View style={s.progressStat}>
                  <Text style={s.progressStatLabel}>Target</Text>
                  <Text style={s.progressStatValue}>{targetTotal} units</Text>
                </View>
                <View style={s.progressStat}>
                  <Text style={s.progressStatLabel}>Verified so far</Text>
                  <Text style={[s.progressStatValue, { color: theme.success }]}>
                    {verifiedSoFar} units
                  </Text>
                </View>
                <View style={s.progressStat}>
                  <Text style={s.progressStatLabel}>Remaining</Text>
                  <Text style={[s.progressStatValue, { color: remainColor }]}>
                    {remaining} units
                  </Text>
                </View>
              </View>
              <View style={s.progressTrack}>
                <View
                  style={[s.progressFill, { width: `${pct}%` as any, backgroundColor: theme.primary }]}
                />
              </View>
              <Text style={s.progressPct}>{pct.toFixed(0)}% complete</Text>
            </View>
          );
        })()}

        {selected && (
          <View style={s.formCard}>
            <Text style={s.formTitle}>{selected.model}</Text>
            <View style={s.fieldWrap}>
              <Text style={s.fieldLabel}>Date</Text>
              <TextInput
                style={s.fieldInput}
                value={date}
                onChangeText={setDate}
                placeholder="YYYY-MM-DD"
                placeholderTextColor="#CBD5E1"
                editable={!submitting}
              />
            </View>
            <View style={s.fieldWrap}>
              <Text style={s.fieldLabel}>Units Produced</Text>
              <TextInput
                style={s.fieldInput}
                value={quantity}
                onChangeText={setQuantity}
                placeholder="e.g. 25"
                placeholderTextColor="#CBD5E1"
                keyboardType="numeric"
                editable={!submitting}
              />
            </View>
            <View style={s.previewCard}>
              <Text style={s.previewLabel}>Estimated Value</Text>
              <Text style={s.previewValue}>Rs {((Number(quantity) || 0) * selected.ratePerUnit).toLocaleString()}</Text>
              <Text style={s.previewNote}>Final amount is based on PDI-verified quantity</Text>
            </View>
            <Pressable
              onPress={handleSubmit}
              disabled={submitting}
              style={[s.submitBtn, submitting && s.submitBtnDisabled]}
            >
              {submitting ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <>
                  <Plus color="#fff" size={18} />
                  <Text style={s.submitBtnText}>Submit Log</Text>
                </>
              )}
            </Pressable>
          </View>
        )}

        {logsForSelected.length > 0 && (
          <>
            <Text style={s.sectionLabel}>HISTORY</Text>
            {logsForSelected.map((log) => (
              <View key={log._id} style={s.logCard}>
                <View style={s.logTop}>
                  <Text style={s.logDate}>{formatDateOnly(log.date)}</Text>
                  <Text style={[s.logStatus, { color: log.status === "verified" ? "#059669" : "#D97706" }]}>
                    {log.status.toUpperCase()}
                  </Text>
                </View>
                <View style={s.logRow}>
                  <Text style={s.logStatLabel}>Reported</Text>
                  <Text style={s.logStatValue}>{log.reportedQuantity}</Text>
                  {log.verifiedQuantity !== null && (
                    <Text style={s.logNote}>Verified {log.verifiedQuantity}</Text>
                  )}
                </View>
              </View>
            ))}
          </>
        )}
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
  sectionLabel: { fontSize: 11, fontWeight: "700", color: "#94A3B8", letterSpacing: 1.5, paddingHorizontal: 20, marginBottom: 10 },
  jobScroll: { paddingHorizontal: 20, gap: 10, paddingBottom: 16 },
  jobChip: { padding: 14, borderRadius: 14, backgroundColor: "#FFFFFF", borderWidth: 1, borderColor: "#E2E8F0", minWidth: 130 },
  jobChipActive: { backgroundColor: "#FFF7ED", borderColor: "#FED7AA" },
  jobChipModel: { fontSize: 14, fontWeight: "700", color: "#0F172A", marginBottom: 4 },
  jobChipRate: { fontSize: 11, color: "#64748B" },
  emptyCard: { marginHorizontal: 20, padding: 24, backgroundColor: "#FFFFFF", borderRadius: 16, borderWidth: 1, borderColor: "#E2E8F0", alignItems: "center", marginBottom: 16 },
  emptyText: { color: "#94A3B8", fontSize: 14 },
  progressCard: { marginHorizontal: 20, marginBottom: 14, backgroundColor: "#FFFFFF", borderRadius: 16, borderWidth: 1, borderColor: "#E2E8F0", padding: 14 },
  progressHeader: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 12 },
  progressTitle: { fontSize: 13, fontWeight: "700", color: "#0F172A", letterSpacing: 0.3 },
  progressStatsRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 12 },
  progressStat: { alignItems: "center", flex: 1 },
  progressStatLabel: { fontSize: 10, color: "#94A3B8", letterSpacing: 0.4, marginBottom: 3 },
  progressStatValue: { fontSize: 14, fontWeight: "700", color: "#0F172A" },
  progressTrack: { height: 8, backgroundColor: "#F1F5F9", borderRadius: 10, overflow: "hidden" },
  progressFill: { height: "100%", borderRadius: 10 },
  progressPct: { fontSize: 11, color: "#64748B", marginTop: 6, textAlign: "right", fontWeight: "600" },
  formCard: { marginHorizontal: 20, marginBottom: 20, backgroundColor: "#FFFFFF", borderRadius: 18, borderWidth: 1, borderColor: "#E2E8F0", padding: 16 },
  formTitle: { fontSize: 16, fontWeight: "700", color: "#0F172A", marginBottom: 16 },
  fieldWrap: { marginBottom: 14 },
  fieldLabel: { fontSize: 12, fontWeight: "600", color: "#475569", marginBottom: 6 },
  fieldInput: { backgroundColor: "#F8FAFC", borderWidth: 1, borderColor: "#E2E8F0", borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, color: "#0F172A", fontSize: 14 },
  previewCard: { backgroundColor: "#F0FDF4", borderRadius: 12, borderWidth: 1, borderColor: "#DCFCE7", padding: 14, alignItems: "center", marginBottom: 16 },
  previewLabel: { fontSize: 11, color: "#64748B", marginBottom: 4 },
  previewValue: { fontSize: 28, fontWeight: "800", color: "#059669" },
  previewNote: { fontSize: 11, color: "#64748B", marginTop: 4, textAlign: "center" },
  submitBtn: { backgroundColor: "#F97316", borderRadius: 14, paddingVertical: 15, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8 },
  submitBtnDisabled: { opacity: 0.65 },
  submitBtnText: { color: "#fff", fontWeight: "700", fontSize: 16 },
  logCard: { marginHorizontal: 20, marginBottom: 10, backgroundColor: "#FFFFFF", borderRadius: 14, borderWidth: 1, borderColor: "#E2E8F0", padding: 14 },
  logTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 6 },
  logDate: { fontSize: 14, fontWeight: "600", color: "#0F172A" },
  logStatus: { fontSize: 12, fontWeight: "700" },
  logRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  logStatLabel: { fontSize: 11, color: "#94A3B8" },
  logStatValue: { fontSize: 13, fontWeight: "600", color: "#0F172A" },
  logNote: { fontSize: 11, color: "#059669", flex: 1 },
});
