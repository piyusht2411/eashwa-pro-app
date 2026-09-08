import {
  getNotifications,
  markAllNotificationsRead,
  NotificationItem,
} from "@/lib/api";
import { accents, AccentName, colors, fonts, gradients, radius, shadow, spacing } from "@/lib/theme";
import { useAuthStore } from "@/stores/authStore";
import EmptyState from "@/components/ui/EmptyState";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import {
  Bell,
  CheckCheck,
  CircleCheckBig,
  CircleX,
  Hourglass,
  Package,
  Receipt,
  Route,
  Wallet,
} from "lucide-react-native";
import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

/**
 * Presentation per notification type.
 *
 * `transport: true` means the payload describes a visit, not a production
 * entity — those must not be sent to /notification-detail, which only knows
 * how to render containers and production logs.
 */
type TypeMeta = {
  icon: React.ComponentType<{ size: number; color: string; strokeWidth: number }>;
  accent: AccentName;
  transport?: boolean;
};

const TYPE_META: Record<string, TypeMeta> = {
  // Production portal
  new_container: { icon: Package, accent: "info" },
  new_production_log: { icon: Receipt, accent: "warning" },
  pdi_verified: { icon: CircleCheckBig, accent: "success" },
  pdi_incomplete: { icon: Hourglass, accent: "brand" },
  pdi_verified_admin: { icon: CircleCheckBig, accent: "info" },
  payment_made: { icon: Wallet, accent: "success" },

  // Transport portal
  new_visit: { icon: Route, accent: "brand", transport: true },
  visit_created: { icon: Route, accent: "brand", transport: true },
  visit_updated: { icon: Route, accent: "info", transport: true },
  expense_approved: { icon: CircleCheckBig, accent: "success", transport: true },
  expense_rejected: { icon: CircleX, accent: "danger", transport: true },
  approval_required: { icon: Hourglass, accent: "warning", transport: true },
};

const FALLBACK_META: TypeMeta = { icon: Bell, accent: "neutral" };

