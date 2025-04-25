import { LatePaymentFeeType, SettingType, PropsSettingType, Refundability, PropertyType, PriceFrequency, PropertySpecificationType } from "@prisma/client";
import { ListingType,  } from "@prisma/client";
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
    type?: ListingType;
    listAs: PropertySpecificationType;
    propertyId?: string;
    apartmentId?: string;

    propertySubType: PropertyType,
    priceFrequency: PriceFrequency,
    price: number,
    securityDeposit?: number,
    minStayDays?: number,
    maxStayDays?: number,
    availableFrom?: Date,
    availableTo?: Date,
}

export interface UpdateListingStatusDTO {
    isLeased: boolean;
}