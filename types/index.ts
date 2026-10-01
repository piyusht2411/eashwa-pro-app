export type Portal = 'production' | 'transport';
export type UserRole = 'admin' | 'team' | 'pdi' | 'accounts' | 'driver';
export type TeamType = 'production' | 'pdi';

export interface AppUser {
  _id: string;
  name: string;
  role: UserRole;
  /** Portal the session is currently working in — this is what routing follows. */
  portal?: Portal;
  /** Portal the account itself belongs to; unchanged by switching. */
  homePortal?: Portal;
  /** True for an admin who runs both portals from one account. */
  crossPortalAccess?: boolean;
  /** Portals this account may switch between. */
  availablePortals?: Portal[];
  email?: string;
  phone?: string;
  teamId?: string;
  teamName?: string;
}

export interface TeamMember {
  _id: string;
  name: string;
  phone: string;
  designation?: string;
}

export interface ManagedTeam {
  _id: string;
  name: string;
  type: TeamType;
  members: TeamMember[];
  createdAt: string;
}

export interface Container {
  _id: string;
  model: string;
  targetQuantity: number;
  date: string;
  ratePerUnit: number;
  teamId: string;
  teamName: string;
  status: 'active' | 'completed' | 'pending';
  createdAt: string;
}

export interface ProductionLog {
  _id: string;
  containerId: string;
  containerModel: string;
  teamId: string;
  teamName: string;
  date: string;
  quantity: number;
  createdAt: string;
}

export interface PDIVerification {
  _id: string;
  productionLogId: string;
  containerId: string;
  containerModel: string;
  teamName: string;
  date: string;
  reportedQuantity: number;
  verifiedQuantity: number | null;
  status: 'pending' | 'verified' | 'incomplete';
  note?: string;
  verifiedAt?: string;
}

export interface PaymentEntry {
  _id: string;
  amount: number;
  date: string;
  note?: string;
}

export interface ContainerPayment {
  _id: string;
  containerId: string;
  containerModel: string;
  teamId: string;
  teamName: string;
  totalVerifiedQty: number;
  ratePerUnit: number;
  totalAmount: number;
  paidAmount: number;
  remainingAmount: number;
  payments: PaymentEntry[];
}

// ─── Transport Specific Types ──────────────────────────────────────────
export type PaidBy = 'driver' | 'company' | 'both';
export type ExpenseStatus = 'pending' | 'approved' | 'rejected' | 'auto_approved';

export interface Driver {
  _id: string;
  name: string;
  /** Optional — a driver may be added before a vehicle is assigned. */
  vehicleNumber?: string;
  userId: string | null;
  isActive: boolean;
  createdAt?: string;
}

export interface DriverSummary {
  driver: Driver;
  summary: {
    totalVisits: number;
    totalDistance: number;
    /** Approved / auto-approved amounts only. */
    totalExpense: number;
    /** Amount still awaiting approval — excluded from totalExpense. */
    pendingExpense: number;
    approvedReimbursement: number;
    pendingReimbursement: number;
    rejectedAmount: number;
  };
  recentVisits: Visit[];
  pagination: PaginationMeta;
}

export interface Visit {
  _id: string;
  driver: Driver | string;
  vehicleNumber: string;
  destination: string;
  startDate: string;
  endDate: string;
  /** "HH:mm" (24h) when a time was picked for the start; "" or absent for date-only. */
  startTime?: string;
  /** "HH:mm" (24h) when a time was picked for the end; "" or absent for date-only. */
  endTime?: string;
  totalDays: number;
  quantity: number;
  billNumber: string;
  distance: number;
  createdBy?: AppUser | string;
  updatedBy?: AppUser | string;
  createdAt?: string;
  updatedAt?: string;
}

/** Keys of the per-type items on an {@link Expense}. */
export type ExpenseType = 'food' | 'cng' | 'diesel' | 'fastTag' | 'border' | 'other';

export interface ExpenseItem {
  /** Portion the driver paid out of pocket — the reimbursable part. */
  driverAmount: number;
  /** Portion the company paid directly — needs no approval. */
  companyAmount: number;
  /** driverAmount + companyAmount. */
  amount: number;
  /** Derived from which portions are non-zero. */
  paidBy: PaidBy;
  /** Approval state of the DRIVER portion only. */
  status: ExpenseStatus;
  approvedBy?: { name: string } | null;
  rejectedBy?: { name: string } | null;
  rejectionRemark?: string;
  approvedAt?: string | null;
  description?: string;
}

export interface Expense {
  _id: string;
  visit: string;
  driver: Driver | string;
  food: ExpenseItem;
  cng: ExpenseItem;
  /** Absent on expenses saved before these types existed. */
  diesel?: ExpenseItem;
  fastTag?: ExpenseItem;
  border?: ExpenseItem;
  other: ExpenseItem & { description: string };
  /** Approved / auto-approved amounts only. */
  totalExpense: number;
  /** Amount still awaiting approval — excluded from totalExpense. */
  pendingExpense: number;
  pendingReimbursement: number;
  approvedReimbursement: number;
  rejectedAmount: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface AdminDashboardStats {
  totalDrivers: number;
  totalVisits: number;
  totalDistance: number;
  /** Approved / auto-approved amounts only. */
  totalExpense: number;
  /** Amount still awaiting approval — excluded from totalExpense. */
  pendingExpense: number;
  pendingReimbursements: number;
  approvedReimbursements: number;
  pendingApprovals: number;
}

export interface AdminDashboard {
  stats: AdminDashboardStats;
  recentVisits: Visit[];
  recentPendingExpenses: Expense[];
}

export interface AccountsDashboard {
  stats: {
    totalDrivers: number;
    totalVisits: number;
    /** Approved / auto-approved amounts only. */
    totalExpense: number;
    /** Amount still awaiting approval — excluded from totalExpense. */
    pendingExpense: number;
    pendingReimbursements: number;
    approvedReimbursements: number;
    pendingApprovals: number;
  };
  recentVisits: Visit[];
}

export interface DriverDashboard {
  driver: Driver;
  stats: {
    totalVisits: number;
    totalDistance: number;
    /** Approved / auto-approved amounts only. */
    totalExpense: number;
    /** Amount still awaiting approval — excluded from totalExpense. */
    pendingExpense: number;
    approvedReimbursements: number;
    pendingBalance: number;
  };
  recentVisits: Visit[];
}

export interface AppNotification {
  _id: string;
  recipient: string;
  type: string;
  title: string;
  body: string;
  data: Record<string, string>;
  isRead: boolean;
  createdAt: string;
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNextPage: boolean;
}
