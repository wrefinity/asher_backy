import { Currency } from '@prisma/client';

export interface IBankInfo {
    id?: string;
    landlordId?: string;
    vendorId?: string;
    bankName: string;
    accountNumber: string;
    accountName: string;
    currency?: Currency;
    country?: string;
    paystackRecipientCode?: string;
    isDefault?: boolean;
}
