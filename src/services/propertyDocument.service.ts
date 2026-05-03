import { prismaClient } from '..';
import { Prisma, DocumentType } from '@prisma/client';

export type LandlordDocumentListOptions = {
  docType?: DocumentType | null;
  bucket?: 'active' | 'trash';
  userId?: string;
};

export class PropertyDocumentService {
  create = async (data: Prisma.propertyDocumentCreateInput) => {
    return prismaClient.propertyDocument.create({ data });
  };

  findAll = async (propertyId: string) => {
    return prismaClient.propertyDocument.findMany({
      where: {
        propertyId,
        deletedAt: null,
        purgedAt: null,
      },
      include: {
        users: true,
        properties: true,
      },
    });
  };

  findById = async (id: string) => {
    return prismaClient.propertyDocument.findUnique({
      where: { id },
      include: {
        users: true,
        properties: true,
      },
    });
  };

  update = async (
    id: string,
    data: Partial<Prisma.propertyDocumentUpdateInput>
  ) => {
    return prismaClient.propertyDocument.update({
      where: { id },
      data: data as any,
    });
  };

  /** Landlord-accessible only — excludes rows purged from landlord view (audit retained). */
  findDocumentForLandlord = async (documentId: string, landlordId: string) => {
    return prismaClient.propertyDocument.findFirst({
      where: {
        id: documentId,
        purgedAt: null,
        users: {
          landlords: { id: landlordId },
        },
      },
    });
  };

  softDeleteForLandlord = async (id: string, landlordId: string) => {
    const doc = await this.findDocumentForLandlord(id, landlordId);
    if (!doc) {
      throw Object.assign(new Error('NOT_FOUND'), { statusCode: 404 });
    }
    if (doc.deletedAt) {
      return doc;
    }
    return prismaClient.propertyDocument.update({
      where: { id },
      data: { deletedAt: new Date() },
      include: {
        users: true,
        properties: true,
      },
    });
  };

  restoreForLandlord = async (id: string, landlordId: string) => {
    const doc = await this.findDocumentForLandlord(id, landlordId);
    if (!doc) {
      throw Object.assign(new Error('NOT_FOUND'), { statusCode: 404 });
    }
    if (!doc.deletedAt) {
      return doc;
    }
    return prismaClient.propertyDocument.update({
      where: { id },
      data: { deletedAt: null },
      include: {
        users: true,
        properties: true,
      },
    });
  };

  setFavoriteForLandlord = async (
    userId: string,
    documentId: string,
    favorite: boolean,
    landlordId: string
  ) => {
    const doc = await this.findDocumentForLandlord(documentId, landlordId);
    if (!doc) {
      throw Object.assign(new Error('NOT_FOUND'), { statusCode: 404 });
    }
    if (doc.deletedAt) {
      const err = Object.assign(new Error('INVALID_STATE'), {
        statusCode: 400,
      });
      throw err;
    }
    if (favorite) {
      await prismaClient.propertyDocumentFavorite.upsert({
        where: {
          userId_documentId: { userId, documentId },
        },
        create: { userId, documentId },
        update: {},
      });
    } else {
      await prismaClient.propertyDocumentFavorite.deleteMany({
        where: { userId, documentId },
      });
    }
    return { documentId, favorite };
  };

  getDocumentBaseOnLandlordAndStatus = async (
    landlordId: string,
    docType: DocumentType
  ) => {
    return prismaClient.propertyDocument.findFirst({
      where: {
        docType,
        deletedAt: null,
        purgedAt: null,
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
        deletedAt: null,
        purgedAt: null,
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
    return await prismaClient.propertyDocument.findMany({
      where: {
        uploadedBy: currentUserId,
        deletedAt: null,
        purgedAt: null,
        ...(docType !== undefined ? { docType } : {}),
      },
      include: {
        application: true,
        users: true,
      },
    });
  };

  getDocumentLandlordAndStatuses = async (
    landlordId: string,
    options: LandlordDocumentListOptions = {}
  ) => {
    const bucket = options.bucket ?? 'active';
    const deletedClause: Prisma.propertyDocumentWhereInput =
      bucket === 'trash'
        ? { deletedAt: { not: null } }
        : { deletedAt: null };

    const docs = await prismaClient.propertyDocument.findMany({
      where: {
        purgedAt: null,
        ...deletedClause,
        ...(options.docType !== undefined &&
          options.docType !== null && { docType: options.docType }),
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
          },
        },
        properties: true,
        application: true,
        ...(options.userId
          ? {
              favorites: {
                where: { userId: options.userId },
                select: { id: true },
              },
            }
          : {}),
      },
    });

    return docs.map(d => {
      const { favorites, ...rest } = d as typeof d & {
        favorites?: { id: string }[];
      };
      return {
        ...rest,
        isFavorite: options.userId
          ? (favorites?.length ?? 0) > 0
          : false,
      };
    });
  };

  /**
   * Landlord “permanent delete”: hide from all landlord UI forever.
   * Row stays in DB (`purgedAt`) for audit / logs.
   */
  permanentDeleteTrashedForLandlord = async (
    id: string,
    landlordId: string
  ) => {
    const doc = await this.findDocumentForLandlord(id, landlordId);
    if (!doc) {
      throw Object.assign(new Error('NOT_FOUND'), { statusCode: 404 });
    }
    if (!doc.deletedAt) {
      throw Object.assign(new Error('NOT_TRASHED'), { statusCode: 400 });
    }
    return prismaClient.propertyDocument.update({
      where: { id },
      data: { purgedAt: new Date() },
      include: {
        users: true,
        properties: true,
      },
    });
  };

  /** Purge all trashed (non-purged) documents for this landlord from their view. */
  emptyTrashForLandlord = async (landlordId: string) => {
    const result = await prismaClient.propertyDocument.updateMany({
      where: {
        purgedAt: null,
        deletedAt: { not: null },
        users: {
          landlords: { id: landlordId },
        },
      },
      data: { purgedAt: new Date() },
    });
    return { purgedCount: result.count };
  };
}
