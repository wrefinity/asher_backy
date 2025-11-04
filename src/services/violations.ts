import { prismaClient } from "..";
import { SeverityLevel } from "@prisma/client";
import {
  ViolationResponseIF,
  ViolationIF,
} from "../validations/interfaces/violation.interface";

class ViolationService {
  private violationInclude: any;

  constructor() {
    this.violationInclude = {
      tenant: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          phone: true,
        },
      },
      property: {
        select: {
          id: true,
          name: true,
          address: true,
        },
      },
      unit: {
        select: {
          id: true,
          unitNumber: true,
          floor: true,
        },
      },
      user: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
      ViolationResponse: {
        select: {
          id: true,
          responseType: true,
          paymentAmount: true,
          paymentDate: true,
          reasonForDispute: true,
          evidenceUrl: true,
          additionalComment: true,
          createdAt: true,
          updatedAt: true,
        },
      },
    };
  }

  /** Fetch all tenant violations created by a landlord */
  getTenantViolation = async (landlordUserId: string) => {
    return await prismaClient.violation.findMany({
      where: {
        createdById: landlordUserId,
        isDeleted: false,
      },
      include: this.violationInclude,
      orderBy: { createdAt: "desc" },
    });
  };

  /** Fetch violation by ID with relations */
  getViolationById = async (id: string) => {
    return await prismaClient.violation.findUnique({
      where: { id },
      include: this.violationInclude,
    });
  };

  /** Fetch all violations for a tenant */
  getViolationTenantId = async (tenantId: string) => {
    return await prismaClient.violation.findMany({
      where: { tenantId, isDeleted: false },
      include: this.violationInclude,
      orderBy: { createdAt: "desc" },
    });
  };

  /** Create a new violation record */
create = async (data: ViolationIF) => {
  return await prismaClient.violation.create({
    data: {
      description: data.description,
      noticeType: data.noticeType,
      deliveryMethod: data.deliveryMethod,
      severityLevel: data.severityLevel || SeverityLevel.LOW,
      actionTaken: data.actionTaken,
      dueDate: data.dueDate,
      tenant: { connect: { id: data.tenantId } },
      user: { connect: { id: data.createdById } },

      // Optional relationships
      ...(data.propertyId ? { property: { connect: { id: data.propertyId } } } : {}),
      ...(data.unitId ? { unit: { connect: { id: data.unitId } } } : {}),
    },
    include: this.violationInclude,
  });
};


  /** Soft delete violation */
  public async deleteViolation(id: string) {
    return await prismaClient.violation.update({
      where: { id },
      data: { isDeleted: true },
      include: this.violationInclude,
    });
  }

  /** Create a violation response for a given tenant */
  async createViolationResponse(data: ViolationResponseIF) {
    return await prismaClient.violationResponse.create({
      data: {
        violation: { connect: { id: data.violationId } },
        tenant: { connect: { id: data.tenantId } },
        responseType: data.responseType,
        paymentAmount: data.paymentAmount || undefined,
        paymentDate: data.paymentDate ? new Date(data.paymentDate) : undefined,
        paymentMethod: data.paymentMethod,
        reasonForDispute: data.reasonForDispute,
        evidenceUrl: data.evidenceUrl,
        additionalComment: data.additionalComment,
      },
      include: {
        violation: this.violationInclude,
        tenant: true,
      },
    });
  }

  /** Get response by ID */
  async getResponseById(id: string) {
    return await prismaClient.violationResponse.findUnique({
      where: { id },
      include: {
        violation: this.violationInclude,
        tenant: true,
      },
    });
  }

  /** Get all responses tied to a violation */
  async getResponseByViolationId(violationId: string) {
    return await prismaClient.violationResponse.findMany({
      where: { violationId },
      include: {
        violation: this.violationInclude,
        tenant: true,
      },
      orderBy: { createdAt: "desc" },
    });
  }

  /** Get all violation responses by a tenant */
  async getViolationResponseByTenantId(tenantId: string) {
    return await prismaClient.violationResponse.findMany({
      where: { tenantId },
      include: {
        violation: this.violationInclude,
        tenant: true,
      },
      orderBy: { createdAt: "desc" },
    });
  }

  /** Delete violation response */
  async delete(id: string) {
    return await prismaClient.violationResponse.delete({
      where: { id },
      include: {
        violation: this.violationInclude,
        tenant: true,
      },
    });
  }
}

export default new ViolationService();
