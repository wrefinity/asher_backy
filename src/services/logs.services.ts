import { prismaClient } from "..";
import { LogType, InvitedResponse, logTypeStatus, YesNo, EnquireStatus } from "@prisma/client"
import applicationServices from "./application.services";

/** Human-readable label for AvailabilityStatus (e.g. OCCUPIED → Occupied) */
export const formatAvailabilityLabel = (status: string) =>
  status
    .replace(/_/g, ' ')
    .toLowerCase()
    .replace(/\b\w/g, char => char.toUpperCase());

// Interface for Log creation
export interface LogIF {
  events: string;
  propertyId?: string;
  propertyListingId?: string;
  unitId?: string;
  roomId?: string;
  subjects?: string;
  type?: LogType;
  status?: logTypeStatus,
  response?: InvitedResponse;
  enquireStatus?: EnquireStatus;
  transactionId?: string;
  viewAgain?: YesNo;
  considerRenting?: YesNo;
  proposedViewingDate?: Date | string;
  applicationId?: string;
  applicationInvitedId?: string;
  createdById?: string;
}



class LogService {
  protected inclusion;
  constructor() {
    this.inclusion = {
      property: true,
      propertyListing: true,
      units: true,
      rooms: true,
      users: {
        select: { email: true, id: true, profile: true, tenants: true }
      },
      application: {
        select: { id: true, platform: true },
      },
      applicationInvites: {
        include: {
          application: {
            select: { id: true, platform: true },
          },
        },
      },
    }
  }

  createLog = async (data: LogIF) => {
    const considerRenting = data.considerRenting?.toString().toUpperCase();
    const viewAgain = data.viewAgain?.toString().toUpperCase();

    let events = data.events?.trim();
    if (!events) {
      if (considerRenting === "YES") {
        events = "Interested in renting this property.";
      } else if (considerRenting === "NO") {
        events = "Not interested in renting at this time.";
      } else if (viewAgain === "YES") {
        events = "Requested another viewing.";
      } else {
        events = "Viewing feedback submitted.";
      }
    }

    const logData: any = {
      events,
      type: data.type ?? LogType.FEEDBACK,
      status: data.status || undefined,
      viewAgain: data.viewAgain,
      considerRenting: data.considerRenting,
      proposedViewingDate: data.proposedViewingDate
        ? new Date(data.proposedViewingDate)
        : undefined,
      enquireStatus: data?.enquireStatus,
      transactionId: data?.transactionId || undefined,
      // createdById: data?.createdById || undefined,
      application: data.applicationId
        ? { connect: { id: data.applicationId } }
        : undefined,
      units: data.unitId
        ? { connect: { id: data.unitId } }
        : undefined,
      rooms: data.roomId
        ? { connect: { id: data.roomId } }
        : undefined,
      propertyListing: data.propertyListingId
        ? { connect: { id: data.propertyListingId } }
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

  /** Property occupancy / listing status change for activity log */
  logPropertyStatusChange = async (params: {
    propertyId: string;
    events: string;
    subjects?: string;
    createdById?: string;
    unitId?: string;
    roomId?: string;
  }) => {
    return this.createLog({
      propertyId: params.propertyId,
      events: params.events,
      type: LogType.ACTIVITY,
      subjects: params.subjects,
      createdById: params.createdById,
      unitId: params.unitId,
      roomId: params.roomId,
    });
  };

  // Get all logs by types, status, etc.
  getLogs = async (
    landlordId: string,
    type: LogType,
    status: logTypeStatus = null,
    options?: { excludeEnquireStatus?: EnquireStatus }
  ) => {
    return await prismaClient.log.findMany({
      where: {
        type,
        property: { landlordId },
        ...(status ? { status } : {}),
        ...(options?.excludeEnquireStatus
          ? {
              OR: [
                { enquireStatus: null },
                { enquireStatus: { not: options.excludeEnquireStatus } },
              ],
            }
          : {}),
      },
      include: this.inclusion,
    });
  };
  getLogCounts = async (landlordId: string, type: LogType, status: logTypeStatus = null) => {
    return await prismaClient.log.count({
      where: {
        type,
        property: { landlordId },
        ...(status ? { status } : {}) // Apply status condition only if it's provided
      },

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

  getLogsById = async (logId: string): Promise<LogIF | null> => {
    return await prismaClient.log.findFirst({
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
      include: this.inclusion,
      orderBy: { createdAt: "asc" },
    });
  }
  getCommunicationLog = async (propertyId: string, userId: string, landlordId: string, types?: LogType[]) => {
    return await prismaClient.log.findMany({
      where: {
        propertyId: propertyId,
        createdById: userId,
        property: {
          landlordId
        },
        type: {
          in: [LogType.EMAIL, LogType.MESSAGE, LogType.APPLICATION]
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
      include: this.inclusion,
      orderBy: {
        createdAt: "desc"
      }
    });
  }

  updateLog = async (id: string, updateData: Partial<LogIF>) => {
    return await prismaClient.log.update({
      where: { id },
      data: updateData,
      include: this.inclusion
    });
  };

  getUserEnquiries = async (userId: string) => {
    return await prismaClient.log.findMany({
      where: {
        createdById: userId,
        type: LogType.ENQUIRED,
      },
      orderBy: { createdAt: "desc" },
      include: {
        property: {
          include: {
            state: true,
            images: true,
            specification: {
              where: { isActive: true },
              include: { residential: true },
              take: 1,
            },
          },
        },
        propertyListing: true,
        applicationInvites: {
          where: { isDeleted: false },
          orderBy: { createdAt: "desc" },
          take: 1,
        },
      },
    });
  };

}

export default new LogService();