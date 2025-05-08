import { prismaClient } from "..";
import { SeverityLevel, NoticeType, DeliveryMethod } from "@prisma/client";


export interface ViolationIF {
  description: string;       // Description of the violation (required)
  severityLevel?: SeverityLevel; // Severity of the violation (optional, defaults to MODERATE)
  actionTaken?: string;      // Action taken (optional)
  tenantId: string;
  noticeType?: NoticeType;
  deliveryMethod?: DeliveryMethod;
  propertyId?: string;
  createdById: string;
  unitId?: string
  dueDate?: Date
}


class ViolationService {
  getTenantViolation = async (landlordUserId: string) => {
    return await prismaClient.violation.findMany({
      where: {
        createdById: landlordUserId,
        isDeleted: false
      }
    });
  }

  getViolationById = async (id: string) => {
    return await prismaClient.violation.findUnique({ where: { id } });
  }
  getViolationTenantId = async (tenantId: string) => {
    return await prismaClient.violation.findMany({
      where: { tenantId }
    });
  }

  create = async (data: ViolationIF) => {
    return await prismaClient.violation.create({
      data: {
        description: data.description,
        noticeType: data.noticeType,
        deliveryMethod: data.deliveryMethod,
        severityLevel: data.severityLevel || SeverityLevel.LOW,
        actionTaken: data.actionTaken,
        tenant: {
          connect: {
            id: data.tenantId
          }
        },
        dueDate: data.dueDate,
        property: {
          connect: {
            id: data.propertyId,
          }
        },
        unit: {
          connect: {
            id: data.unitId
          }
        }
      },
    });
  }


  public async deleteViolation(id: string) {
    return await prismaClient.violation.update({
      where: { id },
      data: { isDeleted: true },
    });
  }
}

export default new ViolationService();