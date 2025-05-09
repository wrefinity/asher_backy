import { prismaClient } from "..";
import { InspectionCreateInput, InspectionUpdateInput } from '../validations/interfaces/inspection.interface';

class InspectionService {


    createInspection = async (data: InspectionCreateInput) => {
        return prismaClient.inspection.create({
            data: {
                propertyId: data.propertyId,
                tenantId: data.tenantId,
                score: data.score,
                notes: data.notes,
            },
            include: {
                property: true,
                tenant: true,
            },
        });
    }

    getInspectionsByProperty = async (propertyId: string) => {
        return prismaClient.inspection.findMany({
            where: { propertyId },
            include: { tenant: true },
        });
    }

    getInspectionById = async (id: string) => {
        return prismaClient.inspection.findUnique({
            where: { id },
            include: { property: true, tenant: true },
        });
    }

    updateInspection = async (id: string, data: InspectionUpdateInput) => {
        return prismaClient.inspection.update({
            where: { id },
            data: {
                score: data.score,
                notes: data.notes,
            },
            include: {
                property: true,
                tenant: true,
            },
        });
    }

    deleteInspection = async (id: string) => {
        return prismaClient.inspection.delete({
            where: { id },
        });
    }
}

export default new InspectionService()