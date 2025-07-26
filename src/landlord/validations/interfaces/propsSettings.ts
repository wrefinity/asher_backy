import { LatePaymentFeeType, PropsSettingType, Refundability, PropertyType, PriceFrequency, PropertySpecificationType, RefundPolicyType, ReminderMethodType, FrequencyType } from "@prisma/client";
import { ListingType,  } from "@prisma/client";

export enum SettingType {
    SECURITY_DEPOSIT = "SECURITY_DEPOSIT",
    APPLICATION_FEE = "APPLICATION_FEE",
    RECURRING_FEE = "RECURRING_FEE"
}
export interface IPropApartmentSettings {
    id?: string;
    propertyId: string;
    landlordId?: string;
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
  lateFeeEnabled: boolean;
  lateFeePercentage?: number;
  lateFeeGracePeriod?: number;
  lateFeeFrequency?: FrequencyType;
  depositPercentage?: number;
  refundTimeframe?: FrequencyType;
  refundPolicy?: RefundPolicyType;
  applicationFeePercentage?: number;
  notificationEnabled: boolean;
  notificationFrequency?: number;
  reminderMethods: ReminderMethodType[];
  landlordId?: string;
  isDeleted: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface PropertyListingDTO {
    payApplicationFee?: boolean;
    applicationFeeAmount?: boolean;
    type?: ListingType; //ENTIRE_PROPERTY
    listAs: PropertySpecificationType;
    propertyId: string;
    unitId?: string[];
    roomId?: string[];

    propertySubType?: PropertyType,
    priceFrequency?: PriceFrequency,
    price?: number,
    securityDeposit?: number,
    minStayDays?: number,
    maxStayDays?: number,
    availableFrom?: Date,
    availableTo?: Date,
}

export interface UpdateListingStatusDTO {
    isLeased: boolean;
}