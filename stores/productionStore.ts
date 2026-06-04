import * as API from "@/lib/api";
import { create } from "zustand";

// API Response types (mapped from backend)
export interface Team {
  _id: string;
  name: string;
  email: string;
  role: "team" | "pdi";
  phone?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Container {
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
  assignedTeam: string | { _id: string; name: string; email: string };
  status: "active" | "completed" | "cancelled";
  createdBy: string | { _id: string; name: string; email: string };
  createdAt: string;
  updatedAt: string;
}

export interface ProductionLog {
  _id: string;
  container: string | { _id: string; model?: string; penaltyPerUnit?: number; quantity?: number; ratePerUnit?: number };
  team: string | { _id: string; name: string; email?: string };
  date: string;
  reportedQuantity: number;
  verifiedQuantity: number | null;
  status: "pending" | "verified" | "incomplete";
  createdAt: string;
  updatedAt: string;
}

export interface PDIVerification {
  _id: string;
  productionLog: string | { _id: string; date?: string; reportedQuantity?: number };
  container: string | { _id: string; model?: string; penaltyPerUnit?: number; quantity?: number };
  verifiedBy?: string;
  verifiedQuantity: number;
  isIncomplete: boolean;
  missingQuantity?: number;
  remarks?: string;
  verifiedAt: string;
  createdAt: string;
  updatedAt: string;
}

export interface Payment {
  _id: string;
  container: string | Container;
  team: string | Team;
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

const PAGE_SIZE = 20;
const emptyPagination = {
  page: 0,
  limit: PAGE_SIZE,
  total: 0,
  totalPages: 0,
  hasNextPage: true,
};

const mergeById = <T extends { _id: string }>(existing: T[], incoming: T[]) =>
  Array.from(new Map([...existing, ...incoming].map((item) => [item._id, item])).values());

interface ProductionState {
  // Data
  teams: Team[];
  containers: Container[];
  productionLogs: ProductionLog[];
  pdiVerifications: PDIVerification[];
  pdiPendingCount: number;
  pdiTotalPenalty: number;
  pdiTotalPendingVehicles: number;
  payments: Payment[];
  containersPagination: API.PaginationMeta;
  teamsPagination: API.PaginationMeta;
  paymentsPagination: API.PaginationMeta;
  myPaymentsPagination: API.PaginationMeta;
  pendingVerificationsPagination: API.PaginationMeta;
  pdiDashboardPagination: API.PaginationMeta;

  // Loading states
  loading: boolean;
  error: string | null;

  // Actions
  fetchTeams: (authToken: string, page?: number) => Promise<void>;
  createTeam: (
    name: string,
    email: string,
    password: string,
    role: "team" | "pdi",
    phone: string,
    authToken: string,
  ) => Promise<void>;
  updateTeam: (
    id: string,
    data: {
      name: string;
      email: string;
      phone: string;
      role: "team" | "pdi";
      password?: string;
    },
    authToken: string,
  ) => Promise<void>;
  deleteTeam: (id: string, authToken: string) => Promise<void>;

  fetchContainers: (authToken: string, page?: number) => Promise<void>;
  createContainer: (
    model: string,
    quantity: number,
    date: string,
    ratePerUnit: number,
    penaltyPerUnit: number,
    assignedTeamId: string,
    authToken: string,
  ) => Promise<void>;
  updateContainerStatus: (
    containerId: string,
    status: string,
    authToken: string,
  ) => Promise<void>;
  updateContainer: (
    containerId: string,
    data: Partial<{
      model: string;
      quantity: number;
      date: string;
      ratePerUnit: number;
      penaltyPerUnit: number;
      status: string;
    }>,
    authToken: string,
  ) => Promise<void>;

  fetchProductionLogs: (authToken: string) => Promise<void>;
  submitProductionLog: (
    containerId: string,
    date: string,
    reportedQuantity: number,
    authToken: string,
  ) => Promise<void>;
  fetchLogsByContainer: (
    containerId: string,
    authToken: string,
    page?: number,
  ) => Promise<void>;

  fetchPendingVerifications: (authToken: string, page?: number) => Promise<void>;
  fetchPDIDashboard: (authToken: string, page?: number) => Promise<void>;
  verifyProductionLog: (
    logId: string,
    verifiedQuantity: number,
    isIncomplete: boolean,
    remarks?: string,
    authToken?: string,
  ) => Promise<void>;
  unverifyProductionLog: (logId: string, authToken: string) => Promise<void>;
  fetchVerificationsByContainer: (
    containerId: string,
    authToken: string,
    page?: number,
  ) => Promise<void>;

