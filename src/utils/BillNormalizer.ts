/**
 * Bill Normalizer
 * Adds computed fields to bills for better clarity and UI display
 */

export type BillScope = 'TENANT_SPECIFIC' | 'PROPERTY_ALL_TENANTS' | 'LANDLORD_ALL_TENANTS';

export interface NormalizedBill {
    // All original bill fields
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
    
    // Relations (if included)
    property?: any;
    landlord?: any;
    tenants?: any;
    bills?: any;
    transactions?: any[];
    
    // NEW: Computed fields for clarity
    billScope: BillScope;
    scopeDescription: string; // Human-readable description
    appliesTo: {
        type: 'tenant' | 'property' | 'landlord';
        id: string | null;
        name: string | null;
    };
}

/**
 * Bill Normalizer Class
 * Adds computed scope information to bills
 */
export class BillNormalizer {
    /**
     * Normalize a single bill
     * @param bill - The raw bill object from database
     */
    static normalize(bill: any): NormalizedBill {
        const { billScope, scopeDescription, appliesTo } = this.computeBillScope(bill);
        
        return {
            ...bill,
            amount: this.convertDecimalToString(bill.amount) || '0',
            billScope,
            scopeDescription,
            appliesTo,
        };
    }
    
    /**
     * Normalize multiple bills
     */
    static normalizeMany(bills: any[]): NormalizedBill[] {
        return bills.map(bill => this.normalize(bill));
    }
    
    /**
     * Compute bill scope based on tenantId, propertyId, and landlordId
     * Priority: tenantId > propertyId > landlordId
     */
    private static computeBillScope(bill: any): {
        billScope: BillScope;
        scopeDescription: string;
        appliesTo: NormalizedBill['appliesTo'];
    } {
        // TENANT_SPECIFIC: If tenantId is set
        if (bill.tenantId) {
            const tenantName = bill.tenants?.user?.profile?.fullname 
                || bill.tenants?.personalInfo?.fullName
                || bill.tenants?.tenantCode
                || 'Tenant';
            
            return {
                billScope: 'TENANT_SPECIFIC',
                scopeDescription: `Assigned to ${tenantName}`,
                appliesTo: {
                    type: 'tenant',
                    id: bill.tenantId,
                    name: tenantName,
                },
            };
        }
        
        // PROPERTY_ALL_TENANTS: If propertyId is set (without tenantId)
        if (bill.propertyId) {
            const propertyName = bill.property?.name || 'Property';
            
            return {
                billScope: 'PROPERTY_ALL_TENANTS',
                scopeDescription: `Applies to all tenants in ${propertyName}`,
                appliesTo: {
                    type: 'property',
                    id: bill.propertyId,
                    name: propertyName,
                },
            };
        }
        
        // LANDLORD_ALL_TENANTS: If landlordId is set (without propertyId/tenantId)
        if (bill.landlordId) {
            const landlordName = bill.landlord?.user?.profile?.fullname 
                || bill.landlord?.landlordCode
                || 'Landlord';
            
            return {
                billScope: 'LANDLORD_ALL_TENANTS',
                scopeDescription: `Applies to all tenants across all properties`,
                appliesTo: {
                    type: 'landlord',
                    id: bill.landlordId,
                    name: landlordName,
                },
            };
        }
        
        // Fallback (shouldn't happen, but handle gracefully)
        return {
            billScope: 'LANDLORD_ALL_TENANTS',
            scopeDescription: 'Bill scope not specified',
            appliesTo: {
                type: 'landlord',
                id: null,
                name: null,
            },
        };
    }
    
    /**
     * Convert Prisma Decimal to string
     */
    private static convertDecimalToString(value: any): string | null {
        if (value === null || value === undefined) return null;
        if (typeof value === 'string') return value;
        if (typeof value === 'number') return String(value);
        // Prisma Decimal
        if (value.toString) return value.toString();
        return null;
    }
}
