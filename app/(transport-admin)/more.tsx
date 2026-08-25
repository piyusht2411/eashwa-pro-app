import React from "react";
import {
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { Users, Truck, LogOut, ChevronRight, Lock } from "lucide-react-native";
import { LinearGradient } from "expo-linear-gradient";

import { useAuthStore } from "@/stores/authStore";
import { colors, fonts, radius, shadow, spacing } from "@/lib/theme";

export default function AdminMoreScreen() {
  const { user, logout } = useAuthStore();

  const handleLogout = () => {
    Alert.alert("Logout", "Are you sure?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Logout",
        style: "destructive",
        onPress: async () => {
          await logout();
          router.replace("/(auth)/login");
        },
      },
    ]);
  };

  return (
    <SafeAreaView style={s.root} edges={["top"]}>
      <LinearGradient colors={[colors.white, colors.bgMuted]} style={s.header}>
        <LinearGradient
          colors={[colors.primaryLight, colors.primary, colors.primaryDark]}
          style={s.avatar}
        >
          <Text style={s.avatarText}>{user?.name?.[0] ?? "A"}</Text>
        </LinearGradient>
        <Text style={s.name}>{user?.name}</Text>
        <Text style={s.role}>Administrator</Text>
        <Text style={s.email}>{user?.email}</Text>
      </LinearGradient>

      <ScrollView
        contentContainerStyle={s.body}
        showsVerticalScrollIndicator={false}
      >
        <Text style={s.sectionLabel}>Manage</Text>
        <MenuItem
          icon={<Users size={20} color={colors.primary} />}
          label="Manage Users"
          onPress={() => router.push("/(transport-admin)/users")}
        />

        <Text style={s.sectionLabel}>Account</Text>
        <MenuItem
          icon={<Lock size={20} color={colors.textMuted} />}
          label="Change Password"
          onPress={() =>
            Alert.alert("Info", "Change password functionality coming soon.")
          }
        />

        <TouchableOpacity
          style={s.logoutBtn}
          onPress={handleLogout}
          activeOpacity={0.85}
        >
          <LogOut size={18} color={colors.danger} />
          <Text style={s.logoutText}>Logout</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

function MenuItem({
  icon,
  label,
  onPress,
}: {
  icon: React.ReactNode;
  label: string;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity style={s.menuItem} onPress={onPress} activeOpacity={0.8}>
      <View style={s.menuIcon}>{icon}</View>
      <Text style={s.menuLabel}>{label}</Text>
      <ChevronRight size={18} color={colors.textFaint} />
    </TouchableOpacity>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bgSubtle },
  header: {
    alignItems: "center",
    paddingVertical: spacing["3xl"],
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  avatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.md,
    ...shadow.md,
  },
  avatarText: {
    fontFamily: fonts.extrabold,
    fontSize: 28,
    color: colors.white,
  },
  name: { fontFamily: fonts.bold, fontSize: 18, color: colors.text },
  role: {
    fontFamily: fonts.medium,
    fontSize: 13,
    color: colors.primary,
    marginTop: 3,
  },
  email: {
    fontFamily: fonts.regular,
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 2,
  },
  body: { padding: spacing.lg },
  sectionLabel: {
    fontFamily: fonts.bold,
    fontSize: 11,
    color: colors.textFaint,
    letterSpacing: 1.2,
    textTransform: "uppercase",
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.white,
    borderRadius: radius.md,
    padding: spacing.lg,
    marginBottom: spacing.sm,
    borderLeftWidth: 3,
    borderLeftColor: colors.primary,
    ...shadow.sm,
  },
  menuIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.primarySoft,
    alignItems: "center",
    justifyContent: "center",
    marginRight: spacing.md,
  },
  menuLabel: {
    flex: 1,
    fontFamily: fonts.medium,
    fontSize: 15,
    color: colors.text,
  },
  logoutBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginTop: spacing["3xl"],
    padding: spacing.lg,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.dangerBorder,
    backgroundColor: colors.dangerSoft,
  },
  logoutText: { fontFamily: fonts.bold, fontSize: 15, color: colors.danger },
});
