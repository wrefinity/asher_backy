import { prismaClient } from "../..";
import { generateIDs } from "../../utils/helpers";

class BillService {
    constructor() { }

    async createBill(billData: any, landlordId: string) {
        const billId = generateIDs('BILL')
        return prismaClient.bills.create({
            data: {
                landlordId,
                billId,
                description: `Created ${billData.billName}`,
                ...billData,
            },
        })
    }

    async createTenantBill(billData: any, landlordId: string) {
        const billId = generateIDs('BILL')
        return prismaClient.bills.create({
            data: {
                landlordId,
                billId,
                description: `Created ${billData.billName}`,
                ...billData,
            },
        })
    }

    async getAllBills(landlordId: string) {
        return prismaClient.bills.findMany({
            where: {
                landlordId
            },
        })
    }

    async getBillById(billId: string, landlordId: string) {
        return prismaClient.bills.findUnique({
            where: { id: billId, landlordId },
        })
    }

    async updateBill(billId: string, billData: any, landlordId: string) {
        return prismaClient.bills.update({
            where: { id: billId, landlordId },
            data: billData,
        })
    }

    async deleteBill(billId: string, landlordId: string) {
        return prismaClient.bills.delete({
            where: { id: billId, landlordId },
        })
    }

    async getBillByPropertyId(propertyId: string, landlordId: string) {
        return prismaClient.bills.findMany({
            where: {
                propertyId,
                landlordId
            },
        })
    }


}

export default new BillService();