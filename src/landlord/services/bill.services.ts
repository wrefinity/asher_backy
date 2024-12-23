import { prismaClient } from "../..";
import { generateIDs } from "../../utils/helpers";

class BillService {
    constructor() { }

    createBill = async (billData: any, landlordId: string) => {
        const billId = generateIDs('BILL')
        return await prismaClient.bills.create({
            data: {
                landlordId,
                billId,
                description: `Created ${billData.billName}`,
                ...billData,
            },
        })
    }
    getTenantBills = async (tenantId: string) => {
        const tenantBills = await prismaClient.bills.findMany({
            where: {
                tenantId: tenantId,
            },
            include: {
                tenant: true,
                property: true,
                transactions: true,
            },
        });
        return tenantBills;
    }

    getAllBills = async (landlordId: string) => {
        return await prismaClient.bills.findMany({
            where: {
                landlordId
            },
        })
    }

    getBillById = async (billId: string, landlordId: string) => {
        return await prismaClient.bills.findUnique({
            where: { id: billId, landlordId },
        });
    }

    updateBill = async (billId: string, billData: any, landlordId: string) => {
        return await prismaClient.bills.update({
            where: { id: billId, landlordId },
            data: billData,
        })
    }

    deleteBill = async (billId: string, landlordId: string) => {
        return await prismaClient.bills.delete({
            where: { id: billId, landlordId },
        })
    }

    getBillByPropertyId = async (propertyId: string, landlordId: string) => {
        return await prismaClient.bills.findMany({
            where: {
                propertyId,
                landlordId
            },
        })
    }
}

export default new BillService();