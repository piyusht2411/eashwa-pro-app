import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Modal,
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
  Calendar,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
} from "lucide-react-native";
import { LinearGradient } from "expo-linear-gradient";

import { createVisit, getAllDrivers } from "@/lib/api";
import { useAuthStore } from "@/stores/authStore";
import { colors, fonts, radius, shadow, spacing } from "@/lib/theme";
import type { Driver } from "@/types";

// ─── Custom Pure-RN Orange Calendar ──────────────────────────────────────────

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];
const DAY_NAMES = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

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

  const selectedLabel = selected
    ? new Date(selected + "T00:00:00").toLocaleDateString("en-IN", {
        day: "numeric", month: "long", year: "numeric",
      })
    : "Tap a date to select";

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onDismiss}
    >
      <View style={cal.overlay}>
        <View style={cal.card}>
          {/* Orange header */}
          <LinearGradient
            colors={[colors.primaryLight, colors.primary]}
            style={cal.header}
          >
            <Text style={cal.headerLabel}>{title}</Text>
            <Text style={cal.headerDate}>{selectedLabel}</Text>
          </LinearGradient>

          {/* Month / year navigation */}
          <View style={cal.nav}>
            <TouchableOpacity onPress={prevMonth} style={cal.navBtn} activeOpacity={0.7}>
              <ChevronLeft size={20} color={colors.primary} />
            </TouchableOpacity>
            <Text style={cal.navTitle}>
              {MONTH_NAMES[viewMonth]} {viewYear}
            </Text>
            <TouchableOpacity onPress={nextMonth} style={cal.navBtn} activeOpacity={0.7}>
              <ChevronRight size={20} color={colors.primary} />
            </TouchableOpacity>
          </View>

          {/* Day-of-week row */}
          <View style={cal.weekRow}>
            {DAY_NAMES.map((d) => (
              <Text key={d} style={cal.weekDay}>{d}</Text>
            ))}
          </View>

          {/* Date cells */}
          <View style={cal.grid}>
            {days.map((day, i) => {
              if (day === null) return <View key={`blank-${i}`} style={cal.cell} />;
              const ds = cellStr(day);
              const isSel = ds === selected;
              const isToday = ds === todayStr;
              return (
                <TouchableOpacity
                  key={ds}
                  style={[
                    cal.cell,
                    isSel && cal.cellSel,
                    isToday && !isSel && cal.cellToday,
                  ]}
                  onPress={() => setSelected(ds)}
                  activeOpacity={0.75}
                >
                  <Text
                    style={[
                      cal.cellText,
                      isSel && cal.cellTextSel,
                      isToday && !isSel && cal.cellTextToday,
                    ]}
                  >
                    {day}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Cancel / OK */}
          <View style={cal.actions}>
            <TouchableOpacity style={cal.cancelBtn} onPress={onDismiss} activeOpacity={0.8}>
              <Text style={cal.cancelText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[cal.okBtn, !selected && cal.okDisabled]}
              onPress={() => selected && onConfirm(selected)}
              activeOpacity={0.8}
              disabled={!selected}
            >
              <Text style={cal.okText}>OK</Text>
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
    backgroundColor: "rgba(0,0,0,0.45)",
    justifyContent: "center",
    alignItems: "center",
  },
  card: {
    width: "90%",
    backgroundColor: colors.white,
    borderRadius: radius.xl,
    overflow: "hidden",
    ...shadow.md,
  },
  header: {
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.lg,
    alignItems: "center",
  },
  headerLabel: {
    fontFamily: fonts.semibold,
    fontSize: 11,
    color: "rgba(255,255,255,0.8)",
    letterSpacing: 1.4,
    textTransform: "uppercase",
  },
  headerDate: {
    fontFamily: fonts.bold,
    fontSize: 18,
    color: colors.white,
    marginTop: 4,
  },
  nav: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderSoft,
  },
  navBtn: {
    padding: spacing.sm,
    borderRadius: radius.full,
    backgroundColor: colors.primarySofter,
  },
  navTitle: {
    fontFamily: fonts.bold,
    fontSize: 15,
    color: colors.text,
  },
  weekRow: {
    flexDirection: "row",
    paddingHorizontal: spacing.xs,
    paddingTop: spacing.sm,
    paddingBottom: 2,
  },
  weekDay: {
    flex: 1,
    textAlign: "center",
    fontFamily: fonts.bold,
    fontSize: 11,
    color: colors.primary,
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    paddingHorizontal: spacing.xs,
    paddingBottom: spacing.sm,
  },
  cell: {
    width: "14.285714%",
    aspectRatio: 1,
    justifyContent: "center",
    alignItems: "center",
    borderRadius: radius.full,
  },
  cellSel: { backgroundColor: colors.primary },
  cellToday: { borderWidth: 1.5, borderColor: colors.primary },
  cellText: { fontFamily: fonts.medium, fontSize: 13, color: colors.text },
  cellTextSel: { color: colors.white, fontFamily: fonts.bold },
  cellTextToday: { color: colors.primary, fontFamily: fonts.bold },
  actions: {
    flexDirection: "row",
    gap: spacing.sm,
    padding: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.borderSoft,
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderColor: colors.border,
    alignItems: "center",
  },
  cancelText: {
    fontFamily: fonts.semibold,
    fontSize: 14,
    color: colors.textSecondary,
  },
  okBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: radius.md,
    backgroundColor: colors.primary,
    alignItems: "center",
  },
  okDisabled: { backgroundColor: colors.textFaint },
  okText: { fontFamily: fonts.bold, fontSize: 14, color: colors.white },
});

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function CreateVisitScreen() {
  const { token } = useAuthStore();
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [selectedDriver, setSelectedDriver] = useState<Driver | null>(null);
  const [showDriverPicker, setShowDriverPicker] = useState(false);
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
          vehicleNumber: form.vehicleNumber.trim() || selectedDriver.vehicleNumber,
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

  return (
    <SafeAreaView style={s.root} edges={["top"]}>
      <LinearGradient
        colors={[colors.primaryLight, colors.primary, colors.primaryDark]}
        style={s.header}
      >
        <TouchableOpacity style={s.back} onPress={() => router.back()}>
          <ArrowLeft size={22} color={colors.white} />
        </TouchableOpacity>
        <Text style={s.headerTitle}>Create Visit</Text>
      </LinearGradient>

      <ScrollView
        style={s.scrollArea}
        contentContainerStyle={s.body}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Driver Picker */}
        <View style={s.section}>
          <Text style={s.label}>Driver *</Text>
          <TouchableOpacity
            style={s.picker}
            onPress={() => setShowDriverPicker((v) => !v)}
            activeOpacity={0.8}
          >
            <Text style={selectedDriver ? s.pickerText : s.pickerPlaceholder}>
              {selectedDriver
                ? `${selectedDriver.name} · ${selectedDriver.vehicleNumber}`
                : "Select a driver..."}
            </Text>
            <ChevronDown size={16} color={colors.textMuted} />
          </TouchableOpacity>

          {showDriverPicker && (
            <Modal transparent animationType="fade" visible>
              <TouchableOpacity
                style={s.modalOverlay}
                onPress={() => setShowDriverPicker(false)}
                activeOpacity={1}
              >
                <View style={s.dropdownModalContent}>
                  {drivers.length === 0 ? (
                    <View style={s.dropdownEmpty}>
                      <Text style={s.dropdownEmptyText}>
                        {driversLoading
                          ? "Loading drivers..."
                          : driverFetchError
                            ? `Error: ${driverFetchError}`
                            : "No active drivers found"}
                      </Text>
                    </View>
                  ) : (
                    drivers.map((d) => (
                      <TouchableOpacity
                        key={d._id}
                        style={s.dropdownItem}
                        onPress={() => {
                          setSelectedDriver(d);
                          setShowDriverPicker(false);
                          setForm((p) => ({ ...p, vehicleNumber: d.vehicleNumber }));
                        }}
                      >
                        <Text style={s.dropdownText}>{d.name}</Text>
                        <Text style={s.dropdownSub}>{d.vehicleNumber}</Text>
                      </TouchableOpacity>
                    ))
                  )}
                </View>
              </TouchableOpacity>
            </Modal>
          )}
        </View>

        {/* Form Fields */}
        <View style={s.section}>
          <Field
            label="Destination *"
            value={form.destination}
            onChangeText={(v) => setForm((p) => ({ ...p, destination: v }))}
            placeholder="e.g. Jaipur Industrial Area"
          />

          {/* Start Date — tappable button */}
          <View style={s.field}>
            <Text style={s.label}>Start Date *</Text>
            <TouchableOpacity
              style={s.dateInput}
              onPress={() => setShowDatePicker("start")}
              activeOpacity={0.8}
            >
              <Calendar
                size={16}
                color={form.startDate ? colors.primary : colors.textFaint}
              />
              <Text
                style={[
                  s.dateInputText,
                  !form.startDate && s.dateInputPlaceholder,
                ]}
              >
                {form.startDate || "Select start date"}
              </Text>
            </TouchableOpacity>
          </View>

          {/* End Date — tappable button */}
          <View style={s.field}>
            <Text style={s.label}>End Date *</Text>
            <TouchableOpacity
              style={s.dateInput}
              onPress={() => setShowDatePicker("end")}
              activeOpacity={0.8}
            >
              <Calendar
                size={16}
                color={form.endDate ? colors.primary : colors.textFaint}
              />
              <Text
                style={[
                  s.dateInputText,
                  !form.endDate && s.dateInputPlaceholder,
                ]}
              >
                {form.endDate || "Select end date"}
              </Text>
            </TouchableOpacity>
          </View>

          {days > 0 && <Text style={s.daysNote}>📅 Total Days: {days}</Text>}

          <Field
            label="Distance (km)"
            value={form.distance}
            onChangeText={(v) => setForm((p) => ({ ...p, distance: v }))}
            placeholder="290"
            keyboardType="numeric"
          />
          <Field
            label="Quantity"
            value={form.quantity}
            onChangeText={(v) => setForm((p) => ({ ...p, quantity: v }))}
            placeholder="1500"
            keyboardType="numeric"
          />
          <Field
            label="Bill Number"
            value={form.billNumber}
            onChangeText={(v) => setForm((p) => ({ ...p, billNumber: v }))}
            placeholder="INV/26/1001"
          />
          <Field
            label="Vehicle Number"
            value={form.vehicleNumber}
            onChangeText={(v) =>
              setForm((p) => ({ ...p, vehicleNumber: v.toUpperCase() }))
            }
            placeholder="Auto-filled from driver"
            autoCapitalize="characters"
          />
        </View>

        <TouchableOpacity
          style={s.submitBtn}
          onPress={handleSubmit}
          disabled={loading}
          activeOpacity={0.85}
        >
          {loading ? (
            <ActivityIndicator color={colors.white} size="small" />
          ) : (
            <Text style={s.submitBtnText}>Create Visit</Text>
          )}
        </TouchableOpacity>

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* ── Custom Orange Calendar Modals ────────────────────────────────── */}
      <CalendarPicker
        visible={showDatePicker === "start"}
        title="Start Date"
        value={form.startDate}
        onConfirm={(date) => {
          setForm((p) => ({ ...p, startDate: date }));
          setShowDatePicker(null);
        }}
        onDismiss={() => setShowDatePicker(null)}
      />
      <CalendarPicker
        visible={showDatePicker === "end"}
        title="End Date"
        value={form.endDate}
        onConfirm={(date) => {
          setForm((p) => ({ ...p, endDate: date }));
          setShowDatePicker(null);
        }}
        onDismiss={() => setShowDatePicker(null)}
      />
    </SafeAreaView>
  );
}

