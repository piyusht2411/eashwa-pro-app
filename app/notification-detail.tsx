import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import {
  getContainer,
  getContainerPaymentSummary,
  getPDIVerificationByLog,
  getProductionLogById,
} from "@/lib/api";
import { useAuthStore } from "@/stores/authStore";

// ─── Types ───────────────────────────────────────────────────────────────────

type NotificationType =
  | "new_container"
  | "new_production_log"
  | "pdi_verified"
  | "pdi_incomplete"
  | "pdi_verified_admin"
  | "payment_made";

// ─── Helpers ─────────────────────────────────────────────────────────────────

const formatDate = (iso: string) => {
  try {
    return new Date(iso).toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  } catch {
    return iso;
  }
};

const formatCurrency = (n: number) =>
  `₹${n.toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;

// ─── Sub-components ───────────────────────────────────────────────────────────

const InfoRow = ({
  label,
  value,
  highlight,
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) => (
  <View className="flex-row justify-between items-center py-3 border-b border-gray-100">
    <Text className="text-sm text-gray-500 flex-1">{label}</Text>
    <Text
      className={`text-sm font-semibold flex-1 text-right ${
        highlight ? "text-orange-500" : "text-gray-800"
      }`}
    >
      {value}
    </Text>
  </View>
);

const Card = ({
  children,
  title,
  icon,
  color,
}: {
  children: React.ReactNode;
  title: string;
  icon: string;
  color: string;
}) => (
  <View className="bg-white rounded-2xl p-4 mb-4 shadow-sm border border-gray-100">
    <View className="flex-row items-center gap-x-2 mb-3">
      <View
        style={{ backgroundColor: color + "20" }}
        className="w-8 h-8 rounded-full items-center justify-center"
      >
        <Ionicons name={icon as any} size={16} color={color} />
      </View>
      <Text className="text-base font-bold text-gray-800">{title}</Text>
    </View>
    {children}
  </View>
);

// ─── Main Component ───────────────────────────────────────────────────────────

export default function NotificationDetail() {
  const { type, logId, containerId } = useLocalSearchParams<{
    type: NotificationType;
    logId?: string;
    containerId?: string;
  }>();

  const { token } = useAuthStore();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<any>(null);

  useEffect(() => {
    if (!token || !type) {
      setError("Missing notification data.");
      setLoading(false);
      return;
    }
    fetchDetail();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [type, logId, containerId, token]);

  const fetchDetail = async () => {
    setLoading(true);
    setError(null);
    try {
      switch (type) {
        case "new_container": {
          if (!containerId) throw new Error("No container ID in notification");
          const res = await getContainer(containerId, token!);
          setData({ container: res.container });
          break;
        }
        case "new_production_log":
        case "pdi_verified":
        case "pdi_incomplete":
        case "pdi_verified_admin": {
          if (!logId) throw new Error("No log ID in notification");
          const [logRes, verRes] = await Promise.allSettled([
            getProductionLogById(logId, token!),
            getPDIVerificationByLog(logId, token!),
          ]);
          setData({
            log:
              logRes.status === "fulfilled" ? logRes.value.log : null,
            verification:
              verRes.status === "fulfilled"
                ? verRes.value.verification
                : null,
          });
          break;
        }
        case "payment_made": {
          if (!containerId) throw new Error("No container ID in notification");
          const [payRes, containerRes] = await Promise.allSettled([
            getContainerPaymentSummary(containerId, token!),
            getContainer(containerId, token!),
          ]);
          setData({
            payment:
              payRes.status === "fulfilled" ? payRes.value.payment : null,
            container:
              containerRes.status === "fulfilled"
                ? containerRes.value.container
                : null,
          });
          break;
        }
        default:
          throw new Error("Unknown notification type");
      }
    } catch (err: any) {
      setError(err.message || "Failed to load details");
    } finally {
      setLoading(false);
    }
  };

  // ─── Config per type ───────────────────────────────────────────────────────

  const typeConfig: Record<
    NotificationType,
    { title: string; subtitle: string; color: string; icon: string }
  > = {
    new_container: {
      title: "New Job Assigned",
      subtitle: "A new container has been assigned to you",
      color: "#3B82F6",
      icon: "cube-outline",
    },
    new_production_log: {
      title: "Production Log Submitted",
      subtitle: "A team member submitted a log for verification",
      color: "#F59E0B",
      icon: "document-text-outline",
    },
    pdi_verified: {
      title: "Production Verified ✅",
      subtitle: "PDI has fully verified your production log",
      color: "#10B981",
      icon: "checkmark-circle-outline",
    },
    pdi_incomplete: {
      title: "Partial Verification ⚠️",
      subtitle: "PDI found some units missing in your log",
      color: "#F97316",
      icon: "warning-outline",
    },
    pdi_verified_admin: {
      title: "PDI Verification Complete",
      subtitle: "PDI has submitted a verification summary",
      color: "#8B5CF6",
      icon: "clipboard-outline",
    },
    payment_made: {
      title: "Payment Received 💰",
      subtitle: "Admin has recorded a payment for your work",
      color: "#10B981",
      icon: "cash-outline",
    },
  };

  const cfg = typeConfig[type as NotificationType] ?? {
    title: "Notification",
    subtitle: "",
    color: "#6B7280",
    icon: "notifications-outline",
  };

  // ─── Navigate CTA ──────────────────────────────────────────────────────────

  const handleNavigate = () => {
    switch (type) {
      case "new_container":
        router.push("/(team)/log-production" as any);
        break;
      case "new_production_log":
        router.push("/(pdi)/verify" as any);
        break;
      case "pdi_verified":
      case "pdi_incomplete":
        router.push("/(team)/dashboard" as any);
        break;
      case "pdi_verified_admin":
        router.push("/(admin)/containers" as any);
        break;
      case "payment_made":
        router.push("/(team)/earnings" as any);
        break;
      default:
        router.back();
    }
  };

  // ─── Render detail sections ────────────────────────────────────────────────

  const renderContent = () => {
    if (!data) return null;

    // Container assignment
    if (type === "new_container" && data.container) {
      const c = data.container;
      const team =
        typeof c.assignedTeam === "object" ? c.assignedTeam : null;
      return (
        <>
          <Card title="Container Details" icon="cube" color="#3B82F6">
            <InfoRow label="Model" value={c.model} />
            <InfoRow label="Target Quantity" value={`${c.quantity} units`} />
            <InfoRow
              label="Rate per Unit"
              value={formatCurrency(c.ratePerUnit)}
            />
            <InfoRow label="Date" value={formatDate(c.date)} />
            <InfoRow
              label="Status"
              value={c.status.toUpperCase()}
              highlight={c.status === "active"}
            />
          </Card>
          {team && (
            <Card title="Assigned To" icon="person" color="#6366F1">
              <InfoRow label="Name" value={team.name} />
              <InfoRow label="Email" value={team.email} />
              {team.phone && <InfoRow label="Phone" value={team.phone} />}
            </Card>
          )}
          <View className="bg-blue-50 rounded-2xl p-4 mb-4">
            <Text className="text-blue-700 text-sm font-medium text-center">
              💡 Start logging your daily production from the Log Production tab
            </Text>
          </View>
        </>
      );
    }

    // Production log (for PDI / Team / Admin)
    if (
      ["new_production_log", "pdi_verified", "pdi_incomplete", "pdi_verified_admin"].includes(
        type as string
      )
    ) {
      const log = data.log;
      const ver = data.verification;
      const container =
        log && typeof log.container === "object" ? log.container : null;
      const team =
        log && typeof log.team === "object" ? log.team : null;

      return (
        <>
          {log && (
            <Card title="Production Log" icon="document-text" color="#F59E0B">
              {container && (
                <InfoRow label="Model" value={container.model} />
              )}
              <InfoRow label="Date" value={formatDate(log.date)} />
              <InfoRow
                label="Reported Quantity"
                value={`${log.reportedQuantity} units`}
              />
              <InfoRow
                label="Verified Quantity"
                value={
                  log.verifiedQuantity != null
                    ? `${log.verifiedQuantity} units`
                    : "Pending"
                }
                highlight={log.verifiedQuantity != null}
              />
              <InfoRow
                label="Status"
                value={log.status.toUpperCase()}
                highlight={log.status === "verified"}
              />
              {team && <InfoRow label="Team Member" value={team.name} />}
            </Card>
          )}

          {ver && (
            <Card title="PDI Verification" icon="checkmark-circle" color="#10B981">
              <InfoRow
                label="Verified Quantity"
                value={`${ver.verifiedQuantity} units`}
                highlight
              />
              <InfoRow
                label="Result"
                value={ver.isIncomplete ? "Incomplete ⚠️" : "Fully Verified ✅"}
                highlight={!ver.isIncomplete}
              />
              {ver.isIncomplete && ver.missingQuantity != null && (
                <InfoRow
                  label="Missing Units"
                  value={`${ver.missingQuantity} units`}
                />
              )}
              {ver.remarks ? (
                <InfoRow label="Remarks" value={ver.remarks} />
              ) : null}
              {ver.verifiedBy && (
                <InfoRow
                  label="Verified By"
                  value={
                    typeof ver.verifiedBy === "object"
                      ? ver.verifiedBy.name
                      : ver.verifiedBy
                  }
                />
              )}
              <InfoRow label="Verified At" value={formatDate(ver.verifiedAt)} />
            </Card>
          )}

          {!log && !ver && (
            <View className="bg-yellow-50 rounded-2xl p-4 mb-4">
              <Text className="text-yellow-700 text-sm text-center">
                Detail data could not be loaded. The record may have been deleted.
              </Text>
            </View>
          )}
        </>
      );
    }

    // Payment
    if (type === "payment_made") {
      const pay = data.payment;
      const container =
        pay && typeof pay.container === "object" ? pay.container : data.container;

      return (
        <>
          {container && (
            <Card title="Container" icon="cube" color="#6366F1">
              <InfoRow label="Model" value={container.model} />
              <InfoRow label="Date" value={formatDate(container.date)} />
              <InfoRow label="Status" value={container.status?.toUpperCase() ?? "—"} />
            </Card>
          )}
          {pay && (
            <Card title="Payment Summary" icon="cash" color="#10B981">
              <InfoRow
                label="Total Verified Qty"
                value={`${pay.totalVerifiedQuantity} units`}
              />
              <InfoRow
                label="Total Amount"
                value={formatCurrency(pay.totalAmount)}
              />
              <InfoRow
                label="Paid So Far"
                value={formatCurrency(pay.paidAmount)}
                highlight
              />
              <InfoRow
                label="Remaining"
                value={formatCurrency(pay.remainingAmount)}
              />
            </Card>
          )}
          {pay?.payments && pay.payments.length > 0 && (
            <Card title="Payment History" icon="receipt-outline" color="#F59E0B">
              {pay.payments.map((p: any, idx: number) => (
                <View key={idx}>
                  <InfoRow
                    label={formatDate(p.paidAt)}
                    value={formatCurrency(p.amount)}
                    highlight
                  />
                  {p.note ? (
                    <Text className="text-xs text-gray-400 pb-1 text-right">
                      {p.note}
                    </Text>
                  ) : null}
                </View>
              ))}
            </Card>
          )}
        </>
      );
    }

    return null;
  };

  // ─── Render ────────────────────────────────────────────────────────────────

  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      {/* Header */}
      <View className="flex-row items-center px-4 py-4 bg-white border-b border-gray-100">
        <TouchableOpacity
          onPress={() => router.back()}
          className="w-10 h-10 rounded-full bg-gray-100 items-center justify-center mr-3"
        >
          <Ionicons name="chevron-back" size={20} color="#374151" />
        </TouchableOpacity>
        <View className="flex-1">
          <Text className="text-base font-bold text-gray-900" numberOfLines={1}>
            {cfg.title}
          </Text>
          <Text className="text-xs text-gray-500" numberOfLines={1}>
            {cfg.subtitle}
          </Text>
        </View>
        {/* Type badge */}
        <View
          style={{ backgroundColor: cfg.color + "18" }}
          className="w-10 h-10 rounded-full items-center justify-center"
        >
          <Ionicons name={cfg.icon as any} size={20} color={cfg.color} />
        </View>
      </View>

      {/* Body */}
      {loading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#F96A07" />
          <Text className="mt-3 text-gray-500 text-sm">Loading details…</Text>
        </View>
      ) : error ? (
        <View className="flex-1 items-center justify-center px-6">
          <Ionicons name="alert-circle-outline" size={48} color="#EF4444" />
          <Text className="text-gray-700 font-semibold mt-3 text-center">
            Could not load details
          </Text>
          <Text className="text-gray-400 text-sm mt-1 text-center">{error}</Text>
          <TouchableOpacity
            onPress={fetchDetail}
            className="mt-4 bg-orange-500 px-6 py-3 rounded-xl"
          >
            <Text className="text-white font-semibold">Retry</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView
          className="flex-1 px-4 pt-4"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 32 }}
        >
          {renderContent()}

          {/* CTA */}
          <TouchableOpacity
            onPress={handleNavigate}
            style={{ backgroundColor: cfg.color }}
            className="rounded-2xl py-4 items-center mt-2 shadow-sm"
          >
            <Text className="text-white font-bold text-base">
              {type === "new_container"
                ? "Go to Log Production"
                : type === "new_production_log"
                ? "Go to Verify"
                : type === "payment_made"
                ? "View My Earnings"
                : type === "pdi_verified_admin"
                ? "View Containers"
                : "View Dashboard"}
            </Text>
          </TouchableOpacity>
        </ScrollView>
      )}
    </SafeAreaView>
  );
}
