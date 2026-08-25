// ─── API Configuration ─────────────────────────────────────────────────────
import type {
  AccountsDashboard,
  AdminDashboard,
  Driver,
  DriverDashboard,
  DriverSummary,
  Expense,
  Visit,
} from "@/types";

// Change this to your deployed backend URL when ready
export const API_BASE = "https://eashwa-pro-backend.vercel.app/api";

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNextPage: boolean;
}

export interface PaginationParams {
  page?: number;
  limit?: number;
}

export interface PaginatedResponse {
  pagination?: PaginationMeta;
}

const withPagination = (path: string, params: PaginationParams = {}) => {
  const query = new URLSearchParams();
  if (params.page) query.set("page", String(params.page));
  if (params.limit) query.set("limit", String(params.limit));
  const queryString = query.toString();
  return queryString
    ? `${path}${path.includes("?") ? "&" : "?"}${queryString}`
    : path;
};

// ─── API Helper ────────────────────────────────────────────────────────────

export async function apiFetch<T>(
  path: string,
  options: RequestInit = {},
  authToken?: string | null,
): Promise<T> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...((options.headers as Record<string, string>) || {}),
  };

  if (authToken) {
    headers["Authorization"] = `Bearer ${authToken}`;
  }

  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers,
    credentials: "include", // Include cookies for refresh token
  });

  if (!res.ok) {
    const errorBody = await res.json().catch(() => ({}));
    throw new Error(
      errorBody.message || `Request failed with status ${res.status}`,
    );
  }

  return res.json() as Promise<T>;
}

// ─── Auth API ───────────────────────────────────────────────────────────────

export interface LoginResponse {
  message: string;
  token: string;
  user: {
    _id: string;
    name: string;
    email: string;
    role: "admin" | "team" | "pdi" | "accounts" | "driver";
    portal: "production" | "transport";
    phone?: string;
  };
}

export interface RegisterResponse {
  message: string;
  user: {
    _id: string;
    name: string;
    email: string;
    role: "admin" | "team" | "pdi" | "accounts" | "driver";
    portal: "production" | "transport";
  };
}

