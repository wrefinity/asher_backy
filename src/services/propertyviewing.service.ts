import { prismaClient } from "..";
import { PropertyViewingIF } from "../validations/interfaces/properties.interface";


class PropertyViewingService {
    createViewing = async (data: PropertyViewingIF) => {
        return await prismaClient.propertyViewing.create({ data });
    }

    getAllViewings = async () =>{
        return await prismaClient.propertyViewing.findMany();
    }
    getAllPropertyViewing = async (propertyId: string) => {
        return await prismaClient.propertyViewing.findMany({
            where: { propertyId },
            include: {
                property: true,
                user: {
                    select: {
                        id: true,
                        email: true,
                        profileId: true,
                        profile: true,
                    }
                }
            }
        });
    };
    

    getViewingById = async (id: string)=> {
        return await prismaClient.propertyViewing.findUnique({ where: { id } });
    }

    updateViewing = async (id: string, data: Partial<PropertyViewingIF>) =>{
        return await prismaClient.propertyViewing.update({
            where: { id },
            data,
        });
    }

    deleteViewing = async (id: string) =>{
        return await prismaClient.propertyViewing.delete({ where: { id } });
    }
}

export default new PropertyViewingService()