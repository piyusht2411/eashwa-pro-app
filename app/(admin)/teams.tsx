import { useAuthStore } from "@/stores/authStore";
import { isNearScrollBottom } from "@/lib/scrollPagination";
import { Team, useProductionStore } from "@/stores/productionStore";
import { GradientHeader } from "@/components/ui/GradientHeader";
import { Edit3, Eye, EyeOff, Mail, Phone, Plus, Trash2, Users, X } from "lucide-react-native";
import { useEffect, useState } from "react";
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

const roleColors: Record<string, { bg: string; border: string; text: string }> = {
  team: { bg: "#F0FDF4", border: "#DCFCE7", text: "#059669" },
  pdi: { bg: "#FFFBEB", border: "#FDE68A", text: "#D97706" },
};

export default function AdminTeams() {
  const insets = useSafeAreaInsets();
  const { teams, teamsPagination, fetchTeams, createTeam, updateTeam, deleteTeam, loading, error } =
    useProductionStore();
  const { token } = useAuthStore();
  const [showModal, setShowModal] = useState(false);
  const [editingTeam, setEditingTeam] = useState<Team | null>(null);
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    phone: "",
    role: "team" as "team" | "pdi",
  });
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const productionTeams = teams.filter((team) => team.role === "team");
  const pdiTeams = teams.filter((team) => team.role === "pdi");

  const resetForm = () => {
    setForm({
      name: "",
      email: "",
      password: "",
      phone: "",
      role: "team",
    });
    setEditingTeam(null);
  };

  const openCreateModal = () => {
    resetForm();
    setShowModal(true);
  };

  const openEditModal = (team: Team) => {
    setEditingTeam(team);
    setForm({
      name: team.name,
      email: team.email,
      password: "",
      phone: team.phone ?? "",
      role: team.role,
    });
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    resetForm();
    setShowPassword(false);
  };

  useEffect(() => {
    if (!token) return;

    fetchTeams(token).catch((err: any) => {
      Alert.alert("Error", err.message || "Failed to load teams");
    });
  }, [fetchTeams, token]);

  const handleRefresh = async () => {
    if (!token) return;
    setRefreshing(true);
    try {
      await fetchTeams(token);
    } catch (err: any) {
      Alert.alert("Error", err.message || "Failed to refresh teams");
    } finally {
      setRefreshing(false);
    }
  };

  const handleLoadMore = async () => {
    if (!token || loadingMore || !teamsPagination.hasNextPage) return;
    setLoadingMore(true);
    try {
      await fetchTeams(token, teamsPagination.page + 1);
    } catch (err: any) {
      Alert.alert("Error", err.message || "Failed to load more teams");
    } finally {
      setLoadingMore(false);
    }
  };

  const handleSaveTeam = async () => {
    if (
      !form.name.trim() ||
      !form.email.trim() ||
      (!editingTeam && !form.password.trim()) ||
      !form.phone.trim()
    ) {
      Alert.alert("Error", "Fill all fields");
      return;
    }
    if (!form.email.includes("@")) {
      Alert.alert("Error", "Enter a valid email");
      return;
    }
    if (!token) {
      Alert.alert("Error", "Not authenticated");
      return;
    }

    try {
      if (editingTeam) {
        await updateTeam(
          editingTeam._id,
          {
            name: form.name.trim(),
            email: form.email.trim(),
            phone: form.phone.trim(),
            role: form.role,
            password: form.password.trim() || undefined,
          },
          token,
        );
      } else {
        await createTeam(
          form.name.trim(),
          form.email.trim(),
          form.password,
          form.role,
          form.phone.trim(),
          token,
        );
      }
      closeModal();
      Alert.alert(
        "Success",
        `${form.role === "team" ? "Production Team" : "PDI Team"} ${editingTeam ? "updated" : "created"}!`,
      );
    } catch (err: any) {
      Alert.alert("Error", err.message || `Failed to ${editingTeam ? "update" : "create"} team`);
    }
  };

  const handleDeleteTeam = (team: Team) => {
    if (!token) {
      Alert.alert("Error", "Not authenticated");
      return;
    }

    Alert.alert(
      "Delete Team",
      `Delete ${team.name}? This action cannot be undone.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              await deleteTeam(team._id, token);
              Alert.alert("Deleted", `${team.name} was removed.`);
            } catch (err: any) {
              Alert.alert("Error", err.message || "Failed to delete team");
            }
          },
        },
      ],
    );
  };

  return (
    <View style={s.safe}>
      <GradientHeader
        title="Teams"
        subtitle="Production and PDI users"
        showBack
        leftIcon={<Users color="#fff" size={20} />}
        right={
          <Pressable onPress={openCreateModal} style={s.addBtn}>
            <Plus color="#fff" size={16} />
            <Text style={s.addBtnText}>New</Text>
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
        {loading && teams.length === 0 ? (
          <View style={s.loadingCard}>
            <ActivityIndicator color="#F97316" />
            <Text style={s.loadingText}>Loading teams...</Text>
          </View>
        ) : teams.length === 0 ? (
          <View style={s.emptyCard}>
            <Text style={s.emptyTitle}>No teams yet</Text>
            <Text style={s.emptyText}>Create your first team to get started</Text>
          </View>
        ) : (
          <>
            {error && <Text style={s.errorText}>{error}</Text>}
            <TeamSection
              title="Production Teams"
              teams={productionTeams}
              emptyText="No production teams yet"
              onEdit={openEditModal}
              onDelete={handleDeleteTeam}
            />
            <TeamSection
              title="PDI Teams"
              teams={pdiTeams}
              emptyText="No PDI teams yet"
              onEdit={openEditModal}
              onDelete={handleDeleteTeam}
            />
          </>
        )}
        {loadingMore && <ActivityIndicator color="#F97316" style={{ marginVertical: 16 }} />}
        <View style={{ height: 20 }} />
      </ScrollView>

      <Modal
        visible={showModal}
        transparent
        animationType="slide"
        statusBarTranslucent
        onRequestClose={closeModal}
      >
        <View style={s.overlay}>
          <KeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "padding" : "height"}
            keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 24}
            style={s.keyboardAvoid}
          >
            <View style={s.modal}>
              <ScrollView
                keyboardShouldPersistTaps="handled"
                keyboardDismissMode="interactive"
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{ paddingBottom: insets.bottom + 120 }}
              >
                <View style={s.modalHeader}>
                  <Text style={s.modalTitle}>
                    {editingTeam ? "Edit Team" : "Create New Team"}
                  </Text>
                  <Pressable onPress={closeModal}>
                    <X color="#94A3B8" size={22} />
                  </Pressable>
                </View>

                <View style={s.fieldWrap}>
                  <Text style={s.fieldLabel}>Team Name</Text>
                  <TextInput
                    style={s.fieldInput}
                    value={form.name}
                    onChangeText={(value) => setForm((prev) => ({ ...prev, name: value }))}
                    placeholder="e.g. Alpha Production Team"
                    placeholderTextColor="#CBD5E1"
                    editable={!loading}
                  />
                </View>

                <View style={s.fieldWrap}>
                  <Text style={s.fieldLabel}>Email Address</Text>
                  <TextInput
                    style={s.fieldInput}
                    value={form.email}
                    onChangeText={(value) => setForm((prev) => ({ ...prev, email: value }))}
                    placeholder="team@example.com"
                    placeholderTextColor="#CBD5E1"
                    keyboardType="email-address"
                    autoCapitalize="none"
                    editable={!loading}
                  />
                </View>

                <View style={s.fieldWrap}>
                  <Text style={s.fieldLabel}>Password</Text>
                  <View style={s.passwordWrap}>
                    <TextInput
                      style={[s.fieldInput, s.passwordInput]}
                      value={form.password}
                      onChangeText={(value) => setForm((prev) => ({ ...prev, password: value }))}
                      placeholder={editingTeam ? "Leave blank to keep current password" : "Create a password"}
                      placeholderTextColor="#CBD5E1"
                      secureTextEntry={!showPassword}
                      editable={!loading}
                    />
                    <Pressable
                      onPress={() => setShowPassword((prev) => !prev)}
                      style={s.eyeBtn}
                      hitSlop={8}
                    >
                      {showPassword ? (
                        <EyeOff color="#64748B" size={20} />
                      ) : (
                        <Eye color="#64748B" size={20} />
                      )}
                    </Pressable>
                  </View>
                </View>

                <View style={s.fieldWrap}>
                  <Text style={s.fieldLabel}>Phone Number</Text>
                  <TextInput
                    style={s.fieldInput}
                    value={form.phone}
                    onChangeText={(value) => setForm((prev) => ({ ...prev, phone: value }))}
                    placeholder="9876543210"
                    placeholderTextColor="#CBD5E1"
                    keyboardType="phone-pad"
                    editable={!loading}
                  />
                </View>

                <View style={s.fieldWrap}>
                  <Text style={s.fieldLabel}>Team Role</Text>
                  <View style={s.roleSelector}>
                    {["team", "pdi"].map((role) => (
                      <Pressable
                        key={role}
                        onPress={() =>
                          setForm((prev) => ({ ...prev, role: role as "team" | "pdi" }))
                        }
                        disabled={loading}
                        style={[
                          s.roleOption,
                          form.role === role && s.roleOptionActive,
                          form.role === role && {
                            backgroundColor: roleColors[role].bg,
                          },
                        ]}
                      >
                        <Text
                          style={[
                            s.roleOptionText,
                            form.role === role && { color: roleColors[role].text },
                          ]}
                        >
                          {role === "team" ? "Production" : "PDI"}
                        </Text>
                      </Pressable>
                    ))}
                  </View>
                </View>

                <Pressable
                  onPress={handleSaveTeam}
                  disabled={loading}
                  style={[s.createBtn, loading && s.createBtnDisabled]}
                >
                  {loading ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <Text style={s.createBtnText}>
                      {editingTeam ? "Update Team" : "Create Team"}
                    </Text>
                  )}
                </Pressable>
              </ScrollView>
            </View>
          </KeyboardAvoidingView>
        </View>
      </Modal>
    </View>
  );
}

function TeamSection({
  title,
  teams,
  emptyText,
  onEdit,
  onDelete,
}: {
  title: string;
  teams: Team[];
  emptyText: string;
  onEdit: (team: Team) => void;
  onDelete: (team: Team) => void;
}) {
  return (
    <View style={s.section}>
      <Text style={s.sectionTitle}>
        {title} ({teams.length})
      </Text>
      {teams.length === 0 ? (
        <View style={s.sectionEmpty}>
          <Text style={s.sectionEmptyText}>{emptyText}</Text>
        </View>
      ) : (
        teams.map((team) => (
          <View key={team._id} style={s.teamCard}>
            <View
              style={[
                s.teamHeader,
                {
                  backgroundColor: roleColors[team.role].bg,
                  borderColor: roleColors[team.role].border,
                },
              ]}
            >
              <View style={s.teamInfo}>
                <Text style={[s.teamType, { color: roleColors[team.role].text }]}>
                  {team.role === "team" ? "PRODUCTION" : "PDI"}
                </Text>
                <Text style={s.teamName}>{team.name}</Text>
                <Text style={s.teamMeta}>
                  Created {new Date(team.createdAt).toLocaleDateString()}
                </Text>
              </View>
              <View style={s.teamActions}>
                <Pressable onPress={() => onEdit(team)} style={s.iconBtn}>
                  <Edit3 color="#F97316" size={16} />
                </Pressable>
                <Pressable onPress={() => onDelete(team)} style={s.iconBtnDanger}>
                  <Trash2 color="#DC2626" size={16} />
                </Pressable>
              </View>
            </View>

            <View style={s.teamDetails}>
              <View style={s.detailRow}>
                <Mail color="#F97316" size={16} />
                <Text style={s.detailText}>{team.email}</Text>
              </View>
              <View style={s.detailRow}>
                <Phone color="#F97316" size={16} />
                <Text style={s.detailText}>{team.phone || "No phone"}</Text>
              </View>
            </View>
          </View>
        ))
      )}
    </View>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#F8FAFC" },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 16,
  },
  title: { fontSize: 20, fontWeight: "800", color: "#0F172A" },
  addBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "rgba(255,255,255,0.22)",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  addBtnText: { color: "#fff", fontWeight: "700", fontSize: 13 },
  loadingCard: {
    marginHorizontal: 20,
    marginTop: 40,
    padding: 28,
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    alignItems: "center",
    gap: 10,
  },
  loadingText: { fontSize: 13, color: "#64748B" },
  errorText: {
    marginHorizontal: 20,
    marginBottom: 12,
    color: "#DC2626",
    fontSize: 12,
    fontWeight: "600",
  },
  emptyCard: {
    marginHorizontal: 20,
    marginTop: 40,
    padding: 40,
    backgroundColor: "#F1F5F9",
    borderRadius: 16,
    alignItems: "center",
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#0F172A",
    marginBottom: 4,
  },
  emptyText: { fontSize: 13, color: "#94A3B8", textAlign: "center" },
  section: { marginBottom: 18 },
  sectionTitle: {
    fontSize: 11,
    fontWeight: "700",
    color: "#94A3B8",
    letterSpacing: 1.5,
    paddingHorizontal: 20,
    marginBottom: 10,
  },
  sectionEmpty: {
    marginHorizontal: 20,
    padding: 16,
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  sectionEmptyText: { fontSize: 13, color: "#94A3B8" },
  teamCard: {
    marginHorizontal: 20,
    marginBottom: 14,
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    overflow: "hidden",
  },
  teamHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    padding: 16,
    borderWidth: 1,
    borderBottomWidth: 0,
  },
  teamInfo: { flex: 1 },
  teamActions: { flexDirection: "row", gap: 8 },
  iconBtn: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: "#FFF7ED",
    borderWidth: 1,
    borderColor: "#FED7AA",
    alignItems: "center",
    justifyContent: "center",
  },
  iconBtnDanger: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: "#FEF2F2",
    borderWidth: 1,
    borderColor: "#FECACA",
    alignItems: "center",
    justifyContent: "center",
  },
  teamType: {
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 1,
    marginBottom: 4,
  },
  teamName: {
    fontSize: 16,
    fontWeight: "700",
    color: "#0F172A",
    marginBottom: 2,
  },
  teamMeta: { fontSize: 11, color: "#94A3B8" },
  teamDetails: { padding: 14, borderTopWidth: 1, borderColor: "#F1F5F9" },
  detailRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 10,
  },
  detailText: { fontSize: 13, color: "#0F172A", flex: 1 },
  overlay: {
    flex: 1,
    backgroundColor: "#00000040",
  },
  keyboardAvoid: {
    flex: 1,
    width: "100%",
    justifyContent: "flex-end",
  },
  modal: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: 24,
    borderTopWidth: 1,
    borderColor: "#E2E8F0",
    maxHeight: "85%",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  modalTitle: { fontSize: 20, fontWeight: "800", color: "#0F172A" },
  fieldWrap: { marginBottom: 14 },
  fieldLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: "#475569",
    marginBottom: 6,
  },
  fieldInput: {
    backgroundColor: "#F8FAFC",
    borderWidth: 1.5,
    borderColor: "#E2E8F0",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: "#0F172A",
    fontSize: 14,
  },
  passwordWrap: { position: "relative", justifyContent: "center" },
  passwordInput: { paddingRight: 46 },
  eyeBtn: {
    position: "absolute",
    right: 12,
    top: 0,
    bottom: 0,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 4,
  },
  roleSelector: { flexDirection: "row", gap: 8 },
  roleOption: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: "#E2E8F0",
    alignItems: "center",
  },
  roleOptionActive: { borderColor: "#F97316" },
  roleOptionText: { fontSize: 13, fontWeight: "600", color: "#0F172A" },
  createBtn: {
    backgroundColor: "#F97316",
    borderRadius: 14,
    paddingVertical: 15,
    alignItems: "center",
    marginTop: 8,
  },
  createBtnDisabled: { opacity: 0.6 },
  createBtnText: { color: "#fff", fontWeight: "700", fontSize: 16 },
});
