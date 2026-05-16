// ─── API Configuration ─────────────────────────────────────────────────────
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
  return queryString ? `${path}${path.includes("?") ? "&" : "?"}${queryString}` : path;
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
    role: "admin" | "team" | "pdi";
    phone?: string;
  };
}

export interface RegisterResponse {
  message: string;
  user: {
    _id: string;
    name: string;
    email: string;
    role: "admin" | "team" | "pdi";
  };
}

export interface UserResponse {
  _id: string;
  name: string;
  email: string;
  role: "admin" | "team" | "pdi";
  phone?: string;
  createdAt: string;
  updatedAt: string;
}

export interface UpdateUserPayload {
  name: string;
  email: string;
  phone: string;
  role: "team" | "pdi";
  password?: string;
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
  role?: "team" | "pdi" | "admin",
  params: PaginationParams = {},
): Promise<{ users: UserResponse[] } & PaginatedResponse> {
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
  return apiFetch<{ message: string; user: UserResponse }>(
    `/user/${id}`,
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
): Promise<{
  logs: ProductionLogResponse[];
  totalReported: number;
  totalVerified: number;
} & PaginatedResponse> {
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
): Promise<{ pendingCount: number; recentVerifications: any[] } & PaginatedResponse> {
  return apiFetch<any>(withPagination("/pdi/dashboard", params), {}, authToken);
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
): Promise<{
  verifications: PDIVerificationResponse[];
  totalVerified: number;
} & PaginatedResponse> {
  return apiFetch<any>(withPagination(`/pdi/container/${containerId}`, params), {}, authToken);
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

export async function getMyPayments(authToken: string, params: PaginationParams = {}): Promise<{
  payments: PaymentResponse[];
  summary: { totalEarned: number; totalPaid: number; totalRemaining: number };
} & PaginatedResponse> {
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
