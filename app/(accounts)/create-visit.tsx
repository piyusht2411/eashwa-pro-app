import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import {
  ArrowLeft,
  CalendarDays,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  FileText,
  Gauge,
  MapPin,
  Package,
  Search,
  Truck,
  UserRound,
  X,
} from "lucide-react-native";
import { LinearGradient } from "expo-linear-gradient";

import { createVisit, getAllDrivers } from "@/lib/api";
import { useAuthStore } from "@/stores/authStore";
import { colors, fonts, gradients, radius, shadow, spacing } from "@/lib/theme";
import { formatDays } from "@/lib/format";
import type { Driver } from "@/types";

// ─── Custom Pure-RN Orange Calendar ──────────────────────────────────────────

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];
const DAY_NAMES = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

/** Initials from a name: "Ravi Kumar" → "RK". */
function initials(name?: string): string {
  const parts = (name ?? "").trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "—";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

/** "2026-03-12" → "12 Mar 2026" for display without re-parsing timezones. */
function prettyDate(ymd: string): string {
  if (!ymd) return "";
  const d = new Date(ymd + "T00:00:00");
  if (Number.isNaN(d.getTime())) return ymd;
  return d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

function CalendarPicker({
  visible,
  title,
  value,
  onConfirm,
  onDismiss,
}: {
  visible: boolean;
  title: string;
  value: string;       // "YYYY-MM-DD" or ""
  onConfirm: (date: string) => void;
  onDismiss: () => void;
}) {
  const today = new Date();
  const todayStr = [
    today.getFullYear(),
    String(today.getMonth() + 1).padStart(2, "0"),
    String(today.getDate()).padStart(2, "0"),
  ].join("-");

  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth());
  const [selected, setSelected] = useState<string>("");

  // Sync state every time modal opens
  useEffect(() => {
    if (visible) {
      const base = value ? new Date(value + "T00:00:00") : today;
      setViewYear(base.getFullYear());
      setViewMonth(base.getMonth());
      setSelected(value || "");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  const days = useMemo(() => {
    const firstDay = new Date(viewYear, viewMonth, 1).getDay();
    const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
    const cells: (number | null)[] = [];
    for (let i = 0; i < firstDay; i++) cells.push(null);
    for (let d = 1; d <= daysInMonth; d++) cells.push(d);
    return cells;
  }, [viewYear, viewMonth]);

  const cellStr = (day: number) =>
    `${viewYear}-${String(viewMonth + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;

  const prevMonth = () => {
    if (viewMonth === 0) { setViewMonth(11); setViewYear((y) => y - 1); }
    else setViewMonth((m) => m - 1);
  };
  const nextMonth = () => {
    if (viewMonth === 11) { setViewMonth(0); setViewYear((y) => y + 1); }
    else setViewMonth((m) => m + 1);
  };

  const selectedLabel = selected ? prettyDate(selected) : "Tap a date to select";

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onDismiss}>
      <View style={cal.overlay}>
        <View style={cal.card}>
          <LinearGradient colors={gradients.brandDeep} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={cal.header}>
            <Text style={cal.headerLabel}>{title}</Text>
            <Text style={cal.headerDate}>{selectedLabel}</Text>
          </LinearGradient>

          <View style={cal.nav}>
            <TouchableOpacity onPress={prevMonth} style={cal.navBtn} activeOpacity={0.7} hitSlop={6}>
              <ChevronLeft size={19} color={colors.primaryDark} strokeWidth={2.5} />
            </TouchableOpacity>
            <Text style={cal.navTitle}>{MONTH_NAMES[viewMonth]} {viewYear}</Text>
            <TouchableOpacity onPress={nextMonth} style={cal.navBtn} activeOpacity={0.7} hitSlop={6}>
              <ChevronRight size={19} color={colors.primaryDark} strokeWidth={2.5} />
            </TouchableOpacity>
          </View>

          <View style={cal.weekRow}>
            {DAY_NAMES.map((d) => <Text key={d} style={cal.weekDay}>{d}</Text>)}
          </View>

          <View style={cal.grid}>
            {days.map((day, i) => {
              if (day === null) return <View key={`blank-${i}`} style={cal.cell} />;
              const ds = cellStr(day);
              const isSel = ds === selected;
              const isToday = ds === todayStr;
              return (
                <TouchableOpacity
                  key={ds}
                  style={[cal.cell, isSel && cal.cellSel, isToday && !isSel && cal.cellToday]}
                  onPress={() => setSelected(ds)}
                  activeOpacity={0.75}
                >
                  <Text style={[cal.cellText, isSel && cal.cellTextSel, isToday && !isSel && cal.cellTextToday]}>
                    {day}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <View style={cal.actions}>
            <TouchableOpacity style={cal.cancelBtn} onPress={onDismiss} activeOpacity={0.85}>
              <Text style={cal.cancelText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[cal.okBtn, !selected && cal.okDisabled]}
              onPress={() => selected && onConfirm(selected)}
              activeOpacity={0.85}
              disabled={!selected}
            >
              <Text style={cal.okText}>Confirm</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const cal = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: colors.overlay,
    justifyContent: "center",
    alignItems: "center",
    padding: spacing.lg,
  },
  card: {
    width: "100%",
    maxWidth: 380,
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    overflow: "hidden",
    ...shadow.md,
  },
  header: { paddingHorizontal: spacing.lg, paddingVertical: spacing.lg },
  headerLabel: {
    fontFamily: fonts.semibold,
    fontSize: 11.5,
    letterSpacing: 1,
    textTransform: "uppercase",
    color: "rgba(255,255,255,0.85)",
  },
  headerDate: { fontFamily: fonts.extrabold, fontSize: 20, letterSpacing: -0.3, color: colors.white, marginTop: 4 },
  nav: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.sm,
  },
  navBtn: {
    width: 34,
    height: 34,
    borderRadius: radius.sm,
    backgroundColor: colors.primarySofter,
    alignItems: "center",
    justifyContent: "center",
  },
  navTitle: { fontFamily: fonts.bold, fontSize: 15, color: colors.text },
  weekRow: { flexDirection: "row", paddingHorizontal: spacing.md, marginTop: spacing.sm },
  weekDay: {
    flex: 1,
    textAlign: "center",
    fontFamily: fonts.semibold,
    fontSize: 11,
    color: colors.textFaint,
    letterSpacing: 0.4,
  },
  grid: { flexDirection: "row", flexWrap: "wrap", paddingHorizontal: spacing.md, paddingTop: 6 },
  cell: {
    width: `${100 / 7}%`,
    aspectRatio: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  cellSel: { backgroundColor: colors.primary, borderRadius: radius.full },
  cellToday: { borderWidth: 1.5, borderColor: colors.primaryBorder, borderRadius: radius.full },
  cellText: { fontFamily: fonts.medium, fontSize: 14, color: colors.text },
  cellTextSel: { color: colors.white, fontFamily: fonts.bold },
  cellTextToday: { color: colors.primaryDark, fontFamily: fonts.bold },
  actions: { flexDirection: "row", gap: spacing.sm, padding: spacing.lg, paddingTop: spacing.md },
  cancelBtn: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 12,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cancelText: { fontFamily: fonts.semibold, fontSize: 14, color: colors.textSecondary },
  okBtn: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 12,
    borderRadius: radius.md,
    backgroundColor: colors.primary,
  },
  okDisabled: { opacity: 0.45 },
  okText: { fontFamily: fonts.bold, fontSize: 14, color: colors.white },
});

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function CreateVisitScreen() {
  const { token } = useAuthStore();
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [selectedDriver, setSelectedDriver] = useState<Driver | null>(null);
  const [showDriverPicker, setShowDriverPicker] = useState(false);
  const [driverSearch, setDriverSearch] = useState("");
  const [showDatePicker, setShowDatePicker] = useState<"start" | "end" | null>(null);
  const [driversLoading, setDriversLoading] = useState(true);
  const [driverFetchError, setDriverFetchError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    destination: "",
    startDate: "",
    endDate: "",
    quantity: "",
    billNumber: "",
    distance: "",
    vehicleNumber: "",
  });

  useEffect(() => {
    if (!token) return;
    setDriversLoading(true);
    setDriverFetchError(null);
    getAllDrivers(token, { isActive: true, limit: 100 })
      .then((res) => setDrivers(res.drivers))
      .catch((error) => {
        setDriverFetchError(error?.message || "Failed to load drivers");
        setDrivers([]);
      })
      .finally(() => setDriversLoading(false));
  }, [token]);

  const calcDays = () => {
    if (!form.startDate || !form.endDate) return 0;
    const start = new Date(form.startDate);
    const end = new Date(form.endDate);
    if (isNaN(start.getTime()) || isNaN(end.getTime())) return 0;
    return Math.max(0, Math.round((end.getTime() - start.getTime()) / 86400000) + 1);
  };

  const handleSubmit = async () => {
    if (!selectedDriver) { Alert.alert("Required", "Please select a driver"); return; }
    if (!form.destination.trim()) { Alert.alert("Required", "Destination is required"); return; }
    if (!form.startDate || !form.endDate) {
      Alert.alert("Required", "Start and end dates are required");
      return;
    }
    if (!token) return;
    const days = calcDays();
    if (days <= 0) { Alert.alert("Invalid", "End date must be on or after start date"); return; }

    // A driver may have no vehicle assigned, so the visit needs one entered here.
    const vehicleNumber = (form.vehicleNumber.trim() || selectedDriver.vehicleNumber || "").toUpperCase();
    if (!vehicleNumber) {
      Alert.alert("Required", "This driver has no vehicle assigned. Please enter a vehicle number for this visit.");
      return;
    }

    setLoading(true);
    try {
      await createVisit(
        {
          driverId: selectedDriver._id,
          destination: form.destination.trim(),
          startDate: form.startDate,
          endDate: form.endDate,
          quantity: parseFloat(form.quantity) || 0,
          billNumber: form.billNumber.trim(),
          distance: parseFloat(form.distance) || 0,
          vehicleNumber,
        },
        token,
      );
      Alert.alert("Success", "Visit created successfully!", [
        { text: "OK", onPress: () => router.back() },
      ]);
    } catch (e: any) {
      Alert.alert("Error", e.message);
    } finally {
      setLoading(false);
    }
  };

  const days = calcDays();
  const needsVehicle = Boolean(selectedDriver) && !selectedDriver?.vehicleNumber;

  const filteredDrivers = drivers.filter((d) => {
    const q = driverSearch.trim().toLowerCase();
    if (!q) return true;
    return (
      d.name.toLowerCase().includes(q) ||
      (d.vehicleNumber ?? "").toLowerCase().includes(q)
    );
  });

  const pickDriver = (d: Driver) => {
    setSelectedDriver(d);
    setShowDriverPicker(false);
    setDriverSearch("");
    setForm((p) => ({ ...p, vehicleNumber: d.vehicleNumber ?? "" }));
  };

  return (
    <SafeAreaView style={s.root} edges={["top"]}>
      <LinearGradient colors={gradients.brandDeep} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={s.header}>
        <View style={s.headerBar}>
          <TouchableOpacity style={s.back} onPress={() => router.back()} hitSlop={8}>
            <ArrowLeft size={20} color={colors.white} strokeWidth={2.4} />
          </TouchableOpacity>
          <Text style={s.headerEyebrow}>New Entry</Text>
        </View>
        <Text style={s.headerTitle}>Create Visit</Text>
      </LinearGradient>

      <KeyboardAvoidingView
        style={s.flex}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          contentContainerStyle={s.body}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* ── Driver ─────────────────────────────────────────────────── */}
          <View style={s.card}>
            <Text style={s.cardTitle}>Driver</Text>

            <TouchableOpacity
              style={[s.picker, selectedDriver && s.pickerFilled]}
              onPress={() => setShowDriverPicker(true)}
              activeOpacity={0.85}
            >
              {selectedDriver ? (
                <>
                  <View style={s.pickerAvatar}>
                    <Text style={s.pickerAvatarText}>{initials(selectedDriver.name)}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={s.pickerName} numberOfLines={1}>{selectedDriver.name}</Text>
                    <Text style={s.pickerSub} numberOfLines={1}>
                      {selectedDriver.vehicleNumber || "No vehicle assigned"}
                    </Text>
                  </View>
                </>
              ) : (
                <>
                  <View style={s.pickerIconEmpty}>
                    <UserRound size={17} color={colors.textMuted} strokeWidth={2.2} />
                  </View>
                  <Text style={s.pickerPlaceholder}>Select a driver…</Text>
                </>
              )}
              <ChevronDown size={17} color={colors.textMuted} strokeWidth={2.3} />
            </TouchableOpacity>

            {needsVehicle ? (
              <View style={s.warnNote}>
                <Text style={s.warnText}>
                  This driver has no vehicle on file — enter one below for this visit.
                </Text>
              </View>
            ) : null}
          </View>

          {/* ── Trip ───────────────────────────────────────────────────── */}
          <View style={s.card}>
            <Text style={s.cardTitle}>Trip Details</Text>

            <FieldLabel text="Destination" required />
            <View style={s.inputWrap}>
              <MapPin size={15} color={colors.textMuted} strokeWidth={2.2} />
              <TextInput
                style={s.input}
                placeholder="e.g. Jaipur Industrial Area"
                placeholderTextColor={colors.textFaint}
                value={form.destination}
                onChangeText={(v) => setForm((p) => ({ ...p, destination: v }))}
              />
            </View>

            <View style={s.dateRow}>
              <View style={s.dateCol}>
                <FieldLabel text="Start Date" required />
                <TouchableOpacity
                  style={[s.dateBtn, form.startDate && s.dateBtnFilled]}
                  onPress={() => setShowDatePicker("start")}
                  activeOpacity={0.85}
                >
                  <CalendarDays size={14} color={form.startDate ? colors.primaryDark : colors.textFaint} strokeWidth={2.3} />
                  <Text style={[s.dateText, !form.startDate && s.datePlaceholder]} numberOfLines={1}>
                    {form.startDate ? prettyDate(form.startDate) : "Select"}
                  </Text>
                </TouchableOpacity>
              </View>

              <View style={s.dateCol}>
                <FieldLabel text="End Date" required />
                <TouchableOpacity
                  style={[s.dateBtn, form.endDate && s.dateBtnFilled]}
                  onPress={() => setShowDatePicker("end")}
                  activeOpacity={0.85}
                >
                  <CalendarDays size={14} color={form.endDate ? colors.primaryDark : colors.textFaint} strokeWidth={2.3} />
                  <Text style={[s.dateText, !form.endDate && s.datePlaceholder]} numberOfLines={1}>
                    {form.endDate ? prettyDate(form.endDate) : "Select"}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            {days > 0 ? (
              <View style={s.daysChip}>
                <CalendarDays size={13} color={colors.primaryDark} strokeWidth={2.4} />
                <Text style={s.daysText}>{formatDays(days)} total</Text>
                <View style={{ flex: 1 }} />
                <Text style={s.daysHint}>Food limit ₹{(400 * days).toLocaleString("en-IN")}</Text>
              </View>
            ) : null}

            <FieldLabel text="Distance (km)" />
            <View style={s.inputWrap}>
              <Gauge size={15} color={colors.textMuted} strokeWidth={2.2} />
              <TextInput
                style={s.input}
                placeholder="290"
                placeholderTextColor={colors.textFaint}
                keyboardType="numeric"
                value={form.distance}
                onChangeText={(v) => setForm((p) => ({ ...p, distance: v }))}
              />
            </View>
          </View>

          {/* ── Cargo & billing ────────────────────────────────────────── */}
          <View style={s.card}>
            <Text style={s.cardTitle}>Cargo & Billing</Text>

            <FieldLabel text="Quantity" />
            <View style={s.inputWrap}>
              <Package size={15} color={colors.textMuted} strokeWidth={2.2} />
              <TextInput
                style={s.input}
                placeholder="1500"
                placeholderTextColor={colors.textFaint}
                keyboardType="numeric"
                value={form.quantity}
                onChangeText={(v) => setForm((p) => ({ ...p, quantity: v }))}
              />
            </View>

            <FieldLabel text="Bill Number" />
            <View style={s.inputWrap}>
              <FileText size={15} color={colors.textMuted} strokeWidth={2.2} />
              <TextInput
                style={s.input}
                placeholder="INV/26/1001"
                placeholderTextColor={colors.textFaint}
                value={form.billNumber}
                onChangeText={(v) => setForm((p) => ({ ...p, billNumber: v }))}
              />
            </View>

            <FieldLabel text="Vehicle Number" required />
            <View style={s.inputWrap}>
              <Truck size={15} color={colors.textMuted} strokeWidth={2.2} />
              <TextInput
                style={[s.input, s.inputPlate]}
                placeholder={selectedDriver ? "Enter vehicle number" : "Auto-filled from driver"}
                placeholderTextColor={colors.textFaint}
                autoCapitalize="characters"
                value={form.vehicleNumber}
                onChangeText={(v) => setForm((p) => ({ ...p, vehicleNumber: v.toUpperCase() }))}
              />
            </View>
          </View>

          <TouchableOpacity
            style={[s.submitBtn, loading && s.submitDisabled]}
            onPress={handleSubmit}
            disabled={loading}
            activeOpacity={0.88}
          >
            {loading ? (
              <ActivityIndicator color={colors.white} size="small" />
            ) : (
              <Text style={s.submitText}>Create Visit</Text>
            )}
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* ── Driver picker sheet ──────────────────────────────────────── */}
      <Modal
        visible={showDriverPicker}
        transparent
        animationType="fade"
        onRequestClose={() => setShowDriverPicker(false)}
      >
        <View style={s.sheetOverlay}>
          <View style={s.sheet}>
            <View style={s.sheetHead}>
              <Text style={s.sheetTitle}>Select Driver</Text>
              <TouchableOpacity onPress={() => setShowDriverPicker(false)} hitSlop={10} style={s.sheetClose}>
                <X size={16} color={colors.textSecondary} strokeWidth={2.6} />
              </TouchableOpacity>
            </View>

            <View style={s.sheetSearch}>
              <Search size={15} color={colors.textMuted} strokeWidth={2.3} />
              <TextInput
                style={s.sheetSearchInput}
                placeholder="Search name or vehicle…"
                placeholderTextColor={colors.textFaint}
                value={driverSearch}
                onChangeText={setDriverSearch}
                autoCorrect={false}
              />
            </View>

            <ScrollView style={s.sheetList} keyboardShouldPersistTaps="handled">
              {driversLoading ? (
                <ActivityIndicator color={colors.primary} style={{ marginVertical: spacing.xl }} />
              ) : filteredDrivers.length === 0 ? (
                <Text style={s.sheetEmpty}>
                  {driverFetchError
                    ? `Could not load drivers: ${driverFetchError}`
                    : driverSearch
                      ? `No driver matches “${driverSearch}”.`
                      : "No active drivers found."}
                </Text>
              ) : (
                filteredDrivers.map((d) => {
                  const active = selectedDriver?._id === d._id;
                  return (
                    <TouchableOpacity
                      key={d._id}
                      style={[s.sheetItem, active && s.sheetItemActive]}
                      onPress={() => pickDriver(d)}
                      activeOpacity={0.85}
                    >
                      <View style={[s.sheetAvatar, active && s.sheetAvatarActive]}>
                        <Text style={[s.sheetAvatarText, active && s.sheetAvatarTextActive]}>
                          {initials(d.name)}
                        </Text>
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={s.sheetName} numberOfLines={1}>{d.name}</Text>
                        <Text style={s.sheetSub} numberOfLines={1}>
                          {d.vehicleNumber || "No vehicle assigned"}
                        </Text>
                      </View>
                    </TouchableOpacity>
                  );
                })
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>

      <CalendarPicker
        visible={showDatePicker === "start"}
        title="Start Date"
        value={form.startDate}
        onConfirm={(date) => { setForm((p) => ({ ...p, startDate: date })); setShowDatePicker(null); }}
        onDismiss={() => setShowDatePicker(null)}
      />
      <CalendarPicker
        visible={showDatePicker === "end"}
        title="End Date"
        value={form.endDate}
        onConfirm={(date) => { setForm((p) => ({ ...p, endDate: date })); setShowDatePicker(null); }}
        onDismiss={() => setShowDatePicker(null)}
      />
    </SafeAreaView>
  );
}

function FieldLabel({ text, required }: { text: string; required?: boolean }) {
  return (
    <View style={s.labelRow}>
      <Text style={s.label}>{text}</Text>
      {required
        ? <Text style={s.requiredMark}>*</Text>
        : <Text style={s.optional}>Optional</Text>}
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bgSubtle },
  flex: { flex: 1 },

  header: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.xl,
    borderBottomLeftRadius: radius["2xl"],
    borderBottomRightRadius: radius["2xl"],
  },
  headerBar: { flexDirection: "row", alignItems: "center", gap: spacing.md },
  back: {
    width: 36,
    height: 36,
    borderRadius: radius.md,
    backgroundColor: "rgba(255,255,255,0.2)",
    alignItems: "center",
    justifyContent: "center",
  },
  headerEyebrow: {
    fontFamily: fonts.semibold,
    fontSize: 11,
    letterSpacing: 1,
    textTransform: "uppercase",
    color: "rgba(255,255,255,0.85)",
  },
  headerTitle: {
    fontFamily: fonts.extrabold,
    fontSize: 25,
    letterSpacing: -0.5,
    color: colors.white,
    marginTop: spacing.md,
  },

  body: { padding: spacing.lg, paddingBottom: spacing["4xl"] },

  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.borderSoft,
    ...shadow.sm,
  },
  cardTitle: {
    fontFamily: fonts.bold,
    fontSize: 15,
    letterSpacing: -0.2,
    color: colors.text,
    marginBottom: spacing.sm,
  },

  labelRow: { flexDirection: "row", alignItems: "center", gap: 5, marginTop: spacing.md, marginBottom: 6 },
  label: { fontFamily: fonts.semibold, fontSize: 11.5, color: colors.textSecondary },
  requiredMark: { fontFamily: fonts.bold, fontSize: 12, color: colors.danger },
  optional: {
    fontFamily: fonts.medium,
    fontSize: 10.5,
    color: colors.textFaint,
    backgroundColor: colors.surfaceAlt,
    borderRadius: radius.full,
    paddingHorizontal: 7,
    paddingVertical: 1,
  },

  inputWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.bgMuted,
  },
  input: { flex: 1, paddingVertical: 12, fontFamily: fonts.medium, fontSize: 14, color: colors.text },
  inputPlate: { letterSpacing: 0.5, fontFamily: fonts.bold },

  picker: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.md,
    backgroundColor: colors.bgMuted,
  },
  pickerFilled: { borderColor: colors.primaryBorder, backgroundColor: colors.primarySofter },
  pickerAvatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.primaryBorder,
    alignItems: "center",
    justifyContent: "center",
  },
  pickerAvatarText: { fontFamily: fonts.extrabold, fontSize: 13.5, color: colors.primaryDark },
  pickerIconEmpty: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: colors.surfaceAlt,
    alignItems: "center",
    justifyContent: "center",
  },
  pickerName: { fontFamily: fonts.bold, fontSize: 14.5, color: colors.text },
  pickerSub: { fontFamily: fonts.medium, fontSize: 11.5, color: colors.textMuted, marginTop: 1 },
  pickerPlaceholder: { flex: 1, fontFamily: fonts.medium, fontSize: 14, color: colors.textFaint },

  warnNote: {
    backgroundColor: colors.warningSoft,
    borderWidth: 1,
    borderColor: colors.warningBorder,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    marginTop: spacing.sm,
  },
  warnText: { fontFamily: fonts.medium, fontSize: 12, lineHeight: 17, color: colors.warning },

  dateRow: { flexDirection: "row", gap: spacing.sm },
  dateCol: { flex: 1 },
  dateBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: 12,
    backgroundColor: colors.bgMuted,
  },
  dateBtnFilled: { borderColor: colors.primaryBorder, backgroundColor: colors.primarySofter },
  dateText: { flex: 1, fontFamily: fonts.semibold, fontSize: 12.5, color: colors.text },
  datePlaceholder: { fontFamily: fonts.medium, color: colors.textFaint },

  daysChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: colors.primarySofter,
    borderWidth: 1,
    borderColor: colors.primaryBorder,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    marginTop: spacing.md,
  },
  daysText: { fontFamily: fonts.bold, fontSize: 12.5, color: colors.primaryDark },
  daysHint: { fontFamily: fonts.medium, fontSize: 11.5, color: colors.primaryDark },

  submitBtn: {
    backgroundColor: colors.primary,
    borderRadius: radius.lg,
    paddingVertical: 16,
    alignItems: "center",
    marginTop: spacing.sm,
    ...shadow.brand,
  },
  submitDisabled: { opacity: 0.7 },
  submitText: { fontFamily: fonts.bold, fontSize: 15.5, letterSpacing: 0.2, color: colors.white },

  // Driver picker sheet
  sheetOverlay: {
    flex: 1,
    backgroundColor: colors.overlay,
    justifyContent: "flex-end",
  },
  sheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: radius["2xl"],
    borderTopRightRadius: radius["2xl"],
    paddingTop: spacing.lg,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xl,
    maxHeight: "78%",
  },
  sheetHead: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  sheetTitle: { fontFamily: fonts.extrabold, fontSize: 18, letterSpacing: -0.3, color: colors.text },
  sheetClose: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.surfaceAlt,
    alignItems: "center",
    justifyContent: "center",
  },
  sheetSearch: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    height: 44,
    marginTop: spacing.md,
    backgroundColor: colors.bgMuted,
  },
  sheetSearchInput: { flex: 1, fontFamily: fonts.medium, fontSize: 14, color: colors.text, padding: 0 },
  sheetList: { marginTop: spacing.md },
  sheetItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
    borderRadius: radius.md,
    marginBottom: 4,
  },
  sheetItemActive: { backgroundColor: colors.primarySofter },
  sheetAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.surfaceAlt,
    alignItems: "center",
    justifyContent: "center",
  },
  sheetAvatarActive: { backgroundColor: colors.primary },
  sheetAvatarText: { fontFamily: fonts.extrabold, fontSize: 14, color: colors.textSecondary },
  sheetAvatarTextActive: { color: colors.white },
  sheetName: { fontFamily: fonts.bold, fontSize: 14.5, color: colors.text },
  sheetSub: { fontFamily: fonts.medium, fontSize: 11.5, color: colors.textMuted, marginTop: 1 },
  sheetEmpty: {
    fontFamily: fonts.medium,
    fontSize: 13,
    color: colors.textMuted,
    textAlign: "center",
    paddingVertical: spacing.xl,
    lineHeight: 19,
  },
});
