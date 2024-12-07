import { LatePaymentFeeType, SettingType, PropsSettingType, Refundability} from "@prisma/client";

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