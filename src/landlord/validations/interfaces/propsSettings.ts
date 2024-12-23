import { LatePaymentFeeType, SettingType, PropsSettingType, Refundability } from "@prisma/client";
import { ListingType, ShortletType } from "@prisma/client";
export interface IPropApartmentSettings {
    id?: string;
    propertyId: string;
    landlordId?: string;
    apartmentId?: string;
    // late fee
    lateFee?: number;
    lateFeeFrequency?: LatePaymentFeeType;
    lateFeePercentage?: number;
    gracePeriodDays?: number;
    // security deposit
    depositPercentage?: number;
    refundTimeframe?: string;
    // application fee
    applicationFee?: number;
    refundPolicy?: Refundability;

    settingType: PropsSettingType;

    createdAt?: Date;
    updatedAt?: Date;
}

export interface IGlobalSetting {
    id: string;
    percentageOrAmount?: number;
    type: SettingType;
    landlordId?: string | null;
}

export interface PropertyListingDTO {
    payApplicationFee: boolean;
    isShortlet: boolean;
    shortletDuration?: ShortletType;
    type: ListingType;
    propertyId?: string;
    apartmentId?: string;
}

export interface UpdateListingStatusDTO {
    isLeased: boolean;
}