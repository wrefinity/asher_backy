export interface MaintenanceIF {
  id?: string;
  description?: string;
  availability?:string;
  attachments?: string[];
  offer: string[];
  scheduleDate: Date;
  updatedAt?: Date;
  userId: string;
  propertyId?: string;
  apartmentId?: string;
  vendorId?: string;
  categoryId: string;
  subcategoryIds: string[];
  status: string;
  serviceId?: string;
}