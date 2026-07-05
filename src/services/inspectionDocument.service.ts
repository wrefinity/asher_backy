import { DocumentType } from '@prisma/client';
import { prismaClient } from '..';

class InspectionDocumentService {
  /**
   * Persist an inspection certificate PDF in the property documents library
   * so it appears for landlord and tenant document views.
   */
  saveCertificateDocument = async (params: {
    inspectionId: string;
    pdfUrl: string;
    certificateType: 'landlord' | 'tenant';
    generatedByUserId: string;
  }) => {
    const inspection = await prismaClient.inspection.findUnique({
      where: { id: params.inspectionId },
      include: {
        property: true,
        tenant: {
          select: {
            applicationId: true,
            userId: true,
          },
        },
      },
    });

    if (!inspection) {
      throw new Error('Inspection not found');
    }

    const typeLabel = inspection.type?.trim() || 'Property Inspection';
    const roleLabel = params.certificateType === 'tenant' ? 'Tenant' : 'Landlord';
    const documentName = `Inspection Certificate (${roleLabel}) - ${typeLabel}`;

    const existing = await prismaClient.propertyDocument.findFirst({
      where: {
        propertyId: inspection.propertyId,
        documentName,
        deletedAt: null,
        purgedAt: null,
        ...(inspection.tenant?.applicationId
          ? { applicationId: inspection.tenant.applicationId }
          : {}),
      },
      orderBy: { createdAt: 'desc' },
    });

    const documentData = {
      documentName,
      documentUrl: [params.pdfUrl],
      type: 'application/pdf',
      size: null as string | null,
      docType: DocumentType.OTHER,
      isPublished: true,
      systemId: '1',
      propertyId: inspection.propertyId,
      applicationId: inspection.tenant?.applicationId || null,
      uploadedBy: params.generatedByUserId,
    };

    if (existing) {
      return prismaClient.propertyDocument.update({
        where: { id: existing.id },
        data: {
          documentUrl: [params.pdfUrl],
          isPublished: true,
          uploadedBy: params.generatedByUserId,
        },
      });
    }

    return prismaClient.propertyDocument.create({
      data: documentData,
    });
  };
}

export default new InspectionDocumentService();
