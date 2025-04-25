import { IPropertyDocument } from '../validations/interfaces/properties.interface';
import { prismaClient } from "..";
import { Prisma, DocumentType } from '@prisma/client';

export class PropertyDocumentService {

  create = async (data: Prisma.propertyDocumentCreateInput) => {
    return prismaClient.propertyDocument.create({ data });
  }

  findAll = async (propertyId) => {
    return prismaClient.propertyDocument.findMany({
      where: {
        propertyId
      },
      include: {
        users: true,
        properties: true,
      }
    });
  }

  findById = async (id: string) => {
    return prismaClient.propertyDocument.findUnique({
      where: { id },
      include: {
        users: true,
        properties: true,
      }
    });
  }

  update = async (id: string, data: Partial<Prisma.propertyDocumentUpdateInput>) => {
    return prismaClient.propertyDocument.update({
      where: { id },
      data: data as any,
    });
  }

  delete = async (id: string) => {
    return prismaClient.propertyDocument.delete({
      where: { id },
      include: {
        users: true,
        properties: true,
      }
    });
  }
  getDocumentBaseOnLandlordAndStatus = async (
    landlordId: string,
    docType: DocumentType
  ) => {
    return prismaClient.propertyDocument.findFirst({
      where: {
        docType,
        users: {
          landlords: {
            id: landlordId,
          },
        },
      },
      include: {
        users: true,
        properties: true,
      },
    });
  };
  getManyDocumentBaseOnLandlord = async (
    landlordId: string,
    docType: DocumentType
  ) => {
    return prismaClient.propertyDocument.findMany({
      where: {
        docType,
        users: {
          landlords: {
            id: landlordId,
          },
        },
      },
      include: {
        users: true,
        properties: true,
      },
    });
  };
  getManyDocumentBaseOnTenant = async (
    currentUserId: string,
    docType?: DocumentType
  ) => {
    // Fetch documents linked to the tenant's application or uploaded by them
    return await prismaClient.propertyDocument.findMany({
      where: {
        uploadedBy: currentUserId
      },
      include: {
        application: true,
        users: true,
      },
    })
  };
  getDocumentLandlordAndStatuses = async (
    landlordId: string,
    docType?: DocumentType | null
  ) => {
    return prismaClient.propertyDocument.findMany({
      where: {
        // handle optional docType
        ...(docType !== undefined && { docType }),
        users: {
          landlords: {
            id: landlordId,
          },
        },
      },
      include: {
        users: {
          select: {
            email: true,
            id: true,
            profile: true,
          }
        },
        properties: true,
        application: true
      },
    });
  };
}
