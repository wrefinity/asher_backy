import { maintenanceDecisionStatus, maintenanceStatus } from '@prisma/client';
import { notifyUser } from './notify';

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
  type: 'maintenance_status_change' | 'maintenance_resolved';
} | null {
  switch (status) {
    case maintenanceStatus.ASSIGNED:
      return {
        title: 'Maintenance Update',
        message:
          audience === 'landlord'
            ? 'A vendor has been assigned to a maintenance request.'
            : 'A vendor has been assigned to your maintenance request.',
        type: 'maintenance_status_change',
      };
    case maintenanceStatus.IN_PROGRESS:
      return {
        title: 'Maintenance In Progress',
        message:
          audience === 'landlord'
            ? 'Work on a maintenance request is now in progress.'
            : 'Work on your maintenance request is now in progress.',
        type: 'maintenance_status_change',
      };
    case maintenanceStatus.COMPLETED:
      return {
        title: 'Maintenance Completed',
        message:
          audience === 'landlord'
            ? 'A maintenance request has been marked as completed.'
            : 'Your maintenance request has been marked as completed.',
        type: 'maintenance_resolved',
      };
    case maintenanceStatus.CANCEL:
      return {
        title: 'Maintenance Cancelled',
        message:
          audience === 'landlord'
            ? 'A maintenance request has been cancelled.'
            : 'Your maintenance request has been cancelled.',
        type: 'maintenance_status_change',
      };
    case maintenanceStatus.CANCELLATION_REQUEST:
      return {
        title: 'Cancellation Requested',
        message:
          audience === 'landlord'
            ? 'A cancellation was requested for a maintenance request.'
            : 'A cancellation request was submitted for your maintenance request.',
        type: 'maintenance_status_change',
      };
    case maintenanceStatus.UNASSIGNED:
      return {
        title: 'Maintenance Update',
        message:
          audience === 'landlord'
            ? 'The vendor was unassigned from a maintenance request.'
            : 'The vendor was unassigned from your maintenance request.',
        type: 'maintenance_status_change',
      };
    default:
      return null;
  }
}

function decisionNotification(
  decision: maintenanceDecisionStatus
): {
  title: string;
  message: string;
  type: 'maintenance_status_change';
} | null {
  if (decision === maintenanceDecisionStatus.APPROVED) {
    return {
      title: 'Maintenance Request Approved',
      message: 'Your landlord has approved your maintenance request.',
      type: 'maintenance_status_change',
    };
  }
  if (decision === maintenanceDecisionStatus.DECLINED) {
    return {
      title: 'Maintenance Request Declined',
      message: 'Your landlord has declined your maintenance request.',
      type: 'maintenance_status_change',
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

  await notifyUser({
    userId: landlordUserId,
    sourceId: sourceUserId ?? undefined,
    type: 'maintenance_new_request',
    message: 'A tenant submitted a new maintenance request that needs your attention.',
    route: `/service/maintenance/landlord/${maintenance.id}`,
  });
}

export async function notifyTenantMaintenanceUpdate(
  before: MaintenanceSnapshot,
  after: MaintenanceSnapshot,
  sourceUserId?: string | null
): Promise<void> {
  const tenantUserId = after.tenant?.userId;
  const landlordUserId = resolveLandlordUserId(after);

  let tenantPayload: {
    title: string;
    message: string;
    type: 'maintenance_status_change' | 'maintenance_resolved';
  } | null = null;
  let landlordPayload: {
    title: string;
    message: string;
    type: 'maintenance_status_change' | 'maintenance_resolved';
  } | null = null;

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
    await notifyUser({
      userId: tenantUserId,
      sourceId: sourceUserId ?? undefined,
      type: tenantPayload.type,
      title: tenantPayload.title,
      message: tenantPayload.message,
      route: `/settings/shared/MaintenanceStatusScreen?id=${after.id}`,
    });
  }

  if (
    landlordPayload &&
    landlordUserId &&
    landlordUserId !== sourceUserId &&
    landlordUserId !== tenantUserId
  ) {
    await notifyUser({
      userId: landlordUserId,
      sourceId: sourceUserId ?? undefined,
      type: landlordPayload.type,
      title: landlordPayload.title,
      message: landlordPayload.message,
      route: `/service/maintenance/landlord/${after.id}`,
    });
  }
}
