import { colors, fonts, radius, shadow } from "@/lib/theme";
import { useAuthStore } from "@/stores/authStore";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import {
  Bell,
  ChevronRight,
  HardHat,
  History as HistoryIcon,
  LogOut,
} from "lucide-react-native";
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";

type Item = {
  key: string;
  label: string;
  description: string;
  icon: any;
  color: string;
  bg: string;
  border: string;
  route: string;
};

const ITEMS: Item[] = [
  {
    key: "history",
    label: "History",
    description: "Browse your production logs",
    icon: HistoryIcon,
    color: colors.info,
    bg: colors.infoSoft,
    border: colors.infoBorder,
    route: "/(team)/history",
  },
  {
    key: "notifications",
    label: "Notifications",
    description: "Alerts and updates",
    icon: Bell,
    color: colors.warning,
    bg: colors.warningSoft,
    border: colors.warningBorder,
    route: "/(team)/notifications",
  },
];

export default function TeamMore() {
  const insets = useSafeAreaInsets();
  const { logout, user } = useAuthStore();

  const handleLogout = () => {
    Alert.alert("Log out", "Are you sure?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Log out",
        style: "destructive",
        onPress: async () => {
          await logout();
          router.replace("/(auth)/login");
        },
      },
    ]);
  };

  return (
    <View style={s.root}>
      <LinearGradient
        colors={[colors.primary, colors.primaryDark]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={s.headerBg}
      />
      <SafeAreaView style={s.safe} edges={["top"]}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: insets.bottom + 100 }}
        >
          <View style={s.headerRow}>
            <Text style={s.title}>More</Text>
            <Text style={s.subtitle}>Settings and shortcuts</Text>
          </View>

          <View style={s.contentWrap}>
            <View style={s.accountCard}>
              <View style={s.avatarWrap}>
                <HardHat color={colors.primary} size={26} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.accountName} numberOfLines={1}>
                  {user?.name ?? "Team"}
                </Text>
                <Text style={s.accountEmail} numberOfLines={1}>
                  Production team
                </Text>
              </View>
              <View style={s.roleBadge}>
                <Text style={s.roleBadgeText}>TEAM</Text>
              </View>
            </View>

            <Text style={s.sectionTitle}>SHORTCUTS</Text>

            <View style={s.group}>
              {ITEMS.map((item, idx) => (
                <Pressable
                  key={item.key}
                  onPress={() => router.push(item.route as any)}
                  android_ripple={{ color: colors.bgSubtle }}
                  style={[s.row, idx !== ITEMS.length - 1 ? s.rowDivider : null]}
                >
                  <View style={[s.rowIcon, { backgroundColor: item.bg, borderColor: item.border }]}>
                    <item.icon color={item.color} size={20} strokeWidth={2.2} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={s.rowLabel}>{item.label}</Text>
                    <Text style={s.rowDesc} numberOfLines={1}>
                      {item.description}
                    </Text>
                  </View>
                  <ChevronRight color={colors.textFaint} size={20} />
                </Pressable>
              ))}
            </View>

            <Text style={s.sectionTitle}>ACCOUNT</Text>

            <Pressable
              onPress={handleLogout}
              android_ripple={{ color: colors.dangerSoft }}
              style={s.logoutBtn}
            >
              <View style={s.logoutIconWrap}>
                <LogOut color={colors.danger} size={18} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.logoutText}>Log out</Text>
                <Text style={s.logoutSub}>Sign out of this account</Text>
              </View>
              <ChevronRight color={colors.danger} size={18} />
            </Pressable>
          </View>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bgSubtle },
  headerBg: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 180,
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
  },
  safe: { flex: 1 },
  headerRow: { paddingHorizontal: 20, paddingTop: 12, paddingBottom: 24 },
  title: { fontFamily: fonts.extrabold, fontSize: 26, color: colors.white, letterSpacing: -0.3 },
  subtitle: { fontFamily: fonts.medium, fontSize: 13, color: "rgba(255,255,255,0.85)", marginTop: 4 },
  contentWrap: {
    backgroundColor: colors.bgSubtle,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingTop: 20,
    paddingHorizontal: 20,
    minHeight: 400,
  },
  accountCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    backgroundColor: colors.bg,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.borderSoft,
    padding: 14,
    marginBottom: 22,
    ...(shadow.sm as object),
  },
  avatarWrap: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: colors.primarySofter,
    borderWidth: 1,
    borderColor: colors.primaryBorder,
    alignItems: "center",
    justifyContent: "center",
  },
  accountName: { fontFamily: fonts.bold, fontSize: 16, color: colors.text, letterSpacing: -0.2 },
  accountEmail: { fontFamily: fonts.medium, fontSize: 12, color: colors.textMuted, marginTop: 4 },
  roleBadge: {
    backgroundColor: colors.primarySofter,
    borderWidth: 1,
    borderColor: colors.primaryBorder,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: radius.sm,
  },
  roleBadgeText: { fontFamily: fonts.bold, fontSize: 10, color: colors.primaryDark, letterSpacing: 0.8 },
  sectionTitle: {
    fontFamily: fonts.bold,
    fontSize: 11,
    color: colors.textFaint,
    letterSpacing: 1.6,
    marginBottom: 10,
    marginTop: 4,
  },
  group: {
    backgroundColor: colors.bg,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.borderSoft,
    overflow: "hidden",
    marginBottom: 22,
    ...(shadow.sm as object),
  },
  row: { flexDirection: "row", alignItems: "center", gap: 14, paddingHorizontal: 14, paddingVertical: 14 },
  rowDivider: { borderBottomWidth: 1, borderBottomColor: colors.borderSoft },
  rowIcon: {
    width: 42,
    height: 42,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  rowLabel: { fontFamily: fonts.bold, fontSize: 15, color: colors.text },
  rowDesc: { fontFamily: fonts.regular, fontSize: 12, color: colors.textMuted, marginTop: 2 },
  logoutBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: colors.bg,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.dangerBorder,
    paddingHorizontal: 14,
    paddingVertical: 14,
    ...(shadow.sm as object),
  },
  logoutIconWrap: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: colors.dangerSoft,
    borderWidth: 1,
    borderColor: colors.dangerBorder,
    alignItems: "center",
    justifyContent: "center",
  },
  logoutText: { fontFamily: fonts.bold, fontSize: 15, color: colors.danger, letterSpacing: 0.2 },
  logoutSub: { fontFamily: fonts.regular, fontSize: 12, color: colors.textMuted, marginTop: 2 },
});