export interface UserResponse {
  _id: string;
  name: string;
  email: string;
  role: "admin" | "team" | "pdi" | "accounts" | "driver";
  portal: "production" | "transport";
  phone?: string;
  isActive?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface UpdateUserPayload {
  name?: string;
  email?: string;
  phone?: string;
  role?: "team" | "pdi" | "accounts" | "driver";
  password?: string;
  isActive?: boolean;
}

export async function loginUser(
  email: string,
  password: string,
): Promise<LoginResponse> {
  return apiFetch<LoginResponse>("/user/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
}

export async function registerUser(
  data: {
    name: string;
    email: string;
    password: string;
    role: "admin" | "team" | "pdi";
    phone: string;
  },
  authToken?: string,
): Promise<RegisterResponse> {
  return apiFetch<RegisterResponse>(
    "/user/register",
    {
      method: "POST",
      body: JSON.stringify(data),
    },
    authToken,
  );
}

export async function logout(): Promise<{ message: string }> {
  return apiFetch<{ message: string }>("/user/logout", {
    method: "POST",
    body: JSON.stringify({}),
  });
}

export async function getCurrentUser(
  authToken: string,
): Promise<{ user: any }> {
  return apiFetch<{ user: any }>("/user/me", {}, authToken);
}

export async function updateFcmToken(
  fcmToken: string,
  authToken: string,
): Promise<{ message: string }> {
  return apiFetch<{ message: string }>(
    "/user/fcm-token",
    {
      method: "PATCH",
      body: JSON.stringify({ fcmToken }),
    },
    authToken,
  );
}

export async function getAllUsers(
  authToken: string,
  role?:
    | "team"
    | "pdi"
    | "admin"
    | { role?: string; search?: string; page?: number; limit?: number },
  params: PaginationParams = {},
): Promise<{ users: UserResponse[] } & PaginatedResponse> {
  if (typeof role === "object") {
    return apiFetch<{ users: UserResponse[] } & PaginatedResponse>(
      `/users${transportQuery(role)}`,
      {},
      authToken,
    );
  }
  const query = role ? `?role=${role}` : "";
  return apiFetch<{ users: UserResponse[] } & PaginatedResponse>(
    withPagination(`/user/all${query}`, params),
    {},
    authToken,
  );
}

export async function getUserById(
  id: string,
  authToken: string,
): Promise<{ user: UserResponse }> {
  return apiFetch<{ user: UserResponse }>(`/user/${id}`, {}, authToken);
}

export async function updateUser(
  id: string,
  data: UpdateUserPayload,
  authToken: string,
): Promise<{ message: string; user: UserResponse }> {
  const isTransportUser =
    data.isActive !== undefined ||
    data.role === "accounts" ||
    data.role === "driver";
  return apiFetch<{ message: string; user: UserResponse }>(
    isTransportUser ? `/users/${id}` : `/user/${id}`,
    {
      method: "PATCH",
      body: JSON.stringify(data),
    },
    authToken,
  );
}

export async function deleteUser(
  id: string,
  authToken: string,
): Promise<{ message: string }> {
  return apiFetch<{ message: string }>(
    `/user/${id}`,
    { method: "DELETE" },
    authToken,
  );
}

// ─── Container API ──────────────────────────────────────────────────────────

export interface ContainerResponse {
  _id: string;
  model: string;
  quantity: number;
  date: string;
  ratePerUnit: number;
  penaltyPerUnit: number;
  // Server-computed live penalty figures
  verifiedQuantity?: number;
  pendingQuantity?: number;
  totalPenalty?: number;
  assignedTeam:
    | {
        _id: string;
        name: string;
        email: string;
        phone?: string;
      }
    | string;
  status: "active" | "completed" | "cancelled";
  createdBy:
    | {
        _id: string;
        name: string;
        email: string;
      }
    | string;
  createdAt: string;
  updatedAt: string;
}

export async function createContainer(
  data: {
    model: string;
    quantity: number;
    date: string;
    ratePerUnit: number;
    penaltyPerUnit?: number;
    assignedTeam: string;
  },
  authToken: string,
): Promise<{ message: string; container: ContainerResponse }> {
  return apiFetch<{ message: string; container: ContainerResponse }>(
    "/containers",
    {
      method: "POST",
      body: JSON.stringify(data),
    },
    authToken,
  );
}

export async function updateContainer(
  id: string,
  data: Partial<{
    model: string;
    quantity: number;
    date: string;
    ratePerUnit: number;
    penaltyPerUnit: number;
    status: string;
  }>,
  authToken: string,
): Promise<{ message: string; container: ContainerResponse }> {
  return apiFetch<{ message: string; container: ContainerResponse }>(
    `/containers/${id}`,
    {
      method: "PATCH",
      body: JSON.stringify(data),
    },
    authToken,
  );
}

export async function getContainers(
  authToken: string,
  params: PaginationParams = {},
): Promise<{ containers: ContainerResponse[] } & PaginatedResponse> {
  return apiFetch<{ containers: ContainerResponse[] } & PaginatedResponse>(
    withPagination("/containers", params),
    {},
    authToken,
  );
}

export async function getContainer(
  id: string,
  authToken: string,
): Promise<{ container: ContainerResponse }> {
  return apiFetch<{ container: ContainerResponse }>(
    `/containers/${id}`,
    {},
    authToken,
  );
}

export async function updateContainerStatus(
  id: string,
  status: string,
  authToken: string,
): Promise<any> {
  return apiFetch<any>(
    `/containers/${id}/status`,
    {
      method: "PATCH",
      body: JSON.stringify({ status }),
    },
    authToken,
  );
}

export async function deleteContainer(
  id: string,
  authToken: string,
): Promise<{ message: string }> {
  return apiFetch<{ message: string }>(
    `/containers/${id}`,
    { method: "DELETE" },
    authToken,
  );
}

// ─── Production Log API ──────────────────────────────────────────────────────

export interface ProductionLogResponse {
  _id: string;
  container:
    | string
    | {
        _id: string;
        model: string;
        quantity: number;
        date: string;
        ratePerUnit: number;
        status: string;
      };
  team: string | { _id: string; name: string; email: string };
  date: string;
  reportedQuantity: number;
  verifiedQuantity: number | null;
  status: "pending" | "verified" | "incomplete";
  createdAt: string;
  updatedAt: string;
}

export async function submitProductionLog(
  data: {
    containerId: string;
    date: string;
    reportedQuantity: number;
  },
  authToken: string,
): Promise<{ message: string; log: ProductionLogResponse }> {
  return apiFetch<{ message: string; log: ProductionLogResponse }>(
    "/production-logs",
    {
      method: "POST",
      body: JSON.stringify(data),
    },
    authToken,
  );
}

export async function getProductionLogsDashboard(
  authToken: string,
): Promise<{ stats: any[] }> {
  return apiFetch<{ stats: any[] }>(
    "/production-logs/dashboard",
    {},
    authToken,
  );
}

export async function getPendingProductionLogs(
  authToken: string,
  params: PaginationParams = {},
): Promise<{ logs: ProductionLogResponse[] } & PaginatedResponse> {
  return apiFetch<{ logs: ProductionLogResponse[] } & PaginatedResponse>(
    withPagination("/production-logs/pending", params),
    {},
    authToken,
  );
}

export async function getProductionLogsByContainer(
  containerId: string,
  authToken: string,
  params: PaginationParams = {},
): Promise<
  {
    logs: ProductionLogResponse[];
    totalReported: number;
    totalVerified: number;
  } & PaginatedResponse
> {
  return apiFetch<any>(
    withPagination(`/production-logs/container/${containerId}`, params),
    {},
    authToken,
  );
}

export async function getProductionLogById(
  logId: string,
  authToken: string,
): Promise<{ log: ProductionLogResponse }> {
  return apiFetch<{ log: ProductionLogResponse }>(
    `/production-logs/${logId}`,
    {},
    authToken,
  );
}

export async function updateProductionLog(
  logId: string,
  data: Partial<{ reportedQuantity: number; date: string }>,
  authToken: string,
): Promise<{ message: string; log: ProductionLogResponse }> {
  return apiFetch<{ message: string; log: ProductionLogResponse }>(
    `/production-logs/${logId}`,
    {
      method: "PATCH",
      body: JSON.stringify(data),
    },
    authToken,
  );
}

export async function deleteProductionLog(
  logId: string,
  authToken: string,
): Promise<{ message: string; logId: string }> {
  return apiFetch<{ message: string; logId: string }>(
    `/production-logs/${logId}`,
    { method: "DELETE" },
    authToken,
  );
}

// ─── PDI Verification API ────────────────────────────────────────────────────

export interface PDIVerificationResponse {
  _id: string;
  productionLog:
    | string
    | { _id: string; date: string; reportedQuantity: number };
  container: string | { _id: string; model: string };
  verifiedBy?: {
    _id: string;
    name: string;
    email: string;
  };
  verifiedQuantity: number;
  isIncomplete: boolean;
  missingQuantity?: number;
  remarks?: string;
  verifiedAt: string;
  createdAt: string;
  updatedAt: string;
}

export async function getPDIDashboard(
  authToken: string,
  params: PaginationParams = {},
): Promise<
  {
    pendingCount: number;
    totalPenalty: number;
    totalPendingVehicles: number;
    recentVerifications: any[];
  } & PaginatedResponse
> {
  return apiFetch<any>(withPagination("/pdi/dashboard", params), {}, authToken);
}

export async function unverifyProductionLog(
  logId: string,
  authToken: string,
): Promise<{ message: string; logId: string }> {
  return apiFetch<{ message: string; logId: string }>(
    `/pdi/log/${logId}`,
    { method: "DELETE" },
    authToken,
  );
}

export async function verifyProductionLog(
  logId: string,
  data: {
    verifiedQuantity: number;
    isIncomplete: boolean;
    missingQuantity?: number;
    remarks?: string;
  },
  authToken: string,
): Promise<{ message: string; verification: PDIVerificationResponse }> {
  return apiFetch<any>(
    `/pdi/log/${logId}`,
    {
      method: "POST",
      body: JSON.stringify(data),
    },
    authToken,
  );
}

export async function getPDIVerificationByLog(
  logId: string,
  authToken: string,
): Promise<{ verification: PDIVerificationResponse }> {
  return apiFetch<any>(`/pdi/log/${logId}`, {}, authToken);
}

export async function getPDIVerificationsByContainer(
  containerId: string,
  authToken: string,
  params: PaginationParams = {},
): Promise<
  {
    verifications: PDIVerificationResponse[];
    totalVerified: number;
  } & PaginatedResponse
> {
  return apiFetch<any>(
    withPagination(`/pdi/container/${containerId}`, params),
    {},
    authToken,
  );
}

// ─── Payment API ─────────────────────────────────────────────────────────────

export interface PaymentResponse {
  _id: string;
  container: {
    _id: string;
    model: string;
    quantity: number;
    ratePerUnit: number;
    status: string;
    date: string;
  };
  team: {
    _id: string;
    name: string;
    email: string;
    phone?: string;
  };
  totalVerifiedQuantity: number;
  totalAmount: number;
  paidAmount: number;
  remainingAmount: number;
  // Live hold/penalty for the container (pending vehicles × hold per vehicle)
  pendingQuantity?: number;
  penaltyPerUnit?: number;
  totalPenalty?: number;
  payments: Array<{
    amount: number;
    paidAt: string;
    note?: string;
  }>;
}

export async function getAllPayments(
  authToken: string,
  params: PaginationParams = {},
): Promise<{ payments: PaymentResponse[] } & PaginatedResponse> {
  return apiFetch<{ payments: PaymentResponse[] } & PaginatedResponse>(
    withPagination("/payments", params),
    {},
    authToken,
  );
}

export async function getMyPayments(
  authToken: string,
  params: PaginationParams = {},
): Promise<
  {
    payments: PaymentResponse[];
    summary: { totalEarned: number; totalPaid: number; totalRemaining: number };
  } & PaginatedResponse
> {
  return apiFetch<any>(withPagination("/payments/my", params), {}, authToken);
}

export async function getContainerPayment(
  containerId: string,
  authToken: string,
): Promise<{ payment: PaymentResponse }> {
  return apiFetch<{ payment: PaymentResponse }>(
    `/payments/container/${containerId}`,
    {},
    authToken,
  );
}

export async function getContainerPaymentSummary(
  containerId: string,
  authToken: string,
): Promise<{ payment: PaymentResponse }> {
  return apiFetch<{ payment: PaymentResponse }>(
    `/payments/container/${containerId}/summary`,
    {},
    authToken,
  );
}

export async function recordPayment(
  containerId: string,
  data: {
    amount: number;
    note?: string;
  },
  authToken: string,
): Promise<{ message: string; payment: PaymentResponse }> {
  return apiFetch<any>(
    `/payments/container/${containerId}/pay`,
    {
      method: "POST",
      body: JSON.stringify(data),
    },
    authToken,
  );
}

// Edit a recorded payment transaction by its index in the ledger's payments[]
export async function updatePaymentEntry(
  containerId: string,
  index: number,
  data: { amount?: number; note?: string },
  authToken: string,
): Promise<{ message: string; payment: PaymentResponse }> {
  return apiFetch<any>(
    `/payments/container/${containerId}/pay/${index}`,
    {
      method: "PATCH",
      body: JSON.stringify(data),
    },
    authToken,
  );
}

// Delete a recorded payment transaction by its index in the ledger's payments[]
export async function deletePaymentEntry(
  containerId: string,
  index: number,
  authToken: string,
): Promise<{ message: string; payment: PaymentResponse }> {
  return apiFetch<any>(
    `/payments/container/${containerId}/pay/${index}`,
    { method: "DELETE" },
    authToken,
  );
}

// ─── Miscellaneous API ───────────────────────────────────────────────────────

export interface MiscellaneousEntry {
  _id: string;
  amount: number;
  note?: string;
  createdBy?: { _id: string; name: string; email: string } | string;
  createdAt: string;
}

export async function getMiscellaneous(
  authToken: string,
  params: PaginationParams = {},
): Promise<
  {
    entries: MiscellaneousEntry[];
    totalMiscellaneous: number;
  } & PaginatedResponse
> {
  return apiFetch<any>(withPagination("/miscellaneous", params), {}, authToken);
}

export async function addMiscellaneous(
  data: { amount: number; note?: string },
  authToken: string,
): Promise<{
  message: string;
  entry: MiscellaneousEntry;
  totalMiscellaneous: number;
}> {
  return apiFetch<any>(
    "/miscellaneous",
    {
      method: "POST",
      body: JSON.stringify(data),
    },
    authToken,
  );
}

export async function updateMiscellaneous(
  id: string,
  data: { amount?: number; note?: string },
  authToken: string,
): Promise<{
  message: string;
  entry: MiscellaneousEntry;
  totalMiscellaneous: number;
}> {
  return apiFetch<any>(
    `/miscellaneous/${id}`,
    {
      method: "PATCH",
      body: JSON.stringify(data),
    },
    authToken,
  );
}

export async function deleteMiscellaneous(
  id: string,
  authToken: string,
): Promise<{ message: string; totalMiscellaneous: number }> {
  return apiFetch<any>(`/miscellaneous/${id}`, { method: "DELETE" }, authToken);
}

// ─── Admin Insights API ─────────────────────────────────────────────────────

export interface AdminDashboardSummary {
  totalProduction: number;
  pendingVerify: number;
  totalAmount: number;
  paidAmount: number;
  miscellaneousAmount: number;
  remainingAmount: number;
  totalPenalty: number;
  totalPendingVehicles: number;
}

export async function getAdminDashboardSummary(
  authToken: string,
): Promise<AdminDashboardSummary> {
  return apiFetch<AdminDashboardSummary>(
    "/admin/dashboard-summary",
    {},
    authToken,
  );
}

export type AdminActivityType =
  | "production_log"
  | "pdi_verification"
  | "payment";

export interface AdminMonitorResponse {
  activeContainers: number;
  totalTeams: number;
  totalPdiUsers: number;
  todayLogs: number;
  todayVerified: number;
  todayPending: number;
  recentActivity: Array<{
    type: AdminActivityType;
    description: string;
    timestamp: string;
  }>;
}

export async function getAdminMonitor(
  authToken: string,
): Promise<AdminMonitorResponse> {
  return apiFetch<AdminMonitorResponse>("/admin/monitor", {}, authToken);
}

export interface AdminReportLog {
  _id: string;
  date: string;
  container: { _id: string; model: string; ratePerUnit: number };
  team: { _id: string; name: string };
  reportedQuantity: number;
  verifiedQuantity: number | null;
  status: "pending" | "verified" | "incomplete";
  missingQuantity?: number;
  remarks?: string;
}

export interface AdminReportResponse {
  summary: {
    totalReported: number;
    totalVerified: number;
    totalIncomplete: number;
    totalAmount: number;
    totalPaid: number;
    totalRemaining: number;
  };
  logs: AdminReportLog[];
  pagination: PaginationMeta;
}

export interface AdminReportExportResponse {
  logs: AdminReportLog[];
  total: number;
  filters: {
    startDate: string | null;
    endDate: string | null;
    teamId: string | null;
  };
}

export async function getAdminReport(
  authToken: string,
  params: {
    startDate?: string;
    endDate?: string;
    teamId?: string;
    page?: number;
    limit?: number;
  },
): Promise<AdminReportResponse> {
  const query = new URLSearchParams();
  if (params.startDate) query.set("startDate", params.startDate);
  if (params.endDate) query.set("endDate", params.endDate);
  if (params.teamId) query.set("teamId", params.teamId);
  if (params.page) query.set("page", String(params.page));
  if (params.limit) query.set("limit", String(params.limit));
  const qs = query.toString();
  return apiFetch<AdminReportResponse>(
    `/admin/report${qs ? `?${qs}` : ""}`,
    {},
    authToken,
  );
}

// ─── Notifications API ──────────────────────────────────────────────────────

export async function getAdminReportExport(
  authToken: string,
  params: {
    startDate?: string;
    endDate?: string;
    teamId?: string;
  },
): Promise<AdminReportExportResponse> {
  const query = new URLSearchParams();
  if (params.startDate) query.set("startDate", params.startDate);
  if (params.endDate) query.set("endDate", params.endDate);
  if (params.teamId) query.set("teamId", params.teamId);
  const qs = query.toString();
  return apiFetch<AdminReportExportResponse>(
    `/admin/report/export${qs ? `?${qs}` : ""}`,
    {},
    authToken,
  );
}

export interface NotificationItem {
  _id: string;
  type: string;
  title: string;
  body: string;
  data: Record<string, string>;
  isRead: boolean;
  createdAt: string;
}

export interface NotificationsResponse {
  notifications: NotificationItem[];
  pagination: PaginationMeta;
}

export async function getNotifications(
  authToken: string,
  page = 1,
): Promise<NotificationsResponse> {
  return apiFetch<NotificationsResponse>(
    `/notifications?page=${page}`,
    {},
    authToken,
  );
}

export async function markAllNotificationsRead(
  authToken: string,
): Promise<{ message: string }> {
  return apiFetch<{ message: string }>(
    "/notifications/read-all",
    { method: "POST" },
    authToken,
  );
}

// ─── Team History API ───────────────────────────────────────────────────────

export interface TeamHistoryLog {
  _id: string;
  date: string;
  container: {
    _id: string;
    model: string;
    ratePerUnit: number;
    quantity: number;
  };
  reportedQuantity: number;
  verifiedQuantity: number | null;
  status: "pending" | "verified" | "incomplete";
  remainingTarget: number;
  pdiVerification?: {
    verifiedQuantity: number;
    isIncomplete: boolean;
    missingQuantity: number;
    remarks: string;
  };
}

export interface TeamHistoryResponse {
  logs: TeamHistoryLog[];
  pagination: PaginationMeta;
}

export async function getTeamHistory(
  authToken: string,
  params: { month?: string; date?: string; page?: number },
): Promise<TeamHistoryResponse> {
  const query = new URLSearchParams();
  if (params.month) query.set("month", params.month);
  if (params.date) query.set("date", params.date);
  if (params.page) query.set("page", String(params.page));
  const qs = query.toString();
  return apiFetch<TeamHistoryResponse>(
    `/production-logs/history${qs ? `?${qs}` : ""}`,
    {},
    authToken,
  );
}

// ─── PDI: edit a verification ───────────────────────────────────────────────

export async function editVerification(
  verificationId: string,
  payload: { verifiedQuantity: number; remarks?: string },
  authToken: string,
): Promise<{ message: string; verification: PDIVerificationResponse }> {
  return apiFetch<{ message: string; verification: PDIVerificationResponse }>(
    `/pdi/verification/${verificationId}`,
    { method: "PATCH", body: JSON.stringify(payload) },
    authToken,
  );
}

// Transport API. These use the compatibility routes served by the shared backend.
const transportQuery = (params: object) => {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "")
      query.set(key, String(value));
  });
  const value = query.toString();
  return value ? `?${value}` : "";
};

