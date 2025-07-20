
import { ComplaintCategory, ComplaintPriority, ComplaintStatus } from "@prisma/client";
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
                createdById: tenantUserId
            },
            include: { createdBy: true, property: true },
        });
    };

    // Get stats for landlord (group by status/category/priority)
    async getComplaintStats(landlordId: string) {
        const complaints = await prismaClient.complaint.findMany({
            where: {
                property: {
                    landlordId,
                },
                isDeleted: false,
            },
        });

        const totalComplaints = complaints.length;

        const statusCount = Object.values(ComplaintStatus).reduce((acc, status) => {
            acc[status] = complaints.filter(c => c.status === status).length;
            return acc;
        }, {} as Record<ComplaintStatus, number>);

        const categoryCount = Object.values(ComplaintCategory).reduce((acc, category) => {
            acc[category] = complaints.filter(c => c.category === category).length;
            return acc;
        }, {} as Record<ComplaintCategory, number>);

        const priorityCount = Object.values(ComplaintPriority).reduce((acc, priority) => {
            acc[priority] = complaints.filter(c => c.priority === priority).length;
            return acc;
        }, {} as Record<ComplaintPriority, number>);

        return {
            totalComplaints,
            statusCount,
            categoryCount,
            priorityCount,
        };
    }

    // Paginated complaints for current landlord
    async getLandlordComplaints(
        landlordId: string,
        page: number = 1,
        limit: number = 10,
        filters?: {
            status?: ComplaintStatus;
            category?: ComplaintCategory;
            priority?: ComplaintPriority;
        }
    ) {
        const skip = (page - 1) * limit;

        const whereClause = {
            isDeleted: false,
            property: {
                landlordId,
            },
            ...(filters?.status && { status: filters.status }),
            ...(filters?.category && { category: filters.category }),
            ...(filters?.priority && { priority: filters.priority }),
        };

        const [complaints, total] = await Promise.all([
            prismaClient.complaint.findMany({
                where: whereClause,
                include: {
                    property: true,
                    createdBy: true,
                },
                skip,
                take: limit,
                orderBy: {
                    createdAt: 'desc',
                },
            }),
            prismaClient.complaint.count({
                where: whereClause,
            }),
        ]);

        return {
            complaints,
            total,
            page,
            totalPages: Math.ceil(total / limit),
        };
    }

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
    // Get all messages for a complaint
    getMessages = async (complaintId: string) => {
        return prismaClient.complaintMessage.findMany({
            where: { complaintId },
            include: {
                sender: {
                    select: { id: true, email: true, role: true, profile: true },
                },
            },
            orderBy: {
                createdAt: 'asc',
            },
        });
    }

    // Post a new message in a complaint chat
    postMessage = async (complaintId: string, senderId: string, message: string) => {
        return prismaClient.complaintMessage.create({
            data: {
                complaintId,
                senderId,
                message,
            },
        });
    }
}

export default new ComplaintServices();
