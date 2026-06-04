import { Card } from "@/components/ui/Card";
import { GradientHeader } from "@/components/ui/GradientHeader";
import { getTeamHistory, TeamHistoryLog } from "@/lib/api";
import { colors, fonts, radius } from "@/lib/theme";
import { useAuthStore } from "@/stores/authStore";
import { History as HistoryIcon } from "lucide-react-native";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Pressable,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

function formatDate(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

function monthKey(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function monthLabel(d: Date) {
  return d.toLocaleDateString("en-IN", { month: "short", year: "numeric" });
}

const statusStyle = (status: TeamHistoryLog["status"]) => {
  switch (status) {
    case "verified":
      return { color: colors.success, bg: colors.successSoft, border: colors.successBorder };
    case "incomplete":
      return { color: colors.danger, bg: colors.dangerSoft, border: colors.dangerBorder };
    default:
      return { color: colors.warning, bg: colors.warningSoft, border: colors.warningBorder };
  }
};

export default function TeamHistory() {
  const { token } = useAuthStore();
  const now = useMemo(() => new Date(), []);
  const months = useMemo(() => {
    const prev = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const cur = new Date(now.getFullYear(), now.getMonth(), 1);
    const next = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    return [prev, cur, next];
  }, [now]);

  const [month, setMonth] = useState(monthKey(months[1]));
  const [byDate, setByDate] = useState(false);
  const [date, setDate] = useState("");

  const [logs, setLogs] = useState<TeamHistoryLog[]>([]);
  const [page, setPage] = useState(1);
  const [hasNext, setHasNext] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const loadPage = useCallback(
    async (target: number, reset: boolean) => {
      if (!token) return;
      if (reset) setLoading(true);
      else setLoadingMore(true);
      try {
        const res = await getTeamHistory(token, {
          month: byDate ? undefined : month,
          date: byDate && date ? date : undefined,
          page: target,
        });
        setLogs((prev) => (reset ? res.logs : [...prev, ...res.logs]));
        setHasNext(Boolean(res.pagination?.hasNextPage));
        setPage(target);
      } catch (e: any) {
        Alert.alert("Error", e.message || "Failed to load history");
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    [byDate, date, month, token],
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

  return (
    <View style={s.safe}>
      <GradientHeader
        title="History"
        subtitle="Your production logs"
        leftIcon={<HistoryIcon color="#fff" size={20} />}
      />

      {/* Filter bar */}
      <View style={s.filterBar}>
        <View style={s.monthPills}>
          {months.map((m) => {
            const key = monthKey(m);
            const isActive = !byDate && month === key;
            return (
              <Pressable
                key={key}
                onPress={() => {
                  setByDate(false);
                  setMonth(key);
                }}
                style={[s.monthPill, isActive && s.monthPillActive]}
              >
                <Text style={[s.monthPillText, isActive && s.monthPillTextActive]}>
                  {monthLabel(m)}
                </Text>
              </Pressable>
            );
          })}
        </View>

        <View style={s.dateToggleRow}>
          <Text style={s.dateToggleLabel}>Specific date</Text>
          <Switch
            value={byDate}
            onValueChange={setByDate}
            trackColor={{ false: colors.border, true: colors.primaryBorder }}
            thumbColor={byDate ? colors.primary : colors.bg}
          />
        </View>

        {byDate ? (
          <TextInput
            style={s.dateInput}
            value={date}
            onChangeText={setDate}
            placeholder="YYYY-MM-DD"
            placeholderTextColor={colors.textFaint}
            autoCapitalize="none"
          />
        ) : null}
      </View>

      {loading && logs.length === 0 ? (
        <View style={s.loadingWrap}>
          <ActivityIndicator color={colors.primary} />
        </View>
      ) : (
        <FlatList
          data={logs}
          keyExtractor={(item) => item._id}
          contentContainerStyle={{ paddingHorizontal: 20, paddingVertical: 14, paddingBottom: 32 }}
          refreshing={refreshing}
          onRefresh={handleRefresh}
          onEndReachedThreshold={0.4}
          onEndReached={handleEndReached}
          ListEmptyComponent={
            <Card variant="outlined" style={{ alignItems: "center" }} padding={24}>
              <Text style={s.emptyText}>No logs for this filter</Text>
            </Card>
          }
          ListFooterComponent={
            loadingMore ? <ActivityIndicator color={colors.primary} style={{ marginVertical: 16 }} /> : null
          }
          renderItem={({ item }) => {
            const st = statusStyle(item.status);
            return (
              <Card variant="elevated" style={s.row} padding={14}>
                <View style={s.rowTop}>
                  <View style={{ flex: 1, paddingRight: 8 }}>
                    <Text style={s.rowModel}>{item.container.model}</Text>
                    <Text style={s.rowMeta}>{formatDate(item.date)}</Text>
                  </View>
                  <View style={[s.badge, { backgroundColor: st.bg, borderColor: st.border }]}>
                    <Text style={[s.badgeText, { color: st.color }]}>{item.status.toUpperCase()}</Text>
                  </View>
                </View>
                <View style={s.qtyRow}>
                  <View style={s.qtyCell}>
                    <Text style={s.qtyLabel}>Reported</Text>
                    <Text style={s.qtyValue}>{item.reportedQuantity}</Text>
                  </View>
                  <View style={s.qtyDivider} />
                  <View style={s.qtyCell}>
                    <Text style={s.qtyLabel}>Verified</Text>
                    <Text style={[s.qtyValue, { color: colors.success }]}>
                      {item.verifiedQuantity ?? "—"}
                    </Text>
                  </View>
                </View>
                {item.remainingTarget > 0 ? (
                  <Text style={s.remaining}>Remaining: {item.remainingTarget} units</Text>
                ) : null}
                {item.pdiVerification?.remarks ? (
                  <Text style={s.remarks}>{item.pdiVerification.remarks}</Text>
                ) : null}
              </Card>
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
  filterBar: {
    backgroundColor: colors.bg,
    paddingHorizontal: 20,
    paddingTop: 14,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderSoft,
  },
  monthPills: { flexDirection: "row", gap: 8 },
  monthPill: {
    flex: 1,
    paddingVertical: 9,
    paddingHorizontal: 8,
    borderRadius: radius.full,
    backgroundColor: colors.bgSubtle,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
  },
  monthPillActive: { backgroundColor: colors.primarySofter, borderColor: colors.primary },
  monthPillText: { fontFamily: fonts.semibold, fontSize: 12, color: colors.textSecondary },
  monthPillTextActive: { color: colors.primaryDark },
  dateToggleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 12,
  },
  dateToggleLabel: { fontFamily: fonts.semibold, fontSize: 13, color: colors.textSecondary },
  dateInput: {
    marginTop: 8,
    backgroundColor: colors.bgSubtle,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontFamily: fonts.medium,
    fontSize: 13,
    color: colors.text,
  },
  loadingWrap: { paddingTop: 40, alignItems: "center" },
  emptyText: { fontFamily: fonts.medium, color: colors.textFaint, fontSize: 14 },
  row: { marginBottom: 10 },
  rowTop: { flexDirection: "row", alignItems: "flex-start", marginBottom: 10 },
  rowModel: { fontFamily: fonts.bold, fontSize: 14, color: colors.text },
  rowMeta: { fontFamily: fonts.regular, fontSize: 12, color: colors.textMuted, marginTop: 2 },
  badge: { borderRadius: radius.sm, borderWidth: 1, paddingHorizontal: 8, paddingVertical: 4 },
  badgeText: { fontFamily: fonts.bold, fontSize: 10, letterSpacing: 0.5 },
  qtyRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.bgSubtle,
    borderRadius: radius.md,
    paddingVertical: 10,
    paddingHorizontal: 14,
  },
  qtyCell: { flex: 1 },
  qtyDivider: { width: 1, height: 26, backgroundColor: colors.border },
  qtyLabel: { fontFamily: fonts.medium, fontSize: 10, color: colors.textFaint, letterSpacing: 0.4 },
  qtyValue: { fontFamily: fonts.bold, fontSize: 16, color: colors.text, marginTop: 2 },
  remaining: { fontFamily: fonts.semibold, fontSize: 12, color: colors.warning, marginTop: 8 },
  remarks: {
    fontFamily: fonts.regular,
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 6,
    fontStyle: "italic",
  },
});