export const createUser = (
  data: {
    name: string;
    email: string;
    password: string;
    role: string;
    phone?: string;
    vehicleNumber?: string;
  },
  token: string,
) =>
  apiFetch<{ message: string; user: UserResponse }>(
    "/users",
    { method: "POST", body: JSON.stringify(data) },
    token,
  );

export const createDriver = (
  data: { name: string; vehicleNumber: string; userId?: string | null },
  token: string,
) =>
  apiFetch<{ message: string; driver: Driver }>(
    "/drivers",
    { method: "POST", body: JSON.stringify(data) },
    token,
  );

export const getAllDrivers = (
  token: string,
  params: { search?: string; isActive?: boolean } & PaginationParams = {},
) =>
  apiFetch<{ drivers: Driver[]; pagination: PaginationMeta }>(
    `/drivers${transportQuery(params)}`,
    {},
    token,
  );

export const getDriverById = (id: string, token: string) =>
  apiFetch<{ driver: Driver }>(`/drivers/${id}`, {}, token);

export const getDriverSummary = (
  id: string,
  token: string,
  params: PaginationParams = {},
) =>
  apiFetch<DriverSummary>(
    `/drivers/${id}/summary${transportQuery(params)}`,
    {},
    token,
  );

export const updateDriver = (
  id: string,
  data: Partial<Driver>,
  token: string,
) =>
  apiFetch<{ message: string; driver: Driver }>(
    `/drivers/${id}`,
    { method: "PATCH", body: JSON.stringify(data) },
    token,
  );

