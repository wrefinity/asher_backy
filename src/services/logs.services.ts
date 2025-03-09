import { prismaClient } from "..";
import {LogType} from "@prisma/client"
// Interface for Log creation
interface LogIF {
  events: string;
  propertyId?: string;
  subjects?: string;
  type?: LogType;
  transactionId?: string;
  applicationId?: string;
  createdById?: string;
}
interface LogFeedbackIF {
  id?: string;
  logId?: string;
  comment?: string;
  userId?: string;
}


class LogService {
  protected inclusion;
  constructor() {
    this.inclusion = {
      property: true
    }
  }
 
  createLog = async (data: LogIF) => {
    const logData: any = {
      events: data.events,
      type: data.type,
      transactionId: data?.transactionId || undefined,
      // createdById: data?.createdById || undefined,
      application: data.applicationId
        ? { connect: { id: data.applicationId } }
        : undefined,
    };

    // Only include propertyId if it is defined
    if (data.propertyId) {
      logData.property = { connect: { id: data.propertyId } };
    }
    if (data.propertyId) {
      logData.users= { connect: { id: data.createdById } }
    }

    return await prismaClient.log.create({
      data: logData,
    });
  };
  createLogFeedback = async (data: LogFeedbackIF) => {
    const logData: any = {
      comment: data.comment,
      user: data.userId
        ? { connect: { id: data.userId } }
        : undefined,
    };
    // Only include propertyId if it is defined
    if (data.logId) {
      logData.log = { connect: { id: data.logId } };
    }
    return await prismaClient.logFeedback.create({
      data: logData,
    });
  };
  

  checkPropertyLogs = async (createdById: string, type: LogType, propertyId:string, applicationId: string = null)=>{
    return await prismaClient.log.findFirst({
      where:{type, propertyId, createdById, applicationId},
    })
  }
  getMilestone = async (createdById: string, type: LogType, propertyId:string,  applicationId: string = null)=>{
    return await prismaClient.log.findMany({
      where:{type, propertyId, createdById, applicationId},
    })
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
  getLogsById = async (logId: string) => {
    return await prismaClient.log.findMany({
      where: {
        id: logId,
      },
      include: {
        property: true,
        feedbacks: true,
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