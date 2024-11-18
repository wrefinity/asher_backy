export interface MaintenanceIF {
  id?: string;
  description?: string;
  availability?:string;
  attachments?: string[];
  offer: string[];
  scheduleDate: Date;
  updatedAt?: Date;
  tenantId?: string;
  landlordId?: string;
  propertyId?: string;
  apartmentId?: string;
  vendorId?: string;
  categoryId: string;
  subcategoryIds: string[];
  status: string;
  serviceId?: string;
  handleByLandlord: boolean;
  amount: number;
  flagCancellation?: boolean,
  cancelReason?: string;
  vendorConsentCancellation?: boolean;
}

export interface RescheduleMaintenanceDTO {
  maintenanceId: string;
  newScheduleDate: Date;
}
