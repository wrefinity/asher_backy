import { LatePaymentFeeType } from "@prisma/client";

export interface IPropApartmentSettings {
    id?: string;
    propertyId: string;
    apartmentId?: string;
    lateFee: number;
    latePaymentFeeType: LatePaymentFeeType;
    createdAt?: Date;
    updatedAt?: Date;
}
