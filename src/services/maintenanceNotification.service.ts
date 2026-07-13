import { maintenanceDecisionStatus, maintenanceStatus } from '@prisma/client';
import NotificationService from './notification.service';

type MaintenanceSnapshot = {
  id: string;
  status?: maintenanceStatus | null;
  landlordDecision?: maintenanceDecisionStatus | null;
  landlordId?: string | null;
  tenantId?: string | null;
  tenant?: { userId?: string | null } | null;
  landlord?: { userId?: string | null; user?: { id?: string | null } | null } | null;
};

function statusNotification(
  status: maintenanceStatus,
  audience: 'tenant' | 'landlord'
): {
  title: string;
  message: string;
  notificationType: string;
} | null {
  switch (status) {
    case maintenanceStatus.ASSIGNED:
      return {
        title: 'Maintenance Update',
        message:
          audience === 'landlord'
            ? 'A vendor has been assigned to a maintenance request.'
            : 'A vendor has been assigned to your maintenance request.',
        notificationType: 'maintenance_status_change',
      };
    case maintenanceStatus.IN_PROGRESS:
      return {
        title: 'Maintenance In Progress',
        message:
          audience === 'landlord'
            ? 'Work on a maintenance request is now in progress.'
            : 'Work on your maintenance request is now in progress.',
        notificationType: 'maintenance_status_change',
      };
    case maintenanceStatus.COMPLETED:
      return {
        title: 'Maintenance Completed',
        message:
          audience === 'landlord'
            ? 'A maintenance request has been marked as completed.'
            : 'Your maintenance request has been marked as completed.',
        notificationType: 'maintenance_resolved',
      };
    case maintenanceStatus.CANCEL:
      return {
        title: 'Maintenance Cancelled',
        message:
          audience === 'landlord'
            ? 'A maintenance request has been cancelled.'
            : 'Your maintenance request has been cancelled.',
        notificationType: 'maintenance_status_change',
      };
    case maintenanceStatus.CANCELLATION_REQUEST:
      return {
        title: 'Cancellation Requested',
        message:
          audience === 'landlord'
            ? 'A cancellation was requested for a maintenance request.'
            : 'A cancellation request was submitted for your maintenance request.',
        notificationType: 'maintenance_status_change',
      };
    case maintenanceStatus.UNASSIGNED:
      return {
        title: 'Maintenance Update',
        message:
          audience === 'landlord'
            ? 'The vendor was unassigned from a maintenance request.'
            : 'The vendor was unassigned from your maintenance request.',
        notificationType: 'maintenance_status_change',
      };
    default:
      return null;
  }
}

function decisionNotification(
  decision: maintenanceDecisionStatus
): { title: string; message: string; notificationType: string } | null {
  if (decision === maintenanceDecisionStatus.APPROVED) {
    return {
      title: 'Maintenance Request Approved',
      message: 'Your landlord has approved your maintenance request.',
      notificationType: 'maintenance_status_change',
    };
  }
  if (decision === maintenanceDecisionStatus.DECLINED) {
    return {
      title: 'Maintenance Request Declined',
      message: 'Your landlord has declined your maintenance request.',
      notificationType: 'maintenance_status_change',
    };
  }
  return null;
}

function resolveLandlordUserId(snapshot: MaintenanceSnapshot): string | null {
  return (
    snapshot.landlord?.user?.id ||
    snapshot.landlord?.userId ||
    null
  );
}

export async function notifyLandlordNewMaintenanceRequest(
  maintenance: MaintenanceSnapshot,
  sourceUserId?: string | null
): Promise<void> {
  const landlordUserId = resolveLandlordUserId(maintenance);
  if (!landlordUserId) return;

  // Don't notify the landlord if they created the request themselves
  if (sourceUserId && sourceUserId === landlordUserId) return;

  await NotificationService.createNotification(
    {
      sourceId: sourceUserId ?? undefined,
      destId: landlordUserId,
      title: 'New Maintenance Request',
      message: 'A tenant submitted a new maintenance request that needs your attention.',
      notificationType: 'maintenance_new_request',
      route: `/service/maintenance/landlord/${maintenance.id}`,
      type: 'info',
      emitRealtime: true,
    },
    'MAINTENANCE_REQUESTS'
  );
}

export async function notifyTenantMaintenanceUpdate(
  before: MaintenanceSnapshot,
  after: MaintenanceSnapshot,
  sourceUserId?: string | null
): Promise<void> {
  const tenantUserId = after.tenant?.userId;
  const landlordUserId = resolveLandlordUserId(after);

  let tenantPayload: { title: string; message: string; notificationType: string } | null =
    null;
  let landlordPayload: { title: string; message: string; notificationType: string } | null =
    null;

  const decisionChanged =
    before.landlordDecision !== after.landlordDecision && after.landlordDecision;
  const statusChanged = before.status !== after.status && after.status;

  if (decisionChanged && after.landlordDecision) {
    // Decision changes are landlord actions → tenant only
    tenantPayload = decisionNotification(after.landlordDecision);
  } else if (statusChanged && after.status) {
    tenantPayload = statusNotification(after.status, 'tenant');
    landlordPayload = statusNotification(after.status, 'landlord');
  }

  if (tenantPayload && tenantUserId) {
    await NotificationService.createNotification(
      {
        sourceId: sourceUserId ?? undefined,
        destId: tenantUserId,
        title: tenantPayload.title,
        message: tenantPayload.message,
        notificationType: tenantPayload.notificationType,
        route: `/settings/shared/MaintenanceStatusScreen?id=${after.id}`,
        emitRealtime: true,
      },
      'MAINTENANCE_REQUESTS'
    );
  }

  if (
    landlordPayload &&
    landlordUserId &&
    landlordUserId !== sourceUserId &&
    landlordUserId !== tenantUserId
  ) {
    await NotificationService.createNotification(
      {
        sourceId: sourceUserId ?? undefined,
        destId: landlordUserId,
        title: landlordPayload.title,
        message: landlordPayload.message,
        notificationType: landlordPayload.notificationType,
        route: `/service/maintenance/landlord/${after.id}`,
        type: 'info',
        emitRealtime: true,
      },
      'MAINTENANCE_REQUESTS'
    );
  }
}
