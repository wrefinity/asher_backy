import { prismaClient } from "../..";

class TenantBills {
    async getTenantBills(tenantId: string) {
        return prismaClient.bills.findMany({
          where: {
            tenantId
          },
          orderBy: {
            dueDate: 'asc'
          }
        })
      }
    
      async getUpcomingBills(tenantId: string, days: number = 30) {
        const today = new Date();
        const futureDate = new Date(today.getTime() + days * 24 * 60 * 60 * 1000);
    
        return prismaClient.bills.findMany({
          where: {
            tenantId,
            dueDate: {
              gte: today,
              lte: futureDate
            }
          },
          orderBy: {
            dueDate: 'asc'
          }
        })
      }
    
      async getOverdueBills(tenantId: string) {
        const today = new Date();
    
        return prismaClient.bills.findMany({
          where: {
            tenantId,
            dueDate: {
              lt: today
            }
          },
          orderBy: {
            dueDate: 'asc'
          }
        })
      }
}

export default new TenantBills();