  fetchPayments: (authToken: string, page?: number) => Promise<void>;
  fetchMyPayments: (authToken: string, page?: number) => Promise<void>;
  recordPayment: (
    containerId: string,
    amount: number,
    note: string,
    authToken: string,
  ) => Promise<void>;

  // Helpers
  getContainerById: (id: string) => Container | undefined;
  getTeamById: (id: string) => Team | undefined;
}

export const useProductionStore = create<ProductionState>()((set, get) => ({
  // Initial state
  teams: [],
  containers: [],
  productionLogs: [],
  pdiVerifications: [],
  pdiPendingCount: 0,
  pdiTotalPenalty: 0,
  pdiTotalPendingVehicles: 0,
  payments: [],
  containersPagination: emptyPagination,
  teamsPagination: emptyPagination,
  paymentsPagination: emptyPagination,
  myPaymentsPagination: emptyPagination,
  pendingVerificationsPagination: emptyPagination,
  pdiDashboardPagination: emptyPagination,
  loading: false,
  error: null,

  // Fetch all teams (admin only)
  fetchTeams: async (authToken, page = 1) => {
    set({ loading: true, error: null });
    try {
      const [productionResponse, pdiResponse] = await Promise.all([
        API.getAllUsers(authToken, "team", { page, limit: PAGE_SIZE }),
        API.getAllUsers(authToken, "pdi", { page, limit: PAGE_SIZE }),
      ]);

      const incomingTeams = [
          ...(productionResponse.users as Team[]),
          ...(pdiResponse.users as Team[]),
        ];
      set((state) => ({
        teams: page === 1 ? incomingTeams : mergeById(state.teams, incomingTeams),
        teamsPagination: {
          page,
          limit: PAGE_SIZE,
          total: (productionResponse.pagination?.total ?? 0) + (pdiResponse.pagination?.total ?? 0),
          totalPages: Math.max(
            productionResponse.pagination?.totalPages ?? 0,
            pdiResponse.pagination?.totalPages ?? 0,
          ),
          hasNextPage: Boolean(
            productionResponse.pagination?.hasNextPage || pdiResponse.pagination?.hasNextPage,
          ),
        },
        loading: false,
      }));
    } catch (error: any) {
      set({ loading: false, error: error.message });
      throw error;
    }
  },

  // Create a new team (admin only)
  createTeam: async (name, email, password, role, phone, authToken) => {
    set({ loading: true, error: null });
    try {
      await API.registerUser({ name, email, password, role, phone }, authToken);
      const [productionResponse, pdiResponse] = await Promise.all([
        API.getAllUsers(authToken, "team"),
        API.getAllUsers(authToken, "pdi"),
      ]);
      set({
        teams: [
          ...(productionResponse.users as Team[]),
          ...(pdiResponse.users as Team[]),
        ],
        loading: false,
      });
    } catch (error: any) {
      set({ loading: false, error: error.message });
      throw error;
    }
  },

  // Update team/PDI user (admin only)
  updateTeam: async (id, data, authToken) => {
    set({ loading: true, error: null });
    try {
      const payload = { ...data };
      if (!payload.password) {
        delete payload.password;
      }
      const response = await API.updateUser(id, payload, authToken);
      set((state) => ({
        teams: state.teams.map((team) =>
          team._id === id ? (response.user as Team) : team,
        ),
        loading: false,
      }));
    } catch (error: any) {
      set({ loading: false, error: error.message });
      throw error;
    }
  },

  // Delete team/PDI user (admin only)
  deleteTeam: async (id, authToken) => {
    set({ loading: true, error: null });
    try {
      await API.deleteUser(id, authToken);
      set((state) => ({
        teams: state.teams.filter((team) => team._id !== id),
        loading: false,
      }));
    } catch (error: any) {
      set({ loading: false, error: error.message });
      throw error;
    }
  },

  // Fetch all containers
  fetchContainers: async (authToken, page = 1) => {
    set({ loading: true, error: null });
    try {
      const response = await API.getContainers(authToken, { page, limit: PAGE_SIZE });
      set((state) => ({
        containers:
          page === 1
            ? (response.containers as any)
            : mergeById(state.containers, response.containers as any),
        containersPagination: response.pagination ?? emptyPagination,
        loading: false,
      }));
    } catch (error: any) {
      set({ loading: false, error: error.message });
    }
  },

  // Create a new container (admin only)
  createContainer: async (
    model,
    quantity,
    date,
    ratePerUnit,
    penaltyPerUnit,
    assignedTeamId,
    authToken,
  ) => {
    set({ loading: true, error: null });
    try {
      const response = await API.createContainer(
        { model, quantity, date, ratePerUnit, penaltyPerUnit, assignedTeam: assignedTeamId },
        authToken,
      );
      set((state) => ({
        containers: [response.container as any, ...state.containers],
        loading: false,
      }));
    } catch (error: any) {
      set({ loading: false, error: error.message });
      throw error;
    }
  },

  // Update container fields (penalty / core fields) — admin only
  updateContainer: async (containerId, data, authToken) => {
    set({ loading: true, error: null });
    try {
      const response = await API.updateContainer(containerId, data, authToken);
      set((state) => ({
        containers: state.containers.map((c) =>
          c._id === containerId ? (response.container as any) : c,
        ),
        loading: false,
      }));
    } catch (error: any) {
      set({ loading: false, error: error.message });
      throw error;
    }
  },

  // Update container status (admin only)
  updateContainerStatus: async (containerId, status, authToken) => {
    set({ loading: true, error: null });
    try {
      await API.updateContainerStatus(containerId, status, authToken);
      set((state) => ({
        containers: state.containers.map((c) =>
          c._id === containerId ? { ...c, status: status as any } : c,
        ),
        loading: false,
      }));
    } catch (error: any) {
      set({ loading: false, error: error.message });
      throw error;
    }
  },

  // Fetch production logs
  fetchProductionLogs: async (authToken) => {
    set({ loading: true, error: null });
    try {
      await API.getProductionLogsDashboard(authToken);
      // This returns stats, not logs directly. We need logs by container
      set({ loading: false });
    } catch (error: any) {
      set({ loading: false, error: error.message });
    }
  },

  // Submit production log (team only)
  submitProductionLog: async (
    containerId,
    date,
    reportedQuantity,
    authToken,
  ) => {
    set({ loading: true, error: null });
    try {
      const response = await API.submitProductionLog(
        { containerId, date, reportedQuantity },
        authToken,
      );
      set((state) => ({
        productionLogs: [response.log as any, ...state.productionLogs],
        loading: false,
      }));
    } catch (error: any) {
      set({ loading: false, error: error.message });
      throw error;
    }
  },

  // Fetch logs for a specific container
  fetchLogsByContainer: async (containerId, authToken, page = 1) => {
    set({ loading: true, error: null });
    try {
      const response = await API.getProductionLogsByContainer(
        containerId,
        authToken,
        { page, limit: PAGE_SIZE },
      );
      set((state) => ({
        productionLogs: [
          ...state.productionLogs.filter(
            (existing) => !(response.logs as any[]).some((log) => log._id === existing._id),
          ),
          ...(response.logs as any),
        ],
        loading: false,
      }));
    } catch (error: any) {
      set({ loading: false, error: error.message });
    }
  },

  // Fetch pending verifications (PDI only)
  fetchPendingVerifications: async (authToken, page = 1) => {
    set({ loading: true, error: null });
    try {
      const response = await API.getPendingProductionLogs(authToken, { page, limit: PAGE_SIZE });
      set((state) => ({
        productionLogs:
          page === 1 ? (response.logs as any) : mergeById(state.productionLogs, response.logs as any),
        pdiPendingCount: response.pagination?.total ?? response.logs.length,
        pendingVerificationsPagination: response.pagination ?? emptyPagination,
        loading: false,
      }));
    } catch (error: any) {
      set({ loading: false, error: error.message });
    }
  },

  // Fetch PDI dashboard recent verifications
  fetchPDIDashboard: async (authToken, page = 1) => {
    set({ loading: true, error: null });
    try {
      const response = await API.getPDIDashboard(authToken, { page, limit: PAGE_SIZE });
      set((state) => ({
        pdiPendingCount: response.pendingCount ?? 0,
        pdiTotalPenalty: response.totalPenalty ?? 0,
        pdiTotalPendingVehicles: response.totalPendingVehicles ?? 0,
        pdiVerifications:
          page === 1
            ? (response.recentVerifications as any)
            : mergeById(state.pdiVerifications, response.recentVerifications as any),
        pdiDashboardPagination: response.pagination ?? emptyPagination,
        loading: false,
      }));
    } catch (error: any) {
      set({ loading: false, error: error.message });
    }
  },

  // Verify a production log (PDI only)
  verifyProductionLog: async (
    logId,
    verifiedQuantity,
    isIncomplete,
    remarks,
    authToken,
  ) => {
    if (!authToken) throw new Error("No auth token provided");
    set({ loading: true, error: null });
    try {
      const response = await API.verifyProductionLog(
        logId,
        { verifiedQuantity, isIncomplete, remarks },
        authToken,
      );
      set((state) => ({
        pdiVerifications: [
          response.verification as any,
          ...state.pdiVerifications,
        ],
        loading: false,
      }));
    } catch (error: any) {
      set({ loading: false, error: error.message });
      throw error;
    }
  },

  // Unverify a production log — revert to pending (PDI only)
  unverifyProductionLog: async (logId, authToken) => {
    set({ loading: true, error: null });
    try {
      await API.unverifyProductionLog(logId, authToken);
      set((state) => ({
        // Drop any verification tied to this log
        pdiVerifications: state.pdiVerifications.filter((v) => {
          const vLogId =
            typeof v.productionLog === "string" ? v.productionLog : v.productionLog._id;
          return vLogId !== logId;
        }),
        // Reflect the log back to pending locally
        productionLogs: state.productionLogs.map((l) =>
          l._id === logId ? { ...l, status: "pending", verifiedQuantity: null } : l,
        ),
        loading: false,
      }));
    } catch (error: any) {
      set({ loading: false, error: error.message });
      throw error;
    }
  },

  // Fetch verifications for a container
  fetchVerificationsByContainer: async (containerId, authToken, page = 1) => {
    set({ loading: true, error: null });
    try {
      const response = await API.getPDIVerificationsByContainer(
        containerId,
        authToken,
        { page, limit: PAGE_SIZE },
      );
      set((state) => ({
        pdiVerifications: [
          ...state.pdiVerifications.filter(
            (existing) =>
              !(response.verifications as any[]).some(
                (verification) => verification._id === existing._id,
              ),
          ),
          ...(response.verifications as any),
        ],
        loading: false,
      }));
    } catch (error: any) {
      set({ loading: false, error: error.message });
    }
  },

  // Fetch all payments (admin only)
  fetchPayments: async (authToken, page = 1) => {
    set({ loading: true, error: null });
    try {
      const response = await API.getAllPayments(authToken, { page, limit: PAGE_SIZE });
      set((state) => ({
        payments:
          page === 1 ? (response.payments as any) : mergeById(state.payments, response.payments as any),
        paymentsPagination: response.pagination ?? emptyPagination,
        loading: false,
      }));
    } catch (error: any) {
      set({ loading: false, error: error.message });
    }
  },

  // Fetch payments for logged-in production team
  fetchMyPayments: async (authToken, page = 1) => {
    set({ loading: true, error: null });
    try {
      const response = await API.getMyPayments(authToken, { page, limit: PAGE_SIZE });
      set((state) => ({
        payments:
          page === 1 ? (response.payments as any) : mergeById(state.payments, response.payments as any),
        myPaymentsPagination: response.pagination ?? emptyPagination,
        loading: false,
      }));
    } catch (error: any) {
      set({ loading: false, error: error.message });
    }
  },

  // Record a payment (admin only)
  recordPayment: async (containerId, amount, note, authToken) => {
    set({ loading: true, error: null });
    try {
      const response = await API.recordPayment(
        containerId,
        { amount, note },
        authToken,
      );
      set((state) => ({
        payments: state.payments.map((p) =>
          p._id === response.payment._id ? (response.payment as any) : p,
        ),
        loading: false,
      }));
    } catch (error: any) {
      set({ loading: false, error: error.message });
      throw error;
    }
  },

  // Helper: Get container by ID
  getContainerById: (id) => {
    return get().containers.find((c) => c._id === id);
  },

  // Helper: Get team by ID
  getTeamById: (id) => {
    return get().teams.find((t) => t._id === id);
  },
}));
