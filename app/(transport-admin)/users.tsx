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
import { Plus, X, User } from "lucide-react-native";

import { getAllUsers, createUser, updateUser } from "@/lib/api";
import { useAuthStore } from "@/stores/authStore";
import type { UserResponse } from "@/lib/api";
import { colors, fonts, radius, shadow, spacing } from "@/lib/theme";

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

  useEffect(() => {
    load();
  }, [load]);

  const handleCreate = async () => {
    if (!form.name.trim() || !form.email.trim() || !form.password.trim()) {
      Alert.alert("Required", "Name, email and password are required");
      return;
    }
    if (form.role === "driver" && !form.vehicleNumber.trim()) {
      Alert.alert("Required", "Vehicle number is required for driver accounts");
      return;
    }
    if (!token) return;
    setCreating(true);
    try {
      await createUser({ ...form }, token);
      setForm({
        name: "",
        email: "",
        password: "",
        role: "accounts",
        phone: "",
        vehicleNumber: "",
      });
      setShowCreate(false);
      load();
    } catch (e: any) {
      Alert.alert("Error", e.message);
    } finally {
      setCreating(false);
    }
  };

  const toggleActive = async (user: UserResponse) => {
    if (!token) return;
    try {
      await updateUser(user._id, { isActive: !user.isActive }, token);
      load();
    } catch (e: any) {
      Alert.alert("Error", e.message);
    }
  };

  const roleColors: Record<string, string> = {
    admin: colors.primary,
    accounts: colors.info,
    driver: colors.success,
  };

  const renderItem = ({ item }: { item: UserResponse }) => (
    <View style={s.card}>
      <View style={s.cardLeft}>
        <View
          style={[
            s.avatar,
            {
              backgroundColor: (roleColors[item.role] ?? colors.primary) + "22",
            },
          ]}
        >
          <User size={18} color={roleColors[item.role] ?? colors.primary} />
        </View>
        <View>
          <Text style={s.name}>{item.name}</Text>
          <Text style={s.email}>{item.email}</Text>
          <View
            style={[
              s.roleBadge,
              {
                backgroundColor:
                  (roleColors[item.role] ?? colors.primary) + "22",
              },
            ]}
          >
            <Text
              style={[
                s.roleText,
                { color: roleColors[item.role] ?? colors.primary },
              ]}
            >
              {item.role}
            </Text>
          </View>
        </View>
      </View>
      <Switch
        value={item.isActive}
        onValueChange={() => toggleActive(item)}
        trackColor={{ false: colors.border, true: colors.successBorder }}
        thumbColor={item.isActive ? colors.success : colors.textFaint}
      />
    </View>
  );

  return (
    <SafeAreaView style={s.root} edges={["top"]}>
      <View style={s.topBar}>
        <Text style={s.title}>System Users</Text>
        <TouchableOpacity
          style={s.fab}
          onPress={() => setShowCreate((v) => !v)}
          activeOpacity={0.85}
        >
          {showCreate ? (
            <X size={18} color={colors.white} />
          ) : (
            <Plus size={18} color={colors.white} />
          )}
        </TouchableOpacity>
      </View>

      {showCreate && (
        <View style={s.createCard}>
          <Text style={s.createTitle}>Create New User</Text>
          {[
            ["name", "Full Name"],
            ["email", "Email Address"],
            ["password", "Password"],
            ["phone", "Phone (optional)"],
          ].map(([field, label]) => (
            <TextInput
              key={field}
              style={s.input}
              placeholder={label}
              placeholderTextColor={colors.textFaint}
              value={(form as any)[field]}
              onChangeText={(v) => setForm((p) => ({ ...p, [field]: v }))}
              secureTextEntry={field === "password"}
              autoCapitalize={field === "email" ? "none" : "words"}
              keyboardType={field === "email" ? "email-address" : "default"}
            />
          ))}
          {form.role === "driver" && (
            <TextInput
              style={s.input}
              placeholder="Vehicle Number"
              placeholderTextColor={colors.textFaint}
              value={form.vehicleNumber}
              onChangeText={(v) => setForm((p) => ({ ...p, vehicleNumber: v }))}
              autoCapitalize="characters"
            />
          )}
          <View style={s.roleRow}>
            {["accounts", "admin", "driver"].map((r) => (
              <TouchableOpacity
                key={r}
                style={[s.roleBtn, form.role === r && s.roleBtnActive]}
                onPress={() => setForm((p) => ({ ...p, role: r }))}
              >
                <Text
                  style={[
                    s.roleBtnText,
                    form.role === r && s.roleBtnTextActive,
                  ]}
                >
                  {r}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          <TouchableOpacity
            style={s.createBtn}
            onPress={handleCreate}
            disabled={creating}
            activeOpacity={0.85}
          >
            {creating ? (
              <ActivityIndicator color={colors.white} size="small" />
            ) : (
              <Text style={s.createBtnText}>Create User</Text>
            )}
          </TouchableOpacity>
        </View>
      )}

      {loading ? (
        <ActivityIndicator
          style={{ marginTop: 60 }}
          size="large"
          color={colors.primary}
        />
      ) : (
        <FlatList
          data={users}
          keyExtractor={(u) => u._id}
          renderItem={renderItem}
          contentContainerStyle={s.list}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => {
                setRefreshing(true);
                load();
              }}
              tintColor={colors.primary}
            />
          }
          ListEmptyComponent={
            <View style={s.empty}>
              <Text style={s.emptyText}>No users found</Text>
            </View>
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
    justifyContent: "space-between",
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.lg,
  },
  title: { fontFamily: fonts.extrabold, fontSize: 22, color: colors.text },
  fab: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
    ...shadow.md,
  },
  createCard: {
    backgroundColor: colors.white,
    marginHorizontal: spacing.lg,
    marginBottom: spacing.sm,
    borderRadius: radius.lg,
    padding: spacing.lg,
    borderLeftWidth: 4,
    borderLeftColor: colors.primary,
    ...shadow.sm,
  },
  createTitle: {
    fontFamily: fonts.bold,
    fontSize: 15,
    color: colors.text,
    marginBottom: spacing.md,
  },
  input: {
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.md,
    fontFamily: fonts.regular,
    fontSize: 14,
    color: colors.text,
    marginBottom: spacing.sm,
  },
  roleRow: { flexDirection: "row", gap: 8, marginBottom: spacing.md },
  roleBtn: {
    flex: 1,
    padding: spacing.sm,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
  },
  roleBtnActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  roleBtnText: {
    fontFamily: fonts.medium,
    fontSize: 12,
    color: colors.textSecondary,
  },
  roleBtnTextActive: { color: colors.white, fontFamily: fonts.bold },
  createBtn: {
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    paddingVertical: 14,
    alignItems: "center",
    ...shadow.sm,
  },
  createBtnText: { fontFamily: fonts.bold, fontSize: 15, color: colors.white },
  list: { padding: spacing.lg },
  card: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: colors.white,
    borderRadius: radius.lg,
    padding: spacing.lg,
    marginBottom: spacing.sm,
    borderLeftWidth: 4,
    borderLeftColor: colors.primary,
    ...shadow.sm,
  },
  cardLeft: { flexDirection: "row", alignItems: "center", gap: 12, flex: 1 },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  name: { fontFamily: fonts.semibold, fontSize: 14, color: colors.text },
  email: {
    fontFamily: fonts.regular,
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 1,
  },
  roleBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    marginTop: 4,
    alignSelf: "flex-start",
  },
  roleText: { fontFamily: fonts.bold, fontSize: 10, letterSpacing: 0.5 },
  empty: { alignItems: "center", paddingTop: 80 },
  emptyText: {
    fontFamily: fonts.medium,
    fontSize: 14,
    color: colors.textFaint,
  },
});