export const deleteDriver = (id: string, token: string) =>
  apiFetch<{ message: string }>(`/drivers/${id}`, { method: "DELETE" }, token);

export interface CreateVisitPayload {
  driverId: string;
  destination: string;
  startDate: string;
  endDate: string;
  quantity?: number;
  billNumber?: string;
  distance?: number;
  vehicleNumber?: string;
}

export const createVisit = (data: CreateVisitPayload, token: string) =>
  apiFetch<{ message: string; visit: Visit }>(
    "/visits",
    { method: "POST", body: JSON.stringify(data) },
    token,
  );

export const getAllVisits = (
  token: string,
  params: {
    driverId?: string;
    search?: string;
    startDate?: string;
    endDate?: string;
    month?: number;
    year?: number;
  } & PaginationParams = {},
) =>
  apiFetch<{ visits: Visit[]; pagination: PaginationMeta }>(
    `/visits${transportQuery(params)}`,
    {},
    token,
  );

export const getVisitById = (id: string, token: string) =>
  apiFetch<{ visit: Visit; expense: Expense | null }>(
    `/visits/${id}`,
    {},
    token,
  );

export const updateVisit = (
  id: string,
  data: Partial<CreateVisitPayload>,
  token: string,
) =>
  apiFetch<{ message: string; visit: Visit }>(
    `/visits/${id}`,
    { method: "PATCH", body: JSON.stringify(data) },
    token,
  );

