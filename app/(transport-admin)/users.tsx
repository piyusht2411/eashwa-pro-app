import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  RefreshControl,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { KeyboardAwareScrollView } from "react-native-keyboard-controller";
import { router } from "expo-router";
import { ArrowLeft, Plus, Truck, UserPlus, Users, X } from "lucide-react-native";

import { getAllUsers, createUser, updateUser } from "@/lib/api";
import { useAuthStore } from "@/stores/authStore";
import type { UserResponse } from "@/lib/api";
import { accents, AccentName, colors, fonts, radius, shadow, spacing } from "@/lib/theme";
import { formatCount } from "@/lib/format";
import EmptyState from "@/components/ui/EmptyState";

const ROLES = ["accounts", "admin", "driver"] as const;

const ROLE_ACCENT: Record<string, AccentName> = {
  admin: "brand",
  accounts: "info",
  driver: "success",
};

const ROLE_LABEL: Record<string, string> = {
  admin: "Admin",
  accounts: "Accounts",
  driver: "Driver",
};

/** Initials from a name: "Ravi Kumar" → "RK". */
function initials(name?: string): string {
  const parts = (name ?? "").trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "—";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export default function AdminUsersScreen() {
  const { token } = useAuthStore();
  const [users, setUsers] = useState<UserResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    role: "accounts",
    phone: "",
    vehicleNumber: "",
  });

  const load = useCallback(async () => {
    if (!token) return;
    try {
      const res = await getAllUsers(token, { limit: 50 });
      setUsers(res.users);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [token]);

  useEffect(() => { load(); }, [load]);

  const handleCreate = async () => {
    if (!form.name.trim() || !form.email.trim() || !form.password.trim()) {
      Alert.alert("Required", "Name, email and password are required");
      return;
    }
    // Vehicle number is optional for driver accounts — it can be assigned later.
    if (!token) return;
    setCreating(true);
    try {
      await createUser({ ...form }, token);
      setForm({ name: "", email: "", password: "", role: "accounts", phone: "", vehicleNumber: "" });
      setShowCreate(false);
      load();
    } catch (e: any) {
      Alert.alert("Error", e.message);
    } finally {
      setCreating(false);
    }
  };

  const toggleActive = (user: UserResponse) => {
    if (!token) return;
    const turningOff = user.isActive;
    const apply = async () => {
      try {
        await updateUser(user._id, { isActive: !user.isActive }, token);
        load();
      } catch (e: any) { Alert.alert("Error", e.message); }
    };

    // Deactivating locks someone out of the app — worth a confirmation.
    if (turningOff) {
      Alert.alert("Deactivate account", `${user.name} will no longer be able to sign in.`, [
        { text: "Cancel", style: "cancel" },
        { text: "Deactivate", style: "destructive", onPress: apply },
      ]);
    } else {
      apply();
    }
  };

  const renderItem = ({ item }: { item: UserResponse }) => {
    const a = accents[ROLE_ACCENT[item.role] ?? "neutral"];
    const inactive = !item.isActive;

    return (
      <View style={[s.card, inactive && s.cardInactive]}>
        <View style={[s.avatar, { backgroundColor: a.bg, borderColor: a.ring }]}>
          <Text style={[s.avatarText, { color: a.fg }]}>{initials(item.name)}</Text>
        </View>

        <View style={s.cardMid}>
          <Text style={s.name} numberOfLines={1}>{item.name}</Text>
          <Text style={s.email} numberOfLines={1}>{item.email}</Text>
          <View style={[s.roleBadge, { backgroundColor: a.bg, borderColor: a.ring }]}>
            <View style={[s.roleDot, { backgroundColor: a.fg }]} />
            <Text style={[s.roleText, { color: a.fg }]}>{ROLE_LABEL[item.role] ?? item.role}</Text>
          </View>
        </View>

        <View style={s.cardRight}>
          <Switch
            value={item.isActive}
            onValueChange={() => toggleActive(item)}
            trackColor={{ false: colors.border, true: colors.successBorder }}
            thumbColor={item.isActive ? colors.success : colors.textFaint}
          />
          <Text style={[s.switchLabel, item.isActive && { color: colors.success }]}>
            {item.isActive ? "Active" : "Inactive"}
          </Text>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={s.root} edges={["top"]}>
      <View style={s.topBar}>
        <TouchableOpacity style={s.back} onPress={() => router.back()} hitSlop={8}>
          <ArrowLeft size={19} color={colors.text} strokeWidth={2.4} />
        </TouchableOpacity>
        <Text style={s.title}>Users</Text>
        {!loading && users.length > 0 ? (
          <View style={s.countChip}><Text style={s.countText}>{formatCount(users.length)}</Text></View>
        ) : null}
        <View style={{ flex: 1 }} />
        <TouchableOpacity
          style={[s.addBtn, showCreate && s.addBtnActive]}
          onPress={() => setShowCreate((v) => !v)}
          activeOpacity={0.88}
        >
          {showCreate ? (
            <>
              <X size={15} color={colors.textSecondary} strokeWidth={2.8} />
              <Text style={s.addBtnTextActive}>Cancel</Text>
            </>
          ) : (
            <>
              <Plus size={15} color={colors.white} strokeWidth={2.8} />
              <Text style={s.addBtnText}>Add</Text>
            </>
          )}
        </TouchableOpacity>
      </View>

      {showCreate ? (
        <KeyboardAwareScrollView
          contentContainerStyle={s.formScroll}
          bottomOffset={24}
          keyboardShouldPersistTaps="handled"
        >
          <View style={s.createCard}>
            <View style={s.createHead}>
              <View style={s.createIcon}>
                <UserPlus size={16} color={colors.primaryDark} strokeWidth={2.3} />
              </View>
              <Text style={s.createTitle}>Create New User</Text>
            </View>

            <Text style={s.fieldLabel}>Role</Text>
            <View style={s.segment}>
              {ROLES.map((r) => {
                const active = form.role === r;
                return (
                  <TouchableOpacity
                    key={r}
                    style={[s.segmentBtn, active && s.segmentBtnActive]}
                    onPress={() => setForm((p) => ({ ...p, role: r }))}
                    activeOpacity={0.85}
                  >
                    <Text style={[s.segmentText, active && s.segmentTextActive]}>{ROLE_LABEL[r]}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <Text style={s.fieldLabel}>Full Name</Text>
            <TextInput
              style={s.input}
              placeholder="e.g. Ravi Kumar"
              placeholderTextColor={colors.textFaint}
              value={form.name}
              onChangeText={(v) => setForm((p) => ({ ...p, name: v }))}
              autoCapitalize="words"
            />

            <Text style={s.fieldLabel}>Email Address</Text>
            <TextInput
              style={s.input}
              placeholder="name@company.com"
              placeholderTextColor={colors.textFaint}
              value={form.email}
              onChangeText={(v) => setForm((p) => ({ ...p, email: v }))}
              autoCapitalize="none"
              keyboardType="email-address"
            />

            <Text style={s.fieldLabel}>Password</Text>
            <TextInput
              style={s.input}
              placeholder="Set an initial password"
              placeholderTextColor={colors.textFaint}
              value={form.password}
              onChangeText={(v) => setForm((p) => ({ ...p, password: v }))}
              secureTextEntry
              autoCapitalize="none"
            />

            <View style={s.labelRow}>
              <Text style={s.fieldLabel}>Phone</Text>
              <Text style={s.optional}>Optional</Text>
            </View>
            <TextInput
              style={s.input}
              placeholder="Contact number"
              placeholderTextColor={colors.textFaint}
              value={form.phone}
              onChangeText={(v) => setForm((p) => ({ ...p, phone: v }))}
              keyboardType="phone-pad"
            />

            {form.role === "driver" && (
              <>
                <View style={s.labelRow}>
                  <Text style={s.fieldLabel}>Vehicle Number</Text>
                  <Text style={s.optional}>Optional</Text>
                </View>
                <View style={s.inputWithIcon}>
                  <Truck size={15} color={colors.textMuted} strokeWidth={2.2} />
                  <TextInput
                    style={s.inputInner}
                    placeholder="Can be assigned later"
                    placeholderTextColor={colors.textFaint}
                    value={form.vehicleNumber}
                    onChangeText={(v) => setForm((p) => ({ ...p, vehicleNumber: v }))}
                    autoCapitalize="characters"
                  />
                </View>
              </>
            )}

            <TouchableOpacity
              style={[s.createBtn, creating && s.createBtnDisabled]}
              onPress={handleCreate}
              disabled={creating}
              activeOpacity={0.88}
            >
              {creating
                ? <ActivityIndicator color={colors.white} size="small" />
                : <Text style={s.createBtnText}>Create User</Text>}
            </TouchableOpacity>
          </View>
        </KeyboardAwareScrollView>
      ) : loading ? (
        <ActivityIndicator style={{ marginTop: 60 }} size="large" color={colors.primary} />
      ) : (
        <FlatList
          data={users}
          keyExtractor={(u) => u._id}
          renderItem={renderItem}
          contentContainerStyle={s.list}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={colors.primary} />
          }
          ListEmptyComponent={
            <EmptyState
              icon={<Users size={24} color={colors.primary} strokeWidth={2} />}
              title="No users yet"
              subtitle="Create accounts for your admin, accounts and driver staff."
              actionLabel="Add a user"
              onAction={() => setShowCreate(true)}
            />
          }
        />
      )}
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bgSubtle },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.md,
  },
  back: {
    width: 34,
    height: 34,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  title: { fontFamily: fonts.extrabold, fontSize: 24, letterSpacing: -0.5, color: colors.text },
  countChip: {
    backgroundColor: colors.primarySofter,
    borderWidth: 1,
    borderColor: colors.primaryBorder,
    borderRadius: radius.full,
    paddingHorizontal: 9,
    paddingVertical: 2,
  },
  countText: { fontFamily: fonts.bold, fontSize: 11.5, color: colors.primaryDark },
  addBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: colors.primary,
    borderRadius: radius.full,
    paddingHorizontal: 14,
    paddingVertical: 8,
    ...shadow.brand,
  },
  addBtnActive: { backgroundColor: colors.surfaceAlt, borderWidth: 1, borderColor: colors.border },
  addBtnText: { fontFamily: fonts.bold, fontSize: 13, color: colors.white },
  addBtnTextActive: { fontFamily: fonts.bold, fontSize: 13, color: colors.textSecondary },

  formScroll: { padding: spacing.lg, paddingTop: spacing.xs, paddingBottom: spacing["4xl"] },
  createCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.borderSoft,
    ...shadow.md,
  },
  createHead: { flexDirection: "row", alignItems: "center", gap: spacing.sm, marginBottom: spacing.sm },
  createIcon: {
    width: 32,
    height: 32,
    borderRadius: radius.sm,
    backgroundColor: colors.primarySofter,
    borderWidth: 1,
    borderColor: colors.primaryBorder,
    alignItems: "center",
    justifyContent: "center",
  },
  createTitle: { fontFamily: fonts.bold, fontSize: 15, color: colors.text },

  labelRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  fieldLabel: {
    fontFamily: fonts.semibold,
    fontSize: 11.5,
    color: colors.textSecondary,
    marginTop: spacing.md,
    marginBottom: 6,
  },
  optional: {
    fontFamily: fonts.medium,
    fontSize: 10.5,
    color: colors.textFaint,
    backgroundColor: colors.surfaceAlt,
    borderRadius: radius.full,
    paddingHorizontal: 7,
    paddingVertical: 1,
    marginTop: spacing.md,
    marginBottom: 6,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: 12,
    fontFamily: fonts.medium,
    fontSize: 14,
    color: colors.text,
    backgroundColor: colors.bgMuted,
  },
  inputWithIcon: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.bgMuted,
  },
  inputInner: {
    flex: 1,
    paddingVertical: 12,
    fontFamily: fonts.medium,
    fontSize: 14,
    letterSpacing: 0.4,
    color: colors.text,
  },

  segment: {
    flexDirection: "row",
    gap: 4,
    padding: 3,
    backgroundColor: colors.surfaceAlt,
    borderRadius: radius.md,
  },
  segmentBtn: { flex: 1, alignItems: "center", paddingVertical: 9, borderRadius: radius.sm },
  segmentBtnActive: { backgroundColor: colors.primary },
  segmentText: { fontFamily: fonts.semibold, fontSize: 12.5, color: colors.textMuted },
  segmentTextActive: { color: colors.white, fontFamily: fonts.bold },

  createBtn: {
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    paddingVertical: 14,
    alignItems: "center",
    marginTop: spacing.xl,
    ...shadow.brand,
  },
  createBtnDisabled: { opacity: 0.7 },
  createBtnText: { fontFamily: fonts.bold, fontSize: 15, color: colors.white },

  list: { padding: spacing.lg, paddingTop: spacing.xs, paddingBottom: spacing["4xl"] },
  card: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.borderSoft,
    ...shadow.sm,
  },
  cardInactive: { opacity: 0.7 },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: { fontFamily: fonts.extrabold, fontSize: 15, letterSpacing: 0.3 },
  cardMid: { flex: 1, gap: 3 },
  name: { fontFamily: fonts.bold, fontSize: 14.5, letterSpacing: -0.1, color: colors.text },
  email: { fontFamily: fonts.regular, fontSize: 12, color: colors.textMuted },
  roleBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    alignSelf: "flex-start",
    borderWidth: 1,
    borderRadius: radius.full,
    paddingHorizontal: 8,
    paddingVertical: 2,
    marginTop: 2,
  },
  roleDot: { width: 5, height: 5, borderRadius: 3 },
  roleText: { fontFamily: fonts.semibold, fontSize: 10.5 },
  cardRight: { alignItems: "center", gap: 2 },
  switchLabel: { fontFamily: fonts.semibold, fontSize: 10, color: colors.textFaint },
});
