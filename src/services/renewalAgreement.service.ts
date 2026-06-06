import { ApplicationStatus, LogType } from '@prisma/client';
import { prismaClient } from '..';
import applicantService from '../webuser/services/applicantService';
import logsServices from './logs.services';

type RenewalProposalWithRelations = {
  id: string;
  tenantId: string;
  propertyId: string;
  proposedRent: { toString(): string } | number;
  renewalTerms: unknown;
  tenant: {
    id: string;
    applicationId: string | null;
    user: { id: string; email: string; firstName?: string | null };
  };
  property: {
    id: string;
    name: string;
    landlord: {
      id: string;
      userId: string;
      user?: { id: string; email: string };
    };
  };
};

export type RenewalAgreementResult = {
  agreementDocumentId: string;
  applicationId: string;
};

function extractTemplateVariables(content: string): string[] {
  const tags = new Set<string>();
  const patterns = [/\{\{([^}]+)\}\}/g, /\[([a-zA-Z0-9:_-]+)\]/g];
  for (const pattern of patterns) {
    let match: RegExpExecArray | null;
    while ((match = pattern.exec(content)) !== null) {
      if (match[1]) tags.add(match[1].trim());
    }
  }
  return Array.from(tags);
}

async function resolveAgreementTemplate(
  applicationId: string,
  landlordUserId: string
): Promise<{ templateId: string; templateVersion: number; processedContent: string } | null> {
  const application = await prismaClient.application.findUnique({
    where: { id: applicationId },
    include: {
      agreementDocument: {
        orderBy: { createdAt: 'desc' },
        take: 1,
        include: {
          documentTemplate: {
            include: {
              versions: {
                where: { isDeleted: false },
                orderBy: { version: 'desc' },
                take: 1,
              },
            },
          },
        },
      },
    },
  });

  const lastAgreement = application?.agreementDocument?.[0];
  if (lastAgreement?.documentTemplate) {
    const version =
      lastAgreement.templateVersion ||
      lastAgreement.documentTemplate.versions?.[0]?.version ||
      1;
    const content = lastAgreement.documentTemplate.versions?.[0]?.content;
    if (content) {
      return {
        templateId: lastAgreement.documentTemplate.id,
        templateVersion: version,
        processedContent: content,
      };
    }
  }

  const defaultAssignment = await prismaClient.userDocuTemplate.findFirst({
    where: {
      userId: landlordUserId,
      isDefault: true,
      template: { isActive: true },
    },
    include: {
      template: {
        include: {
          versions: {
            where: { isDeleted: false },
            orderBy: { version: 'desc' },
            take: 1,
          },
        },
      },
    },
  });

  if (defaultAssignment?.template) {
    const version = defaultAssignment.template.versions?.[0]?.version || 1;
    const content = defaultAssignment.template.versions?.[0]?.content;
    if (content) {
      return {
        templateId: defaultAssignment.template.id,
        templateVersion: version,
        processedContent: content,
      };
    }
  }

  const anyAssignment = await prismaClient.userDocuTemplate.findFirst({
    where: {
      userId: landlordUserId,
      template: { isActive: true },
    },
    include: {
      template: {
        include: {
          versions: {
            where: { isDeleted: false },
            orderBy: { version: 'desc' },
            take: 1,
          },
        },
      },
    },
  });

  if (anyAssignment?.template) {
    const version = anyAssignment.template.versions?.[0]?.version || 1;
    const content = anyAssignment.template.versions?.[0]?.content;
    if (content) {
      return {
        templateId: anyAssignment.template.id,
        templateVersion: version,
        processedContent: content,
      };
    }
  }

  return null;
}

/**
 * When a renewal proposal is accepted, generate a fresh lease agreement on the
 * tenant's linked application so they can sign on mobile/web (same as initial lease).
 */
export async function createRenewalAgreementDocument(
  proposal: RenewalProposalWithRelations,
  overrides?: {
    proposedRent?: number;
    renewalTerms?: unknown;
  }
): Promise<RenewalAgreementResult | null> {
  const applicationId = proposal.tenant.applicationId;
  if (!applicationId) {
    console.warn(
      `Renewal ${proposal.id}: tenant ${proposal.tenantId} has no applicationId — skipping agreement generation`
    );
    return null;
  }

  const landlordUserId = proposal.property.landlord.userId;
  const template = await resolveAgreementTemplate(applicationId, landlordUserId);
  if (!template) {
    console.warn(
      `Renewal ${proposal.id}: no agreement template found for landlord ${landlordUserId}`
    );
    return null;
  }

  const terms = (overrides?.renewalTerms || proposal.renewalTerms || {}) as {
    startDate?: string;
    endDate?: string;
    duration?: string;
  };
  const leaseStartDate = terms.startDate ? new Date(terms.startDate) : undefined;
  const leaseEndDate = terms.endDate ? new Date(terms.endDate) : undefined;
  const proposedRent = Number(overrides?.proposedRent ?? proposal.proposedRent);

  await prismaClient.application.update({
    where: { id: applicationId },
    data: {
      ...(leaseStartDate && !Number.isNaN(leaseStartDate.getTime())
        ? { leaseStartDate, moveInDate: leaseStartDate }
        : {}),
      ...(leaseEndDate && !Number.isNaN(leaseEndDate.getTime()) ? { leaseEndDate } : {}),
      ...(terms.duration ? { leaseTerm: terms.duration } : {}),
      ...(Number.isFinite(proposedRent) ? { rentAmountPaid: proposedRent } : {}),
    },
  });

  const agreement = await applicantService.upsertAgreementDocument(
    {
      templateId: template.templateId,
      templateVersion: template.templateVersion,
      processedContent: template.processedContent,
      variables: extractTemplateVariables(template.processedContent),
      applicationId,
      metadata: {
        renewalProposalId: proposal.id,
        leaseStartDate: leaseStartDate?.toISOString(),
        leaseEndDate: leaseEndDate?.toISOString(),
        proposedRent,
        source: 'lease_renewal',
      },
    },
    landlordUserId
  );

  await applicantService.updateApplicationStatusStep(applicationId, ApplicationStatus.AGREEMENTS);

  await logsServices.createLog({
    applicationId,
    subjects: 'Renewal lease agreement ready',
    events: `A renewal lease agreement was generated for ${proposal.property.name}. Please sign in the app.`,
    createdById: proposal.tenant.user.id,
    type: LogType.ACTIVITY,
  });

  return {
    agreementDocumentId: agreement.id,
    applicationId,
  };
}