export const deleteVisit = (id: string, token: string) =>
  apiFetch<{ message: string }>(`/visits/${id}`, { method: "DELETE" }, token);

export interface ExpenseItemPayload {
  amount: number;
  paidBy: "driver" | "company";
  description?: string;
}
export interface UpsertExpensePayload {
  food?: ExpenseItemPayload;
  cng?: ExpenseItemPayload;
  other?: ExpenseItemPayload & { description: string };
}

export const upsertExpense = (
  visitId: string,
  data: UpsertExpensePayload,
  token: string,
) =>
  apiFetch<{ message: string; expense: Expense }>(
    `/expenses/visit/${visitId}`,
    { method: "POST", body: JSON.stringify(data) },
    token,
  );

export const getExpenseByVisit = (visitId: string, token: string) =>
  apiFetch<{ expense: Expense }>(`/expenses/visit/${visitId}`, {}, token);

export const getPendingExpenses = (token: string) =>
  apiFetch<{ expenses: (Expense & { visit: Visit })[] }>(
    "/expenses/pending",
    {},
    token,
  );

export const approveExpenseItem = (
  expenseId: string,
  type: "food" | "cng" | "other",
  token: string,
) =>
  apiFetch<{ message: string; expense: Expense }>(
    `/expenses/${expenseId}/approve`,
    { method: "POST", body: JSON.stringify({ type }) },
    token,
  );

