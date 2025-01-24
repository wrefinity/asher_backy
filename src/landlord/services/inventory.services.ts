import { StatusType } from "@prisma/client";
import { prismaClient } from "../..";

class InventoryService {
    createInventory = async (inventoryData: any) => {
        const { propertyId, ...rest } = inventoryData;

        // Validate that the propertyId exists
        const propertyExists = await prismaClient.properties.findUnique({
            where: { id: inventoryData.propertyId },
        });

        if (!propertyExists) {
            throw new Error(`Property with ID ${inventoryData.propertyId} does not exist`);
        }

        return await prismaClient.inventoryManageMent.create({
            data: {
                ...rest,
                property: {
                    connect: {
                        id: propertyId,
                    },
                }
            }
        })
    };

    updateInventory = async (inventoryId: string, inventoryData: any) => {

        return await prismaClient.inventoryManageMent.update({
            where: { id: inventoryId },
            data: inventoryData,
        })
    }

    deleteInventory = async (inventoryId: string) =>{
        return await prismaClient.inventoryManageMent.update({
            where: { id: inventoryId },
            data: {isDeleted:true},
        })
    }

    getAllInventoriesByProperty = async (propertyId: string) =>{
        return await prismaClient.inventoryManageMent.findMany({
            where: { propertyId },
        })
    }

    async getInventoryById(inventoryId: string) {
        return await prismaClient.inventoryManageMent.findUnique({
            where: { id: inventoryId },
        })
    }

    async getAllInventory() {
        return await prismaClient.inventoryManageMent.findMany({
            include: {
                property: true,
            }
        })
    }


}

export default new InventoryService()