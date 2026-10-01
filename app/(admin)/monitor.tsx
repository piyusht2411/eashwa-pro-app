import { Card } from "@/components/ui/Card";
import { GradientHeader } from "@/components/ui/GradientHeader";
import { AdminActivityType, AdminMonitorResponse, getAdminMonitor } from "@/lib/api";
import { colors, fonts, radius, shadow } from "@/lib/theme";
import { useAuthStore } from "@/stores/authStore";
import {
  Activity,
  CheckCircle2,
  ClipboardList,
  Clock,
  IndianRupee,
  Package,
  Users,
} from "lucide-react-native";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

const ACTIVITY_COLOR: Record<AdminActivityType, string> = {
  production_log: "#2563EB",
  pdi_verification: "#D97706",
  payment: "#16A34A",
};

const ACTIVITY_BG: Record<AdminActivityType, string> = {
  production_log: "#EFF6FF",
  pdi_verification: "#FFFBEB",
  payment: "#F0FDF4",
};

const ACTIVITY_LABEL: Record<AdminActivityType, string> = {
  production_log: "Log",
  pdi_verification: "PDI",
  payment: "Pay",
};

function formatRelative(iso: string) {
  const now = Date.now();
  const then = new Date(iso).getTime();
  if (!Number.isFinite(then)) return "";
  const diff = Math.max(0, now - then);
  const sec = Math.floor(diff / 1000);
  if (sec < 60) return `${sec}s ago`;
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min} min ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr} hr ago`;
  const days = Math.floor(hr / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(iso).toLocaleDateString("en-IN", { day: "2-digit", month: "short" });
}

export default function AdminMonitor() {
  const { token } = useAuthStore();
  const [data, setData] = useState<AdminMonitorResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const mountedRef = useRef(true);

  const load = useCallback(async (silent = false) => {
    if (!token) return;
    try {
      const res = await getAdminMonitor(token);
      if (mountedRef.current) setData(res);
    } catch (e: any) {
      // Background polls fail quietly — on a flaky connection an alert every
      // 30 s stacks up and makes the whole app feel stuck.
      if (mountedRef.current && !silent) {
        Alert.alert("Error", e.message || "Failed to load monitor");
      }
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    mountedRef.current = true;
    load();
    const id = setInterval(() => {
      load(true);
    }, 30_000);
    return () => {
      mountedRef.current = false;
      clearInterval(id);
    };
  }, [load]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  const stats = data
    ? [
        { label: "Active", value: data.activeContainers, icon: Package, color: colors.primary, bg: colors.primarySofter },
        { label: "Teams", value: data.totalTeams, icon: Users, color: colors.info, bg: colors.infoSoft },
        { label: "PDI Users", value: data.totalPdiUsers, icon: Users, color: colors.warning, bg: colors.warningSoft },
        { label: "Today Logs", value: data.todayLogs, icon: ClipboardList, color: colors.info, bg: colors.infoSoft },
        { label: "Today Verified", value: data.todayVerified, icon: CheckCircle2, color: colors.success, bg: colors.successSoft },
        { label: "Today Pending", value: data.todayPending, icon: Clock, color: colors.danger, bg: colors.dangerSoft },
      ]
    : [];

  return (
    <View style={s.safe}>
      <GradientHeader
        title="Monitor"
        subtitle="Live overview · refreshes every 30s"
        leftIcon={<Activity color={colors.white} size={20} />}
      />

      <ScrollView
        contentContainerStyle={{ paddingBottom: 32 }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={colors.primary} />
        }
      >
        {loading && !data ? (
          <View style={s.loadingWrap}>
            <ActivityIndicator color={colors.primary} />
            <Text style={s.loadingText}>Loading…</Text>
          </View>
        ) : (
          <>
            <View style={s.statsGrid}>
              {stats.map((stat) => (
                <View key={stat.label} style={[s.statPill, { backgroundColor: stat.bg }]}>
                  <View style={s.pillIconWrap}>
                    <stat.icon color={stat.color} size={16} />
                  </View>
                  <Text style={[s.pillValue, { color: stat.color }]} numberOfLines={1}>
                    {stat.value}
                  </Text>
                  <Text style={s.pillLabel} numberOfLines={1}>
                    {stat.label}
                  </Text>
                </View>
              ))}
            </View>

            <Text style={s.sectionTitle}>RECENT ACTIVITY</Text>
            {data && data.recentActivity.length === 0 ? (
              <Card variant="outlined" style={s.emptyCard} padding={20}>
                <Text style={s.emptyText}>No recent activity</Text>
              </Card>
            ) : (
              data?.recentActivity.map((item, idx) => {
                const color = ACTIVITY_COLOR[item.type] ?? colors.textMuted;
                const bg = ACTIVITY_BG[item.type] ?? colors.surfaceAlt;
                const Icon =
                  item.type === "production_log"
                    ? ClipboardList
                    : item.type === "pdi_verification"
                      ? CheckCircle2
                      : IndianRupee;
                return (
                  <Card key={`${item.timestamp}-${idx}`} variant="default" style={s.activityCard} padding={14}>
                    <View style={[s.activityIcon, { backgroundColor: bg }]}>
                      <Icon color={color} size={16} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={s.activityDesc} numberOfLines={2}>
                        {item.description}
                      </Text>
                      <View style={s.activityMetaRow}>
                        <View style={[s.activityTag, { backgroundColor: bg, borderColor: color + "40" }]}>
                          <Text style={[s.activityTagText, { color }]}>
                            {ACTIVITY_LABEL[item.type] ?? item.type}
                          </Text>
                        </View>
                        <Text style={s.activityTime}>{formatRelative(item.timestamp)}</Text>
                      </View>
                    </View>
                  </Card>
                );
              })
            )}
          </>
        )}
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bgSubtle },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 14,
    backgroundColor: colors.bg,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderSoft,
  },
  headerIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: colors.primarySofter,
    alignItems: "center",
    justifyContent: "center",
  },
  title: { fontFamily: fonts.extrabold, fontSize: 22, color: colors.text, letterSpacing: -0.3 },
  subtitle: { fontFamily: fonts.medium, fontSize: 12, color: colors.textMuted, marginTop: 2 },
  loadingWrap: { alignItems: "center", marginTop: 60, gap: 10 },
  loadingText: { fontFamily: fonts.medium, fontSize: 13, color: colors.textMuted },
  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 18,
    marginBottom: 6,
  },
  statPill: {
    width: "31.5%",
    borderRadius: radius.md,
    paddingVertical: 12,
    paddingHorizontal: 10,
    alignItems: "flex-start",
    gap: 6,
    marginBottom: 10,
  },
  pillIconWrap: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: colors.white,
    alignItems: "center",
    justifyContent: "center",
    ...(shadow.sm as object),
  },
  pillValue: { fontFamily: fonts.extrabold, fontSize: 20, letterSpacing: -0.3 },
  pillLabel: { fontFamily: fonts.medium, fontSize: 11, color: colors.textMuted },
  sectionTitle: {
    fontFamily: fonts.bold,
    fontSize: 11,
    color: colors.textFaint,
    letterSpacing: 1.6,
    paddingHorizontal: 20,
    marginBottom: 10,
    marginTop: 6,
  },
  emptyCard: { marginHorizontal: 20, alignItems: "center" },
  emptyText: { fontFamily: fonts.medium, color: colors.textFaint, fontSize: 14 },
  activityCard: {
    marginHorizontal: 20,
    marginBottom: 10,
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
  },
  activityIcon: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  activityDesc: { fontFamily: fonts.semibold, fontSize: 13, color: colors.text, lineHeight: 18 },
  activityMetaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 6,
  },
  activityTag: {
    borderRadius: 6,
    borderWidth: 1,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  activityTagText: { fontFamily: fonts.bold, fontSize: 9, letterSpacing: 0.6 },
  activityTime: { fontFamily: fonts.medium, fontSize: 11, color: colors.textFaint },
});
