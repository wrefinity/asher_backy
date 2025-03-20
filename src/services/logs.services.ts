import { prismaClient } from "..";
import { LogType, logTypeStatus, YesNo } from "@prisma/client"
// Interface for Log creation
interface LogIF {
  events: string;
  propertyId?: string;
  subjects?: string;
  type?: LogType;
  status?: logTypeStatus,
  transactionId?: string;
  viewAgain?: YesNo;
  considerRenting?: YesNo;
  applicationId?: string;
  applicationInvitedId?: string;
  createdById?: string;
}



class LogService {
  protected inclusion;
  constructor() {
    this.inclusion = {
      property: true,
      users: {
        select: { email: true, id: true, profile: true }
      }
    }
  }

  createLog = async (data: LogIF) => {
    const logData: any = {
      events: data.events,
      type: data.type,
      status: data.status || undefined,
      viewAgain: data.viewAgain,
      considerRenting: data.considerRenting,
      transactionId: data?.transactionId || undefined,
      // createdById: data?.createdById || undefined,
      application: data.applicationId
        ? { connect: { id: data.applicationId } }
        : undefined,
      applicationInvites: data.applicationInvitedId
        ? { connect: { id: data.applicationInvitedId } }
        : undefined,
    };

    // Only include propertyId if it is defined
    if (data.propertyId) {
      logData.property = { connect: { id: data.propertyId } };
    }
    if (data.createdById) {
      logData.users = { connect: { id: data.createdById } }
    }

    return await prismaClient.log.create({
      data: logData,
    });
  };


  // Get all logs by types, status, etc.
  getLogs = async (landlordId: string, type: LogType, status: logTypeStatus = null) => {
    return await prismaClient.log.findMany({
      where: {
        type,
        property: { landlordId },
        ...(status ? { status } : {}) // Apply status condition only if it's provided
      },
      include: this.inclusion
    });
  };



  checkPropertyLogs = async (createdById: string, type: LogType, propertyId: string, applicationId: string = null) => {
    return await prismaClient.log.findFirst({
      where: { type, propertyId, createdById, applicationId },
    })
  }
  getMilestone = async (createdById: string, type: LogType, propertyId: string, applicationId: string = null) => {
    return await prismaClient.log.findMany({
      where: { type, propertyId, createdById, applicationId },
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
  getCommunicationLog = async (propertyId: string, userId: string, landlordId: string) => {
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

  getLandlordLogs = async (landlordId: string, type: LogType = null) => {
    return await prismaClient.log.findMany({
      where: {
        ...(type && { type }),
        property: {
          landlordId
        }
      },
      include: {
        property: true,
        users: true
      }
    });
  }
  updateLog = async (id: string, updateData: Partial<LogIF>) => {
    return await prismaClient.log.update({
      where: { id },
      data: updateData,
      include: {
        property: true,
        users: true,
      },
    });
  };

}

export default new LogService();