// ─── Reusable components ──────────────────────────────────────────────────────

function Field({
  label,
  value,
  onChangeText,
  placeholder,
  keyboardType = "default",
  autoCapitalize = "sentences",
}: {
  label: string;
  value: string;
  onChangeText: (v: string) => void;
  placeholder: string;
  keyboardType?: any;
  autoCapitalize?: any;
}) {
  return (
    <View style={s.field}>
      <Text style={s.label}>{label}</Text>
      <TextInput
        style={s.input}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.textFaint}
        keyboardType={keyboardType}
        autoCapitalize={autoCapitalize}
      />
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bgSubtle },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.lg,
    gap: 12,
  },
  back: { padding: 4 },
  headerTitle: { fontFamily: fonts.bold, fontSize: 18, color: colors.white },
  body: { padding: spacing.lg, paddingBottom: 40 },
  section: {
    backgroundColor: colors.white,
    borderRadius: radius.lg,
    padding: spacing.lg,
    marginBottom: spacing.md,
    borderLeftWidth: 4,
    borderLeftColor: colors.primary,
    ...shadow.sm,
  },
  label: {
    fontFamily: fonts.semibold,
    fontSize: 13,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  picker: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.md,
  },
  pickerText: { fontFamily: fonts.medium, fontSize: 14, color: colors.text },
  pickerPlaceholder: {
    fontFamily: fonts.regular,
    fontSize: 14,
    color: colors.textFaint,
  },
  dropdownItem: {
    padding: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderSoft,
  },
  dropdownText: { fontFamily: fonts.semibold, fontSize: 14, color: colors.text },
  dropdownSub: {
    fontFamily: fonts.regular,
    fontSize: 12,
    color: colors.primary,
    marginTop: 2,
  },
  dropdownEmpty: {
    padding: spacing.md,
    minHeight: 60,
    justifyContent: "center",
  },
  dropdownEmptyText: {
    fontFamily: fonts.medium,
    fontSize: 13,
    color: colors.textFaint,
  },
  field: { marginBottom: spacing.md },
  scrollArea: { flex: 1 },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.35)",
    justifyContent: "center",
    alignItems: "center",
  },
  dropdownModalContent: {
    width: "90%",
    backgroundColor: colors.white,
    borderRadius: radius.lg,
    padding: spacing.sm,
    maxHeight: 320,
    ...shadow.md,
  },
  // Date input button
  dateInput: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    backgroundColor: colors.white,
  },
  dateInputText: {
    fontFamily: fonts.medium,
    fontSize: 14,
    color: colors.text,
    flex: 1,
  },
  dateInputPlaceholder: {
    color: colors.textFaint,
    fontFamily: fonts.regular,
  },
  // Regular text input
  input: {
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.md,
    fontFamily: fonts.regular,
    fontSize: 14,
    color: colors.text,
  },
  daysNote: {
    fontFamily: fonts.bold,
    fontSize: 14,
    color: colors.primary,
    marginBottom: spacing.md,
    padding: spacing.sm,
    backgroundColor: colors.primarySoft,
    borderRadius: radius.sm,
  },
  submitBtn: {
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    paddingVertical: 16,
    alignItems: "center",
    ...shadow.sm,
  },
  submitBtnText: { fontFamily: fonts.bold, fontSize: 16, color: colors.white },
});
