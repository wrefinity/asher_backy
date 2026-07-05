/**
 * Bill helpers — decimal formatting and scope labels for API responses.
 */

export type BillScope = 'TENANT_SPECIFIC' | 'PROPERTY_ALL_TENANTS' | 'LANDLORD_ALL_TENANTS';

export type BillPaymentStatus = 'PAID' | 'PENDING' | 'OVERDUE';

export interface NormalizedBill {
  id: string;
  billId: string;
  billName: string;
  billCategoryId: string;
  description: string;
  amount: string | number;
  billFrequency: string;
  dueDate: string | Date;
  payableBy: string;
  propertyId: string | null;
  landlordId: string | null;
  tenantId: string | null;
  createdAt: string | Date;
  updatedAt: string | Date;
  isDeleted: boolean;
  property?: any;
  landlord?: any;
  tenants?: any;
  bills?: any;
  transactions?: any[];
  billScope: BillScope;
  scopeDescription: string;
  paidAmount: number;
  remainingAmount: number;
  status: BillPaymentStatus;
}

export class BillNormalizer {
  static normalize(bill: any): NormalizedBill {
    const { billScope, scopeDescription } = this.computeBillScope(bill);
    const amountStr = this.convertDecimalToString(bill.amount) || '0';
    const billAmount = parseFloat(amountStr);
    const paidAmount = this.getBillPaidAmount(bill);
    const remainingAmount =
      Number.isFinite(billAmount) && billAmount > 0
        ? Math.max(0, billAmount - paidAmount)
        : 0;
    const status = this.resolveBillPaymentStatus(bill, billAmount, paidAmount);

    return {
      ...bill,
      amount: amountStr,
      billScope,
      scopeDescription,
      paidAmount,
      remainingAmount,
      status,
    };
  }

  /** Sum of completed tenant debit payments applied to this bill. */
  static getBillPaidAmount(bill: { transactions?: any[] }): number {
    if (!Array.isArray(bill.transactions)) return 0;

    return bill.transactions
      .filter((tx) => tx.status === 'COMPLETED' && tx.type === 'DEBIT')
      .reduce((total, tx) => {
        const amount =
          typeof tx.amount === 'string' ? parseFloat(tx.amount) : Number(tx.amount);
        return total + (Number.isFinite(amount) ? amount : 0);
      }, 0);
  }

  static resolveBillPaymentStatus(
    bill: { dueDate?: string | Date },
    billAmount: number,
    paidAmount: number
  ): BillPaymentStatus {
    if (billAmount > 0 && paidAmount >= billAmount) {
      return 'PAID';
    }

    if (bill.dueDate) {
      const due = new Date(bill.dueDate);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      if (due < today) return 'OVERDUE';
    }

    return 'PENDING';
  }

  static normalizeMany(bills: any[]): NormalizedBill[] {
    return bills.map(bill => this.normalize(bill));
  }

  private static computeBillScope(bill: any): {
    billScope: BillScope;
    scopeDescription: string;
  } {
    if (bill.tenantId) {
      const tenantName =
        bill.tenants?.user?.profile?.fullname ||
        bill.tenants?.personalInfo?.fullName ||
        bill.tenants?.tenantCode ||
        'Tenant';

      return {
        billScope: 'TENANT_SPECIFIC',
        scopeDescription: `Assigned to ${tenantName}`,
      };
    }

    if (bill.propertyId) {
      const propertyName = bill.property?.name || 'Property';
      return {
        billScope: 'PROPERTY_ALL_TENANTS',
        scopeDescription: `Applies to all tenants in ${propertyName}`,
      };
    }

    if (bill.landlordId) {
      return {
        billScope: 'LANDLORD_ALL_TENANTS',
        scopeDescription: 'Applies across all properties',
      };
    }

    return {
      billScope: 'LANDLORD_ALL_TENANTS',
      scopeDescription: 'Bill scope not specified',
    };
  }

  private static convertDecimalToString(value: any): string | null {
    if (value === null || value === undefined) return null;
    if (typeof value === 'string') return value;
    if (typeof value === 'number') return String(value);
    if (value.toString) return value.toString();
    return null;
  }
}
