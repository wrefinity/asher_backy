import { prismaClient } from "../..";
import { generateIDs } from "../../utils/helpers";

class BillService {
    constructor() { }

    createBill = async (billData: any, landlordId: string) => {
        const billId = generateIDs('BILL')
        const {propertyId, ...rest} = billData;

        return await prismaClient.bills.create({
            data: {
                billId,
                description: `Created ${billData.billName}`,
                ...rest,
                // propertyId,
                property: {
                    connect: {id:propertyId}
                },
                landlord: {
                    connect: {id:landlordId}
                }
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
            include:{
                property: true
            }
        })
    }
}

export default new BillService();