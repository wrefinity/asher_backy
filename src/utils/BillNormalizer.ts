/**
 * Bill helpers — decimal formatting and scope labels for API responses.
 */

export type BillScope = 'TENANT_SPECIFIC' | 'PROPERTY_ALL_TENANTS' | 'LANDLORD_ALL_TENANTS';

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
}

export class BillNormalizer {
  static normalize(bill: any): NormalizedBill {
    const { billScope, scopeDescription } = this.computeBillScope(bill);

    return {
      ...bill,
      amount: this.convertDecimalToString(bill.amount) || '0',
      billScope,
      scopeDescription,
    };
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
