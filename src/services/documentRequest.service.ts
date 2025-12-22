import { prismaClient } from "..";
import { PropertyDocumentService } from "./propertyDocument.service";
import { DocumentType } from "@prisma/client";
import NotificationService from "./notification.service";
import { NotificationCategory } from "@prisma/client";

export interface CreateDocumentRequestDTO {
  documentName: string;
  documentCategory: string;
  type: string;
  dueDate: Date;
  tenantId: string;
  propertyId: string;
  landlordId: string;
  requestedBy?: string;
  applicationId?: string;
}

class DocumentRequestService {
  private propertyDocumentService = new PropertyDocumentService();

  /**
   * Create a document request using propertyDocument model
   * A request is represented as a propertyDocument with empty documentUrl array
   */
  createRequest = async (data: CreateDocumentRequestDTO) => {
    // Get tenant to find applicationId
    const tenant = await prismaClient.tenants.findUnique({
      where: { id: data.tenantId },
      include: { application: true },
    });

    if (!tenant) {
      throw new Error("Tenant not found");
    }

    const applicationId = data.applicationId || tenant.applicationId;
    if (!applicationId) {
      throw new Error("Tenant application not found");
    }

    // Map documentCategory to DocumentType enum
    const docType = this.mapCategoryToDocumentType(data.documentCategory);

    // Create propertyDocument with empty documentUrl to represent a request
    // isPublished=false indicates it's a pending request
    const documentRequest = await this.propertyDocumentService.create({
      documentName: data.documentName,
      documentUrl: [], // Empty array = request, not yet uploaded
      type: data.type,
      size: null,
      docType: docType,
      isPublished: false, // false = pending request
      application: {
        connect: { id: applicationId },
      },
      properties: {
        connect: { id: data.propertyId },
      },
      ...(data.requestedBy && {
        users: {
          connect: { id: data.requestedBy },
        },
      }),
      systemId: "4", // Rent Mgmt system
    });

    // Send notification to tenant
    if (tenant.userId) {
      await NotificationService.createNotification({
        sourceId: data.requestedBy,
        destId: tenant.userId,
        title: "New Document Request",
        message: `Your landlord has requested ${data.documentName}. Please upload by ${new Date(data.dueDate).toLocaleDateString()}.`,
        category: NotificationCategory.COMMUNICATION,
      });
    }

    return documentRequest;
  };

  /**
   * Get document requests for a tenant (documents with empty documentUrl)
   */
  getRequestsByTenant = async (tenantId: string) => {
    const tenant = await prismaClient.tenants.findUnique({
      where: { id: tenantId },
      include: { application: true },
    });

    if (!tenant || !tenant.applicationId) {
      return [];
    }

    return prismaClient.propertyDocument.findMany({
      where: {
        applicationId: tenant.applicationId,
        documentUrl: { isEmpty: true }, // Empty array = request
        isPublished: false,
      },
      include: {
        users: {
          include: {
            profile: true,
          },
        },
        properties: true,
        application: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    });
  };

  /**
   * Get document requests for a landlord
   */
  getRequestsByLandlord = async (landlordId: string) => {
    return prismaClient.propertyDocument.findMany({
      where: {
        properties: {
          landlordId: landlordId,
        },
        documentUrl: { isEmpty: true }, // Empty array = request
        isPublished: false,
      },
      include: {
        users: {
          include: {
            profile: true,
          },
        },
        properties: true,
        application: {
          include: {
            tenant: {
              include: {
                user: {
                  include: {
                    profile: true,
                  },
                },
              },
            },
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });
  };

  /**
   * Map document category string to DocumentType enum
   */
  private mapCategoryToDocumentType = (category: string): DocumentType => {
    const categoryMap: Record<string, DocumentType> = {
      ID_DOCUMENT: DocumentType.ID,
      PROOF_OF_INCOME: DocumentType.INCOME_PROOF,
      BANK_STATEMENTS: DocumentType.BANK_STATEMENT,
      PROOF_OF_ADDRESS: DocumentType.ADDRESS_PROOF,
      PROOF_OF_BENEFITS: DocumentType.ADDITIONAL,
      LEASE_AGREEMENT: DocumentType.AGREEMENT_DOC,
      OTHER: DocumentType.OTHER,
    };

    return categoryMap[category] || DocumentType.OTHER;
  };
}

export default new DocumentRequestService();
