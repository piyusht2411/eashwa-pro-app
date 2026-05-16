export type UserRole = 'admin' | 'team' | 'pdi';
export type TeamType = 'production' | 'pdi';

export interface AppUser {
  _id: string;
  name: string;
  role: UserRole;
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
