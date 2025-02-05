import { prismaClient } from "..";
import {LogType} from "@prisma/client"
// Interface for Log creation
interface LogIF {
  events: string;
  propertyId?: string;
  subjects?: string;
  type?: LogType;
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
        type: data.type,
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

  // for milestone on maintenances
  getLandlordTenantsLogsByProperty = async (propertyId: string, userId: string, landlordId: string) => {
    return await prismaClient.log.findMany({
      where: {
        propertyId: propertyId,
        property: {
          landlordId
        },
        createdById: userId
      },
      include: {
        property: true,
        users: true
      }
    });
  }
  getCommunicationLog = async(propertyId: string, userId: string, landlordId: string)=>{
    return await prismaClient.log.findMany({
      where: {
        propertyId: propertyId,
        createdById: userId,
        property: {
          landlordId
        },
        type: {
          in: [LogType.EMAIL, LogType.MESSAGE]
        }
      },
      include: {
        property: true,
        users: true
      }
    });
  }
}

export default new LogService();