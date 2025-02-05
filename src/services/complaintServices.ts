
import { prismaClient } from "..";
import { IComplaintService, IComplaint } from "../validations/interfaces/complaint.interface";

class ComplaintServices implements IComplaintService {

    createComplaint = async (data: IComplaint): Promise<IComplaint> => {
        const { propertyId, createdById, ...rest } = data;
        try {
            return await prismaClient.complaint.create({
                data: {
                    ...rest,
                    property: propertyId ? { connect: { id: propertyId } } : undefined,
                    createdBy: createdById ? { connect: { id: createdById } } : undefined,
                },
            });
        } catch (error) {
            throw new Error(`Failed to create complaint: ${error.message}`);
        }
    };

    getAllComplaints = async (createdById: string): Promise<IComplaint[]> => {
        try {
            return await prismaClient.complaint.findMany({
                where: { isDeleted: false, createdById },
                include: { createdBy: true, property: true },
            });
        } catch (error) {
            throw new Error(`Failed to fetch complaints: ${error.message}`);
        }
    };
    getLandlordPropsTenantComplaints = async (tenantUserId: string, propertyId: string, landlordId: string): Promise<IComplaint[]> => {
        return await prismaClient.complaint.findMany({
            where: {
                isDeleted: false,
                propertyId,
                property: {
                    landlordId
                },
                createdById:tenantUserId
            },
            include: { createdBy: true, property: true },
        });
    };

    getAllLandlordComplaints = async (landlordId: string): Promise<IComplaint[]> => {
        try {
            return await prismaClient.complaint.findMany({
                where: {
                    isDeleted: false,
                    property: {
                        landlordId,
                    },
                },
                include: { createdBy: true, property: true },
            });
        } catch (error) {
            throw new Error(`Failed to fetch landlord complaints: ${error.message}`);
        }
    };

    getAllPropertyComplaints = async (propertyId: string): Promise<IComplaint[]> => {
        try {
            return await prismaClient.complaint.findMany({
                where: { isDeleted: false, propertyId },
                include: { createdBy: true, property: true },
            });
        } catch (error) {
            throw new Error(`Failed to fetch property complaints: ${error.message}`);
        }
    };

    getComplaintById = async (id: string): Promise<IComplaint | null> => {
        try {
            return await prismaClient.complaint.findUnique({
                where: { id },
                include: { createdBy: true, property: true },
            });
        } catch (error) {
            throw new Error(`Failed to fetch complaint by ID: ${error.message}`);
        }
    };

    updateComplaint = async (id: string, data: Partial<IComplaint>): Promise<IComplaint> => {
        try {
            return await prismaClient.complaint.update({
                where: { id },
                data,
            });
        } catch (error) {
            throw new Error(`Failed to update complaint: ${error.message}`);
        }
    };

    deleteComplaint = async (id: string): Promise<IComplaint> => {
        try {
            return await prismaClient.complaint.update({
                where: { id },
                data: { isDeleted: true },
            });
        } catch (error) {
            throw new Error(`Failed to delete complaint: ${error.message}`);
        }
    };
}

export default new ComplaintServices();
