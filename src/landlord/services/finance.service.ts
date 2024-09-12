import { PropertyTransactionsType } from '@prisma/client';
import { prismaClient } from "../..";

class FinanceService {
    async getFinanceIncome(propertyId: string, landlordId: string) {
        return await prismaClient.propertyTransactions.findMany({
            where: {
                propertyId,
                landlordsId: landlordId,
                type: { in: [PropertyTransactionsType.RENT_PAYMENT, PropertyTransactionsType.LATE_FEE, PropertyTransactionsType.CHARGES, PropertyTransactionsType.MAINTAINACE_FEE] },
            }
        })
    }

    async getFInanceExpense(propertyId: string, landlordId: string) {
        return await prismaClient.maintenance.findMany({
            where: {
                propertyId,
                userId: landlordId,
            }
        })
    }
}

export default new FinanceService();