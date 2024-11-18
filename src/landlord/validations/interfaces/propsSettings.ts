import { LatePaymentFeeType, SettingType} from "@prisma/client";

export interface IPropApartmentSettings {
    id?: string;
    propertyId: string;
    apartmentId?: string;
    lateFee: number;
    latePaymentFeeType: LatePaymentFeeType;
    createdAt?: Date;
    updatedAt?: Date;
}

export interface IGlobalSetting {
    id: string;
    percentageOrAmount?: number;
    type: SettingType;
    landlordId?: string | null;
  }