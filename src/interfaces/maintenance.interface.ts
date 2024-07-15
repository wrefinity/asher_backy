

export interface MaintenanceIF {
  id: string;
  description: string;
  attachments: string[];
  priority: string;
  scheduleDate: Date;
  scheduleTime: Date;
  createdAt: Date;
  updatedAt: Date;
  userId: string;
  propertyId?: string;
  apartmentId?: string;
  categoryId: string;
  subcategoryId: string;
  statusId: string;
}
