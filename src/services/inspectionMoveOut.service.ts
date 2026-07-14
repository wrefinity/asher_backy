import { prismaClient } from '..';
import InspectionService from './inspection.services';

class InspectionMoveOutService {
  async findInspectionForNotice(noticeId: string, tenantId: string) {
    return prismaClient.inspection.findFirst({
      where: {
        tenantId,
        OR: [
          { moveOutNoticeId: noticeId },
          // Legacy rows linked via notes before moveOutNoticeId existed
          { generalNotes: { contains: noticeId } },
        ],
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async createMoveOutInspection(params: {
    tenantId: string;
    propertyId: string;
    landlordId: string;
    noticeId: string;
    intendedMoveOutDate: Date;
    reason: string;
    comments?: string | null;
  }) {
    const existing = await this.findInspectionForNotice(params.noticeId, params.tenantId);
    if (existing) {
      return existing;
    }

    const landlord = await prismaClient.landlords.findUnique({
      where: { id: params.landlordId },
      include: {
        user: {
          select: {
            id: true,
            profile: {
              select: {
                fullname: true,
                firstName: true,
                lastName: true,
              },
            },
          },
        },
      },
    });

    const inspectorName =
      landlord?.user?.profile?.fullname ||
      [landlord?.user?.profile?.firstName, landlord?.user?.profile?.lastName]
        .filter(Boolean)
        .join(' ') ||
      'Landlord';

    const commentsNote = params.comments?.trim()
      ? ` Comments: ${params.comments.trim()}`
      : '';

    return InspectionService.createInspection({
      propertyId: params.propertyId,
      tenantId: params.tenantId,
      type: 'Move-out Inspection',
      trigger: 'MOVE_OUT',
      moveOutNoticeId: params.noticeId,
      // Date/time set when landlord confirms schedule (Draft has none yet)
      scheduledDate: undefined,
      scheduledTime: undefined,
      inspector: inspectorName,
      inspectorId: landlord?.user?.id,
      status: 'Draft',
      priority: 'High',
      generalNotes: `Move-out draft from notice. Reason: ${params.reason}.${commentsNote}`,
    });
  }
}

export default new InspectionMoveOutService();
