import { prismaClient } from "../..";
import { generateIDs } from "../../utils/helpers";

class BillService {
    constructor() { }

    createBill = async (billData: any, landlordId: string) =>{
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

    createTenantBill = async (billData: any, landlordId: string) =>{
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

    getAllBills = async (landlordId: string) =>{
        return prismaClient.bills.findMany({
            where: {
                landlordId
            },
        })
    }

    getBillById = async (billId: string, landlordId: string) =>{
        return prismaClient.bills.findUnique({
            where: { id: billId, landlordId },
        })
    }

    updateBill = async (billId: string, billData: any, landlordId: string) =>{
        return prismaClient.bills.update({
            where: { id: billId, landlordId },
            data: billData,
        })
    }

    deleteBill = async (billId: string, landlordId: string) =>{
        return prismaClient.bills.delete({
            where: { id: billId, landlordId },
        })
    }

    getBillByPropertyId = async (propertyId: string, landlordId: string) =>{
        return prismaClient.bills.findMany({
            where: {
                propertyId,
                landlordId
            },
        })
    }


}

export default new BillService();