import { prismaClient } from '..';
import InspectionService from './inspection.services';

class InspectionMoveOutService {
  private buildMoveOutNotes(noticeId: string, reason: string, comments?: string | null) {
    const base = `Auto-created from move-out notice ${noticeId}. Reason: ${reason}`;
    return comments?.trim() ? `${base}. Comments: ${comments.trim()}` : base;
  }

  async findInspectionForNotice(noticeId: string, tenantId: string) {
    return prismaClient.inspection.findFirst({
      where: {
        tenantId,
        generalNotes: { contains: noticeId },
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

    return InspectionService.createInspection({
      propertyId: params.propertyId,
      tenantId: params.tenantId,
      type: 'Move-out Inspection',
      scheduledDate: params.intendedMoveOutDate,
      scheduledTime: '10:00',
      inspector: inspectorName,
      inspectorId: landlord?.user?.id,
      status: 'Scheduled',
      priority: 'High',
      generalNotes: this.buildMoveOutNotes(
        params.noticeId,
        params.reason,
        params.comments
      ),
    });
  }
}

export default new InspectionMoveOutService();
