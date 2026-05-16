import { useAuthStore } from "@/stores/authStore";
import { isNearScrollBottom } from "@/lib/scrollPagination";
import { Container, ProductionLog, useProductionStore } from "@/stores/productionStore";
import { ClipboardList, Plus } from "lucide-react-native";
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
    <SafeAreaView style={s.safe}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        onScroll={({ nativeEvent }) => {
          if (isNearScrollBottom(nativeEvent)) handleLoadMore();
        }}
        scrollEventThrottle={400}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor="#F97316" />}
      >
        <View style={s.header}>
          <ClipboardList color="#F97316" size={24} />
          <Text style={s.title}>Log Production</Text>
        </View>

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
                  <Text style={s.logDate}>{log.date}</Text>
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
    </SafeAreaView>
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
