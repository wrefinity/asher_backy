import { prismaClient } from "../..";
import { services } from "@prisma/client";
import { IService } from "../validations/interfaces"


class ServiceService {
    protected inclusion;
    constructor() {
        this.inclusion = {
            user: true,
            category: true,
            subcategory: true,
            services: true,
        }
    }

    createService = async (data: IService): Promise<services> => {
        return await prismaClient.services.create({ 
            data,
            include:this.inclusion 
        });
    }

    getService = async (id: string): Promise<services | null> => {
        return await prismaClient.services.findUnique({ 
            where: { id },
            include:this.inclusion,
        });
    }

    updateService = async (id: string, data: Partial<IService>): Promise<services> => {
        return await prismaClient.services.update({ 
            where: { id },
            data,
            include:this.inclusion
        });
    }

    deleteService = async (id: string): Promise<services> => {
        return await prismaClient.services.update({ 
            where: { id }, 
            data: { isDeleted: true },
            include: this.inclusion
        });
    }

    getAllServices = async (): Promise<services[]> => {
        return await prismaClient.services.findMany({
            where: { isDeleted: false },
            include: this.inclusion
        });
    }
    
    getServicesByCategory = async (categoryId: string): Promise<services[]> => {
        return await prismaClient.services.findMany({ where: { categoryId }, include:this.inclusion});
    }

    getServicesByCategoryAndSubcategories = async (categoryId: string, subcategoryIds: string[]): Promise<services[]> => {
        return await prismaClient.services.findMany({
            where: {
                categoryId,
                subcategoryId: {
                    in: subcategoryIds
                }
            },
            include:this.inclusion
        });
    }

    applyOffer = async (categoryId: string, subcategoryIds: string[], plan: 'standard' | 'medium' | 'premium'): Promise<services[]> => {
        const services = await this.getServicesByCategoryAndSubcategories(categoryId, subcategoryIds)
        return services.filter(service => {
            switch (plan) {
                case 'standard':
                    return service.standardPriceRange;
                case 'medium':
                    return service.mediumPriceRange;
                case 'premium':
                    return service.premiumPriceRange;
                default:
                    return false;
            }
        });
    }
}

export default new ServiceService();
