import { StatusType } from "@prisma/client";
import { prismaClient } from "../..";

class InventoryService {
    async createInventory(inventoryData: any) {
        //NOTE: Check the property ID if it exist before inserting into the table
        return await prismaClient.inventoryManageMent.create({
            data: inventoryData,
        })
    };

    async updateInventory(inventoryId: string, inventoryData: any) {
        
        return await prismaClient.inventoryManageMent.update({
            where: { id: inventoryId },
            data: inventoryData,
        })
    }

    async deleteInventory(inventoryId: string) {
        return await prismaClient.inventoryManageMent.delete({
            where: { id: inventoryId },
        })
    }

    async getAllInventoriesByProperty(propertyId: string) {
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