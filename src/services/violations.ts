import { prismaClient } from "..";
import { SeverityLevel } from "@prisma/client";
import {
  ViolationResponseIF,
  ViolationIF,
} from "../validations/interfaces/violation.interface";
import { ApiError } from "../utils/ApiError";

class ViolationService {
  private violationInclude: any;

  constructor() {
    this.violationInclude = {
      tenant: {
        include: {
          user: {
            select: {
              id: true,
              email: true,
              name: true,
              profile: true,
            },
          },
        },
      },
      property: true,
      unit: true,
      user: {
        select: {
          id: true,
          email: true,
          role: true,
          profile: true,
        },
      },
      ViolationResponse: true
    };
  }

  /** Fetch all tenant violations created by a landlord */
  getLandlordTenantViolation = async (landlordUserId: string) => {
    return await prismaClient.violation.findMany({
      where: {
        createdById: landlordUserId,
        isDeleted: false,
      },
      include: this.violationInclude,
      orderBy: { createdAt: "desc" },
    });
  };
  getTenantViolation = async (tenantId: string) => {
    return await prismaClient.violation.findMany({
      where: {
        tenantId: tenantId,
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

  async getTenantViolationDashboard(tenantId: string) {
    if (!tenantId) throw ApiError.badRequest("Tenant ID is required");

    // Fetch all tenant violations
    const violations = await prismaClient.violation.findMany({
      where: { tenantId },
      include: {
        ViolationResponse: true,
      },
      orderBy: { createdAt: "desc" },
    });

    // Compute dashboard metrics
    const totalNotices = violations.length;
    const activeNotices = violations.filter(v => v.status !== "DELIVERED").length;
    const pendingResponse = violations.filter(
      v => !v.ViolationResponse || v.ViolationResponse.length === 0
    ).length;
    const resolved = violations.filter(v => v.status === "DELIVERED").length;

    // Extract recent notices (latest 5)
    const recentNotices = violations.slice(0, 5).map(v => ({
      id: v.id,
      title: v.noticeType?.replace(/_/g, " ") || "Unknown Notice",
      dateIssued: v.createdAt,
      description: v.description,
      dueDate: v.dueDate,
      severityLevel: v.severityLevel,
      status: v.status || "PENDING",
      responseStatus: v.ViolationResponse?.[0]?.responseType || "No Response",
    }));

    // Return dashboard data
    return {
      stats: {
        totalNotices,
        activeNotices,
        pendingResponse,
        resolved,
      },
      recentNotices,
    };
  }

}

export default new ViolationService();