export const rejectExpenseItem = (
  expenseId: string,
  type: "food" | "cng" | "other",
  remark: string,
  token: string,
) =>
  apiFetch<{ message: string; expense: Expense }>(
    `/expenses/${expenseId}/reject`,
    { method: "POST", body: JSON.stringify({ type, remark }) },
    token,
  );

export const getAdminDashboard = (
  token: string,
  params: {
    startDate?: string;
    endDate?: string;
    month?: number;
    year?: number;
  } = {},
) =>
  apiFetch<AdminDashboard>(
    `/dashboard/admin${transportQuery(params)}`,
    {},
    token,
  );

export const getAccountsDashboard = (
  token: string,
  params: {
    startDate?: string;
    endDate?: string;
    month?: number;
    year?: number;
  } = {},
) =>
  apiFetch<AccountsDashboard>(
    `/dashboard/accounts${transportQuery(params)}`,
    {},
    token,
  );

export const getDriverDashboard = (
  driverId: string,
  token: string,
  params: { startDate?: string; endDate?: string } = {},
) =>
  apiFetch<DriverDashboard>(
    `/dashboard/driver/${driverId}${transportQuery(params)}`,
    {},
    token,
  );

export const getMyDriverDashboard = (
  token: string,
  params: { startDate?: string; endDate?: string } = {},
) =>
  apiFetch<DriverDashboard>(
    `/dashboard/driver/me${transportQuery(params)}`,
    {},
    token,
  );

export const getVisitReport = (
  token: string,
  params: { driverId?: string; startDate?: string; endDate?: string } = {},
) =>
  apiFetch<{
    report: (Visit & { expense: Expense | null })[];
    totals: {
      totalVisits: number;
      totalDistance: number;
      totalExpense: number;
      pendingReimbursement: number;
      approvedReimbursement: number;
    };
  }>(`/reports/visits${transportQuery(params)}`, {}, token);
