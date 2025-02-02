import { ComplaintCategory, ComplaintPriority, ComplaintStatus } from "@prisma/client";

export interface IComplaint {
  id?: string;
  category: ComplaintCategory;
  subject: string;
  createdById?: string;
  propertyId?: string;
  priority: ComplaintPriority;
  status: ComplaintStatus;
  createdAt?: Date;
  updatedAt?: Date;
  isDeleted?: boolean;
}

export interface IComplaintService {
  createComplaint(data: IComplaint): Promise<IComplaint>;
  getAllComplaints(createdById: string): Promise<IComplaint[]>;
  getComplaintById(id: string): Promise<IComplaint | null>;
  updateComplaint(id: string, data: Partial<IComplaint>): Promise<IComplaint>;
  deleteComplaint(id: string): Promise<IComplaint>;
  getAllPropertyComplaints(propertyId: string): Promise<IComplaint[]>; 
  getAllLandlordComplaints(landlordId:string):Promise<IComplaint[]>;
}
