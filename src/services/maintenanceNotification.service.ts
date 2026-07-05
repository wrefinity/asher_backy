import { maintenanceDecisionStatus, maintenanceStatus } from '@prisma/client';
import NotificationService from './notification.service';

type MaintenanceSnapshot = {
  id: string;
  status?: maintenanceStatus | null;
  landlordDecision?: maintenanceDecisionStatus | null;
  tenant?: { userId?: string | null } | null;
};

function statusNotification(status: maintenanceStatus): {
  title: string;
  message: string;
  notificationType: string;
} | null {
  switch (status) {
    case maintenanceStatus.ASSIGNED:
      return {
        title: 'Maintenance Update',
        message: 'A vendor has been assigned to your maintenance request.',
        notificationType: 'maintenance_status_change',
      };
    case maintenanceStatus.IN_PROGRESS:
      return {
        title: 'Maintenance In Progress',
        message: 'Work on your maintenance request is now in progress.',
        notificationType: 'maintenance_status_change',
      };
    case maintenanceStatus.COMPLETED:
      return {
        title: 'Maintenance Completed',
        message: 'Your maintenance request has been marked as completed.',
        notificationType: 'maintenance_resolved',
      };
    case maintenanceStatus.CANCEL:
      return {
        title: 'Maintenance Cancelled',
        message: 'Your maintenance request has been cancelled.',
        notificationType: 'maintenance_status_change',
      };
    case maintenanceStatus.CANCELLATION_REQUEST:
      return {
        title: 'Cancellation Requested',
        message: 'A cancellation request was submitted for your maintenance request.',
        notificationType: 'maintenance_status_change',
      };
    case maintenanceStatus.UNASSIGNED:
      return {
        title: 'Maintenance Update',
        message: 'The vendor was unassigned from your maintenance request.',
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

export async function notifyTenantMaintenanceUpdate(
  before: MaintenanceSnapshot,
  after: MaintenanceSnapshot,
  sourceUserId?: string | null
): Promise<void> {
  const tenantUserId = after.tenant?.userId;
  if (!tenantUserId) return;

  let payload: { title: string; message: string; notificationType: string } | null = null;

  if (
    before.landlordDecision !== after.landlordDecision &&
    after.landlordDecision
  ) {
    payload = decisionNotification(after.landlordDecision);
  } else if (before.status !== after.status && after.status) {
    payload = statusNotification(after.status);
  }

  if (!payload) return;

  await NotificationService.createNotification(
    {
      sourceId: sourceUserId ?? undefined,
      destId: tenantUserId,
      title: payload.title,
      message: payload.message,
      notificationType: payload.notificationType,
      route: `/settings/shared/MaintenanceStatusScreen?id=${after.id}`,
    },
    'MAINTENANCE_REQUESTS'
  );
}
