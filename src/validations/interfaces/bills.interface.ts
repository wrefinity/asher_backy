import { PaymentFrequency, PayableBy, PriceFrequency, LatePaymentFeeType, Transaction } from '@prisma/client';

export interface OverdueAnalysis {
  tenant: {
    id: string;
    name: string;
    email: string;
  };
  property: {
    id: string;
    name: string;
    address: string;
  };
  unit?: {
    id: string;
    unitType: string;
    unitNumber?: string;
  };
  room?: {
    id: string;
    roomName: string;
  };
  leaseInfo: {
    startDate: Date;
    endDate: Date;
    isCurrentLease: boolean;
    rentAmount: number;
    rentFrequency: PriceFrequency;
  };
  overdueBills: OverdueBill[];
  overdueRent: OverdueRent[];
  summary: {
    totalOverdueAmount: number;
    totalOverdueBills: number;
    totalOverdueRent: number;
    mostOverdueDays: number;
    gracePeriodDays?: number;
    lateFeeSettings?: LateFeeSettings;
  };
}

export interface OverdueBill {
  id: string;
  billName: string;
  billCategory: string;
  amount: number;
  dueDate: Date;
  frequency: PaymentFrequency;
  payableBy: PayableBy;
  daysOverdue: number;
  lateFeeAmount: number;
  totalAmountDue: number;
  lastPaidDate?: Date;
  nextDueDate?: Date;
  transactionHistory: Transaction[];
}

export interface OverdueRent {
  period: string;
  dueDate: Date;
  amount: number;
  daysOverdue: number;
  lateFeeAmount: number;
  totalAmountDue: number;
  status: 'overdue' | 'partial' | 'unpaid';
  paidAmount?: number;
}

export interface LateFeeSettings {
  lateFee: number;
  lateFeeFrequency: LatePaymentFeeType;
  lateFeePercentage?: number;
  gracePeriodDays?: number;
}

export interface PaymentFrequencyCalc {
  milliseconds: number;
  description: string;
}