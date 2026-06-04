import { Card } from "@/components/ui/Card";
import { GradientHeader } from "@/components/ui/GradientHeader";
import {
  getNotifications,
  markAllNotificationsRead,
  NotificationItem,
} from "@/lib/api";
import { colors, fonts, radius } from "@/lib/theme";
import { useAuthStore } from "@/stores/authStore";
import { router } from "expo-router";
import { Bell, CheckCheck } from "lucide-react-native";
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

const TYPE_COLOR: Record<string, string> = {
  new_container: "#2563EB",
  new_production_log: "#D97706",
  pdi_verified: "#16A34A",
  pdi_incomplete: "#F97316",
  pdi_verified_admin: "#8B5CF6",
  payment_made: "#16A34A",
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

export default function NotificationsScreen() {
  const { token } = useAuthStore();
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

  useEffect(() => {
    loadPage(1, true);
  }, [loadPage]);

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
    const params: Record<string, string> = { type: item.type };
    Object.entries(item.data || {}).forEach(([k, v]) => {
      if (v != null) params[k] = String(v);
    });
    router.push({ pathname: "/notification-detail", params });
  };

  return (
    <View style={s.safe}>
      <GradientHeader
        title="Notifications"
        subtitle="Tap any to view details"
        leftIcon={<Bell color={colors.white} size={20} />}
        right={
          <Pressable
            onPress={handleMarkAll}
            disabled={marking || items.length === 0}
            style={[s.markAllBtn, (marking || items.length === 0) && { opacity: 0.5 }]}
          >
            {marking ? (
              <ActivityIndicator color={colors.white} size="small" />
            ) : (
              <>
                <CheckCheck color={colors.white} size={16} />
                <Text style={s.markAllText}>Mark all</Text>
              </>
            )}
          </Pressable>
        }
      />

      {loading && items.length === 0 ? (
        <View style={s.loadingWrap}>
          <ActivityIndicator color={colors.primary} />
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(item) => item._id}
          contentContainerStyle={{ paddingHorizontal: 20, paddingVertical: 16, paddingBottom: 32 }}
          refreshing={refreshing}
          onRefresh={handleRefresh}
          onEndReachedThreshold={0.4}
          onEndReached={handleEndReached}
          ListEmptyComponent={
            <Card variant="outlined" style={{ alignItems: "center" }} padding={28}>
              <Bell color={colors.textFaint} size={28} />
              <Text style={s.emptyText}>No notifications yet</Text>
            </Card>
          }
          ListFooterComponent={
            loadingMore ? <ActivityIndicator color={colors.primary} style={{ marginVertical: 16 }} /> : null
          }
          renderItem={({ item }) => {
            const accent = TYPE_COLOR[item.type] ?? colors.textMuted;
            return (
              <Pressable onPress={() => handleTap(item)}>
                <View
                  style={[
                    s.row,
                    { borderLeftColor: accent },
                    !item.isRead && { backgroundColor: colors.primarySofter },
                  ]}
                >
                  <View style={s.rowHeader}>
                    <Text style={s.rowTitle} numberOfLines={1}>
                      {item.title}
                    </Text>
                    {!item.isRead ? <View style={[s.unreadDot, { backgroundColor: accent }]} /> : null}
                  </View>
                  <Text style={s.rowBody} numberOfLines={2}>
                    {item.body}
                  </Text>
                  <Text style={s.rowTime}>{formatRelative(item.createdAt)}</Text>
                </View>
              </Pressable>
            );
          }}
        />
      )}
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
  markAllBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "rgba(255,255,255,0.22)",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: radius.md,
  },
  markAllText: { fontFamily: fonts.bold, fontSize: 12, color: colors.white },
  loadingWrap: { paddingTop: 40, alignItems: "center" },
  emptyText: { fontFamily: fonts.medium, color: colors.textFaint, fontSize: 14, marginTop: 10 },
  row: {
    backgroundColor: colors.bg,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.borderSoft,
    borderLeftWidth: 4,
    paddingVertical: 12,
    paddingHorizontal: 14,
    marginBottom: 10,
  },
  rowHeader: { flexDirection: "row", alignItems: "center", gap: 8 },
  rowTitle: { fontFamily: fonts.bold, fontSize: 14, color: colors.text, flex: 1 },
  unreadDot: { width: 8, height: 8, borderRadius: 4 },
  rowBody: { fontFamily: fonts.regular, fontSize: 13, color: colors.textSecondary, marginTop: 4, lineHeight: 18 },
  rowTime: { fontFamily: fonts.medium, fontSize: 11, color: colors.textFaint, marginTop: 6 },
});
