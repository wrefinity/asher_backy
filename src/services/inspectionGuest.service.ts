import crypto from 'crypto';
import { prismaClient } from '..';
import { FRONTEND_URL } from '../secrets';
import sendMail from '../utils/emailer';
import InspectionService from './inspection.services';
import { getTemplateSectionsPayloadForType } from '../data/inspectionTemplates';

function hashToken(rawToken: string) {
  return crypto.createHash('sha256').update(rawToken).digest('hex');
}

function createRawToken() {
  return crypto.randomBytes(32).toString('hex');
}

const inspectionInclude = {
  property: {
    select: { id: true, name: true, address: true, city: true, landlordId: true },
  },
  sections: {
    include: {
      items: {
        include: { photos: true },
      },
    },
  },
} as const;

class InspectionGuestService {
  resolvePortalByToken = async (rawToken: string) => {
    const tokenHash = hashToken(rawToken);
    let portal = await prismaClient.inspectionGuestPortal.findFirst({
      where: { accessTokenHash: tokenHash },
    });

    // Legacy fallback: single-inspection token before portal model
    if (!portal) {
      const legacy = await prismaClient.inspection.findFirst({
        where: { guestAccessTokenHash: tokenHash },
        select: {
          id: true,
          guestInspectorEmail: true,
          guestInspectorName: true,
          guestTokenExpiresAt: true,
          guestPortalId: true,
          property: { select: { landlordId: true } },
        },
      });
      if (!legacy?.guestInspectorEmail || !legacy.property?.landlordId) {
        throw new Error('INVALID_TOKEN');
      }
      if (
        legacy.guestTokenExpiresAt &&
        legacy.guestTokenExpiresAt.getTime() < Date.now()
      ) {
        throw new Error('TOKEN_EXPIRED');
      }

      if (legacy.guestPortalId) {
        portal = await prismaClient.inspectionGuestPortal.findUnique({
          where: { id: legacy.guestPortalId },
        });
      }

      if (!portal) {
        portal = await prismaClient.inspectionGuestPortal.upsert({
          where: {
            landlordId_email: {
              landlordId: legacy.property.landlordId,
              email: legacy.guestInspectorEmail.toLowerCase(),
            },
          },
          create: {
            landlordId: legacy.property.landlordId,
            email: legacy.guestInspectorEmail.toLowerCase(),
            name: legacy.guestInspectorName || 'Inspector',
            accessTokenHash: tokenHash,
            expiresAt:
              legacy.guestTokenExpiresAt ||
              new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
          },
          update: {
            accessTokenHash: tokenHash,
            name: legacy.guestInspectorName || 'Inspector',
            expiresAt:
              legacy.guestTokenExpiresAt ||
              new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
          },
        });
        await prismaClient.inspection.update({
          where: { id: legacy.id },
          data: { guestPortalId: portal.id },
        });
      }
    }

    if (!portal) throw new Error('INVALID_TOKEN');
    if (portal.expiresAt.getTime() < Date.now()) {
      throw new Error('TOKEN_EXPIRED');
    }
    return portal;
  };

  listPortalJobs = async (rawToken: string) => {
    const portal = await this.resolvePortalByToken(rawToken);
    const inspections = await prismaClient.inspection.findMany({
      where: {
        OR: [
          { guestPortalId: portal.id },
          {
            guestInspectorEmail: portal.email,
            property: { landlordId: portal.landlordId },
          },
        ],
        status: { notIn: ['Draft', 'Cancelled'] },
      },
      include: {
        property: {
          select: { id: true, name: true, address: true, city: true },
        },
      },
      orderBy: [{ scheduledDate: 'asc' }, { createdAt: 'asc' }],
    });

    const open = inspections.filter((i) => !i.guestFormSubmittedAt);
    const submitted = inspections.filter((i) => !!i.guestFormSubmittedAt);

    return {
      portal: {
        id: portal.id,
        name: portal.name,
        email: portal.email,
        expiresAt: portal.expiresAt,
      },
      open,
      submitted,
      remainingCount: open.length,
    };
  };

