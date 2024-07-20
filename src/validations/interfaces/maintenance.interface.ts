export interface MaintenanceIF {
  id: string;
  description: string;
  attachments: string[];
  offer: string[];
  scheduleDate: Date;
  updatedAt?: Date;
  userId: string;
  propertyId?: string;
  apartmentId?: string;
  categoryId: string;
  subcategoryIds: string[];
  statusId: string;
  serviceId?: string;
}