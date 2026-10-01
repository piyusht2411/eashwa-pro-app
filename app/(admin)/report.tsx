import { Card } from "@/components/ui/Card";
import { GradientHeader } from "@/components/ui/GradientHeader";
import MonthFilter, {
  MonthPeriod,
  monthPeriodLabel,
  monthPeriodParams,
  monthPeriodSlug,
} from "@/components/ui/MonthFilter";
import {
  AdminReportLog,
  AdminReportResponse,
  getAdminReport,
  getAdminReportExport,
} from "@/lib/api";
import { colors, fonts, radius } from "@/lib/theme";
import { useAuthStore } from "@/stores/authStore";
import { useProductionStore } from "@/stores/productionStore";
import * as FileSystem from "expo-file-system/legacy";
import * as Sharing from "expo-sharing";
import { Calendar, FileBarChart, FileSpreadsheet } from "lucide-react-native";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

const PAGE_LIMIT = 20;

function toStableId(value: unknown) {
  if (typeof value === "string") return value;
  if (value && typeof value === "object") {
    const id = (value as any).$oid ?? (value as any)._id;
    if (typeof id === "string") return id;
    if (id) return String(id);
  }
  return value == null ? "" : String(value);
}

function formatDate(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

function formatINR(n: number) {
  return `₹${(n ?? 0).toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;
}

const statusStyle = (status: AdminReportLog["status"]) => {
  switch (status) {
    case "verified":
      return { color: colors.success, bg: colors.successSoft, border: colors.successBorder };
    case "incomplete":
      return { color: colors.danger, bg: colors.dangerSoft, border: colors.dangerBorder };
    default:
      return { color: colors.warning, bg: colors.warningSoft, border: colors.warningBorder };
  }
};

export default function AdminReport() {
  const { token } = useAuthStore();
  const { teams, fetchTeams } = useProductionStore();

  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [teamId, setTeamId] = useState<string | null>(null);
  // A picked month replaces the custom range (and vice versa); null = all time.
  const [period, setPeriod] = useState<MonthPeriod>(null);

  const pickPeriod = (next: MonthPeriod) => {
    setPeriod(next);
    if (next) { setStartDate(""); setEndDate(""); }
  };
  const editStart = (v: string) => { setStartDate(v); setPeriod(null); };
  const editEnd = (v: string) => { setEndDate(v); setPeriod(null); };

  const [logs, setLogs] = useState<AdminReportLog[]>([]);
  const [summary, setSummary] = useState<AdminReportResponse["summary"] | null>(null);
  const [page, setPage] = useState(1);
  const [hasNext, setHasNext] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    if (!token || teams.length > 0) return;
    fetchTeams(token).catch(() => undefined);
  }, [fetchTeams, teams.length, token]);

  const loadPage = useCallback(
    async (targetPage: number, reset: boolean) => {
      if (!token) return;
      if (reset) setLoading(true);
      else setLoadingMore(true);
      try {
        const res = await getAdminReport(token, {
          startDate: startDate || undefined,
          endDate: endDate || undefined,
          teamId: teamId || undefined,
          ...monthPeriodParams(period),
          page: targetPage,
          limit: PAGE_LIMIT,
        });
        setSummary(res.summary);
        setLogs((prev) => (reset ? res.logs : [...prev, ...res.logs]));
        setHasNext(Boolean(res.pagination?.hasNextPage));
        setPage(targetPage);
      } catch (e: any) {
        Alert.alert("Error", e.message || "Failed to load report");
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    [endDate, startDate, teamId, period, token],
  );

  // Re-fetch when filters change
  useEffect(() => {
    loadPage(1, true);
  }, [loadPage]);

  const handleEndReached = () => {
    if (loadingMore || loading || !hasNext) return;
    loadPage(page + 1, false);
  };

  const handleExport = async () => {
    if (!token || exporting) return;
    setExporting(true);
    try {
      const res = await getAdminReportExport(token, {
        startDate: startDate || undefined,
        endDate: endDate || undefined,
        teamId: teamId || undefined,
        ...monthPeriodParams(period),
      });

      if (res.logs.length === 0) {
        Alert.alert("No data", `No report rows match these filters (${monthPeriodLabel(period)}).`);
        return;
      }

      const rows = res.logs.map((item) => ({
        Date: formatDate(item.date),
        Team: item.team?.name ?? "Team",
        Container: item.container?.model ?? "Container",
        Status: item.status.toUpperCase(),
        Reported: item.reportedQuantity,
        Verified: item.verifiedQuantity ?? "",
        Missing: item.missingQuantity ?? 0,
        "Rate Per Unit": item.container?.ratePerUnit ?? "",
        Remarks: item.remarks ?? "",
      }));

      // Loaded on demand — it is large and only the export needs it.
      const XLSX = await import("xlsx");
      const sheet = XLSX.utils.json_to_sheet(rows);
      sheet["!cols"] = [
        { wch: 14 },
        { wch: 22 },
        { wch: 22 },
        { wch: 14 },
        { wch: 12 },
        { wch: 12 },
        { wch: 12 },
        { wch: 14 },
        { wch: 28 },
      ];
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, sheet, "Report");

      if (!FileSystem.documentDirectory) {
        Alert.alert("Export failed", "File storage is not available on this device.");
        return;
      }

      const base64 = XLSX.write(workbook, { type: "base64", bookType: "xlsx" });
      // A custom range keeps the date stamp; otherwise name it by period.
      const stamp = startDate || endDate ? new Date().toISOString().slice(0, 10) : monthPeriodSlug(period);
      const fileUri = `${FileSystem.documentDirectory}eashwa-report-${stamp}.xlsx`;
      await FileSystem.writeAsStringAsync(fileUri, base64, {
        encoding: FileSystem.EncodingType.Base64,
      });

      const canShare = await Sharing.isAvailableAsync();
      if (!canShare) {
        Alert.alert("Export ready", `Excel file created: ${fileUri}`);
        return;
      }

      await Sharing.shareAsync(fileUri, {
        mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        dialogTitle: "Export report",
        UTI: "com.microsoft.excel.xlsx",
      });
    } catch (e: any) {
      Alert.alert("Export failed", e.message || "Failed to export report");
    } finally {
      setExporting(false);
    }
  };

  const productionTeams = useMemo(() => teams.filter((t) => t.role === "team"), [teams]);

  const exportAction = (
    <Pressable
      onPress={handleExport}
      disabled={exporting}
      style={({ pressed }) => [
        s.exportButton,
        exporting && s.exportButtonDisabled,
        pressed && !exporting && { opacity: 0.86 },
      ]}
    >
      {exporting ? (
        <ActivityIndicator color={colors.white} size="small" />
      ) : (
        <FileSpreadsheet color={colors.white} size={16} />
      )}
      <Text style={s.exportButtonText}>{exporting ? "Exporting..." : "Export Excel"}</Text>
    </Pressable>
  );

  const summaryStrip = summary
    ? [
        { label: "Reported", value: String(summary.totalReported), color: colors.text },
        { label: "Verified", value: String(summary.totalVerified), color: colors.success },
        { label: "Incomplete", value: String(summary.totalIncomplete), color: colors.danger },
        { label: "Total Amount", value: formatINR(summary.totalAmount), color: colors.primary },
        { label: "Paid", value: formatINR(summary.totalPaid), color: colors.success },
        { label: "Remaining", value: formatINR(summary.totalRemaining), color: colors.danger },
      ]
    : [];

  return (
    <View style={s.safe}>
      <GradientHeader
        title="Report & History"
        subtitle="Filter by date and team"
        showBack
        leftIcon={<FileBarChart color={colors.white} size={20} />}
        right={exportAction}
      />

      {/* Filter bar */}
      <View style={s.filterBar}>
        <View style={s.periodRow}>
          <Text style={s.fieldLabel}>Period</Text>
          <MonthFilter value={period} onChange={pickPeriod} />
          {startDate || endDate ? <Text style={s.periodHint}>Custom range below</Text> : null}
        </View>
        <View style={s.dateRow}>
          <View style={s.dateField}>
            <Text style={s.fieldLabel}>Start</Text>
            <View style={s.dateInputWrap}>
              <Calendar color={colors.textMuted} size={14} />
              <TextInput
                style={s.dateInput}
                value={startDate}
                onChangeText={editStart}
                placeholder="YYYY-MM-DD"
                placeholderTextColor={colors.textFaint}
                autoCapitalize="none"
              />
            </View>
          </View>
          <View style={s.dateField}>
            <Text style={s.fieldLabel}>End</Text>
            <View style={s.dateInputWrap}>
              <Calendar color={colors.textMuted} size={14} />
              <TextInput
                style={s.dateInput}
                value={endDate}
                onChangeText={editEnd}
                placeholder="YYYY-MM-DD"
                placeholderTextColor={colors.textFaint}
                autoCapitalize="none"
              />
            </View>
          </View>
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.teamPillsRow}>
          <Pressable
            onPress={() => setTeamId(null)}
            style={[s.teamPill, teamId === null && s.teamPillActive]}
          >
            <Text style={[s.teamPillText, teamId === null && s.teamPillTextActive]}>All teams</Text>
          </Pressable>
          {productionTeams.map((t) => {
            const isActive = teamId === t._id;
            return (
              <Pressable
                key={t._id}
                onPress={() => setTeamId(t._id)}
                style={[s.teamPill, isActive && s.teamPillActive]}
              >
                <Text style={[s.teamPillText, isActive && s.teamPillTextActive]}>{t.name}</Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      {/* Summary strip */}
      {summary ? (
        <ScrollView
          horizontal
          style={s.summaryScroll}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={s.summaryStrip}
        >
          {summaryStrip.map((it) => (
            <View key={it.label} style={s.summaryCell}>
              <Text style={s.summaryLabel}>{it.label}</Text>
              <Text style={[s.summaryValue, { color: it.color }]} numberOfLines={1}>
                {it.value}
              </Text>
            </View>
          ))}
        </ScrollView>
      ) : null}

      {/* List */}
      {loading && logs.length === 0 ? (
        <View style={s.loadingWrap}>
          <ActivityIndicator color={colors.primary} />
        </View>
      ) : (
        <FlatList
          data={logs}
          keyExtractor={(item, index) => {
            const id = toStableId(item._id);
            return id ? `${id}-${index}` : `report-log-${index}`;
          }}
          contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 32 }}
          onEndReachedThreshold={0.4}
          onEndReached={handleEndReached}
          ListEmptyComponent={
            <Card variant="outlined" style={{ alignItems: "center" }} padding={24}>
              <Text style={s.emptyText}>No logs match these filters</Text>
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
                    <Text style={s.rowModel}>{item.container?.model ?? "Container"}</Text>
                    <Text style={s.rowMeta}>
                      {item.team?.name ?? "Team"} · {formatDate(item.date)}
                    </Text>
                  </View>
                  <View style={[s.statusBadge, { backgroundColor: st.bg, borderColor: st.border }]}>
                    <Text style={[s.statusText, { color: st.color }]}>{item.status.toUpperCase()}</Text>
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
                {item.missingQuantity && item.missingQuantity > 0 ? (
                  <Text style={s.missing}>Missing: {item.missingQuantity}</Text>
                ) : null}
                {item.remarks ? <Text style={s.remarks}>{item.remarks}</Text> : null}
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
  periodRow: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 12 },
  periodHint: { fontFamily: fonts.medium, fontSize: 11.5, color: colors.textFaint },
  dateRow: { flexDirection: "row", gap: 10, marginBottom: 12 },
  dateField: { flex: 1 },
  fieldLabel: {
    fontFamily: fonts.semibold,
    fontSize: 11,
    color: colors.textSecondary,
    marginBottom: 5,
    letterSpacing: 0.4,
  },
  dateInputWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: colors.bgSubtle,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: 10,
  },
  dateInput: {
    flex: 1,
    fontFamily: fonts.medium,
    fontSize: 13,
    color: colors.text,
    paddingVertical: 10,
  },
  teamPillsRow: { gap: 8, paddingRight: 10 },
  teamPill: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: radius.full,
    backgroundColor: colors.bgSubtle,
    borderWidth: 1,
    borderColor: colors.border,
  },
  teamPillActive: { backgroundColor: colors.primarySofter, borderColor: colors.primary },
  teamPillText: { fontFamily: fonts.semibold, fontSize: 12, color: colors.textSecondary },
  teamPillTextActive: { color: colors.primaryDark },
  exportButton: {
    minHeight: 38,
    borderRadius: radius.md,
    backgroundColor: colors.primary,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingHorizontal: 10,
  },
  exportButtonDisabled: { opacity: 0.68 },
  exportButtonText: { fontFamily: fonts.bold, fontSize: 13, color: colors.white },
  summaryScroll: {
    flexGrow: 0,
    height: 78,
    marginBottom: 8,
  },
  summaryStrip: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 10,
    gap: 12,
    alignItems: "center",
  },
  summaryCell: {
    backgroundColor: colors.bg,
    borderWidth: 1,
    borderColor: colors.borderSoft,
    borderRadius: radius.md,
    height: 54,
    paddingHorizontal: 14,
    minWidth: 110,
    justifyContent: "center",
  },
  summaryLabel: {
    fontFamily: fonts.medium,
    fontSize: 10,
    letterSpacing: 0.6,
    color: colors.textFaint,
    textTransform: "uppercase",
  },
  summaryValue: { fontFamily: fonts.extrabold, fontSize: 16, lineHeight: 20, marginTop: 2 },
  loadingWrap: { paddingTop: 40, alignItems: "center" },
  emptyText: { fontFamily: fonts.medium, fontSize: 14, color: colors.textFaint },
  row: { marginBottom: 10 },
  rowTop: { flexDirection: "row", alignItems: "flex-start", marginBottom: 10 },
  rowModel: { fontFamily: fonts.bold, fontSize: 14, color: colors.text },
  rowMeta: { fontFamily: fonts.regular, fontSize: 12, color: colors.textMuted, marginTop: 2 },
  statusBadge: { borderRadius: radius.sm, borderWidth: 1, paddingHorizontal: 8, paddingVertical: 4 },
  statusText: { fontFamily: fonts.bold, fontSize: 10, letterSpacing: 0.5 },
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
  missing: { fontFamily: fonts.semibold, fontSize: 12, color: colors.danger, marginTop: 8 },
  remarks: { fontFamily: fonts.regular, fontSize: 12, color: colors.textMuted, marginTop: 6, fontStyle: "italic" },
});