  resolveInspectionForPortal = async (
    rawToken: string,
    inspectionId: string
  ) => {
    const portal = await this.resolvePortalByToken(rawToken);
    const inspection = await prismaClient.inspection.findFirst({
      where: {
        id: inspectionId,
        OR: [
          { guestPortalId: portal.id },
          {
            guestInspectorEmail: portal.email,
            property: { landlordId: portal.landlordId },
          },
        ],
      },
      include: inspectionInclude,
    });

    if (!inspection) throw new Error('INSPECTION_NOT_FOUND');
    if (['Completed', 'Cancelled', 'Draft'].includes(inspection.status || '')) {
      throw new Error('INSPECTION_NOT_OPENABLE');
    }
    return { portal, inspection };
  };

  /** @deprecated prefer resolveInspectionForPortal — kept for old single-token links */
  resolveInspectionByToken = async (rawToken: string) => {
    const portal = await this.resolvePortalByToken(rawToken);
    const jobs = await this.listPortalJobs(rawToken);
    const target =
      jobs.open[0] ||
      jobs.submitted[0] ||
      null;
    if (!target) throw new Error('INSPECTION_NOT_FOUND');
    const { inspection } = await this.resolveInspectionForPortal(
      rawToken,
      target.id
    );
    return inspection;
  };

  inviteGuest = async (params: {
    inspectionIds: string[];
    landlordId: string;
    email: string;
    name: string;
    expiresInDays?: number;
    sendEmail?: boolean;
  }) => {
    const email = params.email.trim().toLowerCase();
    const name = params.name.trim() || 'Inspector';
    if (!email || !email.includes('@')) {
      throw new Error('INVALID_EMAIL');
    }
    const ids = [...new Set(params.inspectionIds.filter(Boolean))];
    if (ids.length === 0) throw new Error('INSPECTION_NOT_FOUND');

    const inspections = await prismaClient.inspection.findMany({
      where: { id: { in: ids } },
      include: {
        property: {
          select: { id: true, name: true, address: true, landlordId: true },
        },
      },
    });

    if (inspections.length !== ids.length) {
      throw new Error('INSPECTION_NOT_FOUND');
    }
    for (const inspection of inspections) {
      if (inspection.property.landlordId !== params.landlordId) {
        throw new Error('INSPECTION_NOT_FOUND');
      }
      if (['Draft', 'Cancelled', 'Completed'].includes(inspection.status || '')) {
        throw new Error('INSPECTION_NOT_INVITABLE');
      }
    }

    const expiresInDays = Math.min(Math.max(params.expiresInDays || 14, 1), 60);
    const expiresAt = new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000);

    const existingPortal = await prismaClient.inspectionGuestPortal.findUnique({
      where: {
        landlordId_email: {
          landlordId: params.landlordId,
          email,
        },
      },
    });

    // Reuse existing raw-equivalent access: rotate token so fresh invites work
    const rawToken = createRawToken();
    const portal = await prismaClient.inspectionGuestPortal.upsert({
      where: {
        landlordId_email: {
          landlordId: params.landlordId,
          email,
        },
      },
      create: {
        landlordId: params.landlordId,
        email,
        name,
        accessTokenHash: hashToken(rawToken),
        expiresAt,
      },
      update: {
        name,
        accessTokenHash: hashToken(rawToken),
        expiresAt,
      },
    });

    for (const inspection of inspections) {
      await prismaClient.inspection.update({
        where: { id: inspection.id },
        data: {
          guestInspectorEmail: email,
          guestInspectorName: name,
          guestPortalId: portal.id,
          guestAccessTokenHash: hashToken(rawToken),
          guestTokenExpiresAt: expiresAt,
          guestFormSubmittedAt: null,
          inspector: name,
          inspectorId: null,
          inspectorSignature: null,
        },
      });

      const existingSections = await prismaClient.inspectionSection.findMany({
        where: { inspectionId: inspection.id },
        include: { items: true },
      });
      const hasItems = existingSections.some((s) => s.items.length > 0);
      if (!hasItems) {
        await InspectionService.saveSections(
          inspection.id,
          getTemplateSectionsPayloadForType(inspection.type)
        );
      }
    }

