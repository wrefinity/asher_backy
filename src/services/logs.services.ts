import { prismaClient } from "..";

// Interface for Log creation
interface LogIF {
  events: string;
  propertyId?: string;
  transactionId?: string;
  createdById?: string;
}


class LogService {
  protected inclusion;
  constructor() {
    this.inclusion = {
      property: true
    }
  }
  createLog = async (data: LogIF) => {
    return await prismaClient.log.create({
      data: {
        events: data.events,
        propertyId: data.propertyId,
        transactionId: data.transactionId,
        createdById: data.createdById,
      },
    });
  }
  getLogsByProperty = async (propertyId: string) => {
    return await prismaClient.log.findMany({
      where: {
        propertyId: propertyId,
      },
      include: {
        property: true,
      }
    });
  }
}

export default new LogService();