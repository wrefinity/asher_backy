import { prismaClient } from "..";
import { LogType, InvitedResponse, logTypeStatus, YesNo } from "@prisma/client"
import applicationServices from "./application.services";
// Interface for Log creation
export interface LogIF {
  events: string;
  propertyId?: string;
  subjects?: string;
  type?: LogType;
  status?: logTypeStatus,
  response?: InvitedResponse;
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
      },
      applicationInvites: true,
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

    const log = await prismaClient.log.create({
      data: logData,
    });

    if (log && data.response === InvitedResponse.FEEDBACK && data.applicationInvitedId) {
      await applicationServices.updateInviteResponse(data.applicationInvitedId, data.response);
    }
  

    return log;
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
      include: this.inclusion
    });
  }
  getLogsById = async (logId: string) => {
    return await prismaClient.log.findMany({
      where: {
        id: logId,
      },
      include: this.inclusion
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
      include: this.inclusion
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
      include: this.inclusion
    });
  }

  getLandlordLogs = async (
    landlordId: string,
    type: LogType | null = null,
    status: logTypeStatus | null = null
  ) => {
    return await prismaClient.log.findMany({
      where: {
        ...(type && { type }),
        ...(status && { status }),
        property: {
          landlordId
        }
      },
      include: this.inclusion
    });
  }

  updateLog = async (id: string, updateData: Partial<LogIF>) => {
    return await prismaClient.log.update({
      where: { id },
      data: updateData,
      include: this.inclusion
    });
  };

}

export default new LogService();