    const link = `${FRONTEND_URL}/guest/inspect/${rawToken}`;
    const propertyLines = inspections
      .map((i) => {
        const when = i.scheduledDate
          ? new Date(i.scheduledDate).toLocaleDateString('en-GB')
          : 'TBC';
        const time = i.scheduledTime ? ` at ${i.scheduledTime}` : '';
        return `<li><strong>${i.property.name || 'Property'}</strong>${
          i.property.address ? ` (${i.property.address})` : ''
        } — ${i.type || 'Inspection'} · ${when}${time}</li>`;
      })
      .join('');

    if (params.sendEmail !== false) {
      await sendMail(
        email,
        inspections.length > 1
          ? `Inspection assignments (${inspections.length})`
          : `Inspection assignment: ${inspections[0].property.name || 'Property'}`,
        `<p>Hello ${name},</p>
         <p>You have been invited to complete ${
           inspections.length > 1
             ? `${inspections.length} property inspections`
             : 'a property inspection'
         }.</p>
         <ul>${propertyLines}</ul>
         <p>Open this secure link to view your assignments and start each inspection:</p>
         <p><a href="${link}">${link}</a></p>
         <p>This link expires on ${expiresAt.toLocaleDateString('en-GB')}.</p>
         <p>Thank you,<br/>Asher Property</p>`
      );
    }

    return {
      portalId: portal.id,
      guestInspectorEmail: email,
      guestInspectorName: name,
      guestTokenExpiresAt: expiresAt,
      inspectionIds: inspections.map((i) => i.id),
      reusedPortal: Boolean(existingPortal),
      inviteLinkPreview: link.replace(rawToken, '***'),
    };
  };

  assertGuestCanEdit = (inspection: {
    guestFormSubmittedAt?: Date | null;
  }) => {
    if (inspection.guestFormSubmittedAt) {
      throw new Error('GUEST_ALREADY_SUBMITTED');
    }
  };

  saveGuestSections = async (
    rawToken: string,
    inspectionId: string,
    sections: any[]
  ) => {
    const { inspection } = await this.resolveInspectionForPortal(
      rawToken,
      inspectionId
    );
    this.assertGuestCanEdit(inspection);
    if (inspection.status === 'Scheduled' || inspection.status === 'Not Started') {
      await InspectionService.updateInspection(inspection.id, {
        status: 'In Progress',
      });
    }
    return InspectionService.saveSections(inspection.id, sections);
  };

  submitGuestForm = async (
    rawToken: string,
    inspectionId: string,
    inspectorSignature?: string
  ) => {
    const { portal, inspection } = await this.resolveInspectionForPortal(
      rawToken,
      inspectionId
    );
    this.assertGuestCanEdit(inspection);
    if (!inspectorSignature?.trim()) {
      throw new Error('INSPECTOR_SIGNATURE_REQUIRED');
    }

    const updated = await prismaClient.inspection.update({
      where: { id: inspection.id },
      data: {
        guestFormSubmittedAt: new Date(),
        status: 'In Progress',
        inspectorSignature: String(inspectorSignature).trim(),
      },
      include: {
        property: { select: { id: true, name: true, landlordId: true } },
      },
    });

    const remainingCount = await prismaClient.inspection.count({
      where: {
        OR: [
          { guestPortalId: portal.id },
          {
            guestInspectorEmail: portal.email,
            property: { landlordId: portal.landlordId },
          },
        ],
        guestFormSubmittedAt: null,
        status: { notIn: ['Draft', 'Cancelled', 'Completed'] },
        NOT: { id: updated.id },
      },
    });

    return { updated, remainingCount };
  };
}

export default new InspectionGuestService();