function formatRelative(iso: string) {
  const now = Date.now();
  const then = new Date(iso).getTime();
  if (!Number.isFinite(then)) return "";
  const diff = Math.max(0, now - then);
  const sec = Math.floor(diff / 1000);
  if (sec < 60) return "Just now";
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min} min ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr} hr ago`;
  const days = Math.floor(hr / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(iso).toLocaleDateString("en-IN", { day: "2-digit", month: "short" });
}

/** Where a transport notification should open, based on who is signed in. */
function transportVisitPath(role?: string): string | null {
  switch (role) {
    case "admin": return "/(transport-admin)/visit-detail";
    case "accounts": return "/(accounts)/visit-detail";
    case "driver": return "/(driver)/visit-detail";
    default: return null;
  }
}

export default function NotificationsScreen() {
  const { token, user } = useAuthStore();
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [page, setPage] = useState(1);
  const [hasNext, setHasNext] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [marking, setMarking] = useState(false);

  const loadPage = useCallback(
    async (target: number, reset: boolean) => {
      if (!token) return;
      if (reset) setLoading(true);
      else setLoadingMore(true);
      try {
        const res = await getNotifications(token, target);
        setItems((prev) => (reset ? res.notifications : [...prev, ...res.notifications]));
        setHasNext(Boolean(res.pagination?.hasNextPage));
        setPage(target);
      } catch (e: any) {
        Alert.alert("Error", e.message || "Failed to load notifications");
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    [token],
  );

  useEffect(() => { loadPage(1, true); }, [loadPage]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadPage(1, true);
    setRefreshing(false);
  };

  const handleEndReached = () => {
    if (loadingMore || loading || !hasNext) return;
    loadPage(page + 1, false);
  };

  const handleMarkAll = async () => {
    if (!token || marking) return;
    setMarking(true);
    try {
      await markAllNotificationsRead(token);
      await loadPage(1, true);
    } catch (e: any) {
      Alert.alert("Error", e.message || "Failed to mark as read");
    } finally {
      setMarking(false);
    }
  };

  const handleTap = (item: NotificationItem) => {
    const meta = TYPE_META[item.type];
    const data = (item.data || {}) as Record<string, any>;

    // Transport notifications open the visit itself; /notification-detail
    // cannot render them and would show "Unknown notification type".
    if (meta?.transport) {
      const path = transportVisitPath(user?.role);
      const visitId = data.visitId;
      if (path && visitId) {
        router.push({ pathname: path as any, params: { id: String(visitId) } });
      }
      return;
    }

    const params: Record<string, string> = { type: item.type };
    Object.entries(data).forEach(([k, v]) => {
      if (v != null) params[k] = String(v);
    });
    router.push({ pathname: "/notification-detail", params });
  };

  const unreadCount = items.filter((i) => !i.isRead).length;

  return (
    <SafeAreaView style={s.safe} edges={["top"]}>
      <LinearGradient
        colors={gradients.brandDeep}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={s.header}
      >
        <View style={s.blob} pointerEvents="none" />
        <View style={s.headerRow}>
          <View style={{ flex: 1 }}>
            <Text style={s.title}>Notifications</Text>
            <Text style={s.subtitle}>
              {unreadCount > 0 ? `${unreadCount} unread` : "You're all caught up"}
            </Text>
          </View>
          <Pressable
            onPress={handleMarkAll}
            disabled={marking || unreadCount === 0}
            style={[s.markAllBtn, (marking || unreadCount === 0) && { opacity: 0.45 }]}
          >
            {marking ? (
              <ActivityIndicator color={colors.white} size="small" />
            ) : (
              <>
                <CheckCheck color={colors.white} size={15} strokeWidth={2.4} />
                <Text style={s.markAllText}>Mark all</Text>
              </>
            )}
          </Pressable>
        </View>
      </LinearGradient>

      {loading && items.length === 0 ? (
        <ActivityIndicator style={{ marginTop: 60 }} size="large" color={colors.primary} />
      ) : (
        <FlatList
          data={items}
          keyExtractor={(item) => item._id}
          contentContainerStyle={s.list}
          showsVerticalScrollIndicator={false}
          refreshing={refreshing}
          onRefresh={handleRefresh}
          onEndReachedThreshold={0.4}
          onEndReached={handleEndReached}
          ListEmptyComponent={
            <EmptyState
              icon={<Bell size={24} color={colors.primary} strokeWidth={2} />}
              title="No notifications yet"
              subtitle="Updates about visits, expenses and approvals will show up here."
            />
          }
          ListFooterComponent={
            loadingMore ? <ActivityIndicator color={colors.primary} style={{ marginVertical: spacing.lg }} /> : null
          }
          renderItem={({ item }) => {
            const meta = TYPE_META[item.type] ?? FALLBACK_META;
            const a = accents[meta.accent];
            const Icon = meta.icon;

            return (
              <Pressable onPress={() => handleTap(item)} style={({ pressed }) => pressed && { opacity: 0.85 }}>
                <View style={[s.row, !item.isRead && s.rowUnread]}>
                  <View style={[s.iconChip, { backgroundColor: a.bg, borderColor: a.ring }]}>
                    <Icon size={17} color={a.fg} strokeWidth={2.3} />
                  </View>

                  <View style={s.rowMid}>
                    <View style={s.rowHeader}>
                      <Text style={[s.rowTitle, !item.isRead && s.rowTitleUnread]} numberOfLines={1}>
                        {item.title}
                      </Text>
                      {!item.isRead ? <View style={[s.unreadDot, { backgroundColor: a.fg }]} /> : null}
                    </View>
                    <Text style={s.rowBody} numberOfLines={2}>{item.body}</Text>
                    <Text style={s.rowTime}>{formatRelative(item.createdAt)}</Text>
                  </View>
                </View>
              </Pressable>
            );
          }}
        />
      )}
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bgSubtle },

  header: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.xl,
    borderBottomLeftRadius: radius["2xl"],
    borderBottomRightRadius: radius["2xl"],
    overflow: "hidden",
  },
  blob: {
    position: "absolute",
    top: -70,
    right: -50,
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: "rgba(255,255,255,0.12)",
  },
  headerRow: { flexDirection: "row", alignItems: "center", gap: spacing.md },
  title: { fontFamily: fonts.extrabold, fontSize: 23, letterSpacing: -0.4, color: colors.white },
  subtitle: { fontFamily: fonts.medium, fontSize: 12.5, color: "rgba(255,255,255,0.82)", marginTop: 2 },
  markAllBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "rgba(255,255,255,0.2)",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: radius.full,
  },
  markAllText: { fontFamily: fonts.bold, fontSize: 12, color: colors.white },

  list: { padding: spacing.lg, paddingBottom: spacing["4xl"] },
  row: {
    flexDirection: "row",
    gap: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.borderSoft,
    padding: spacing.md,
    marginBottom: spacing.sm,
    ...shadow.sm,
  },
  rowUnread: { borderColor: colors.primaryBorder, backgroundColor: colors.primarySofter },
  iconChip: {
    width: 38,
    height: 38,
    borderRadius: radius.md,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  rowMid: { flex: 1 },
  rowHeader: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  rowTitle: { flex: 1, fontFamily: fonts.semibold, fontSize: 14, letterSpacing: -0.1, color: colors.text },
  rowTitleUnread: { fontFamily: fonts.bold },
  unreadDot: { width: 7, height: 7, borderRadius: 4 },
  rowBody: { fontFamily: fonts.regular, fontSize: 12.5, lineHeight: 18, color: colors.textSecondary, marginTop: 3 },
  rowTime: { fontFamily: fonts.medium, fontSize: 11, color: colors.textFaint, marginTop: 6 },
});
