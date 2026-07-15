import { ComplaintStatus } from '@prisma/client';
import { notifyUser, resolveLandlordUserFromPropertyId } from './notify';

type ComplaintSnapshot = {
  id?: string | null;
  subject?: string | null;
  status?: ComplaintStatus | string | null;
  createdById?: string | null;
  propertyId?: string | null;
  description?: string | null;
};

function landlordRoute(complaintId: string) {
  return `/service/complaints?id=${complaintId}`;
}

function tenantRoute(complaintId: string) {
  return `/supports/complaint/${complaintId}`;
}

async function resolveLandlordUserId(propertyId?: string | null): Promise<string | null> {
  if (!propertyId) return null;
  const landlord = await resolveLandlordUserFromPropertyId(propertyId);
  return landlord?.userId ?? null;
}

/**
 * Tenant (or other user) opens a complaint on a property → notify landlord.
 */
export async function notifyComplaintCreated(
  complaint: ComplaintSnapshot,
  actorUserId: string
): Promise<void> {
  if (!complaint?.id) return;
  const landlordUserId = await resolveLandlordUserId(complaint.propertyId);
  if (!landlordUserId || landlordUserId === actorUserId) return;

  const subject = complaint.subject?.trim() || 'Untitled';
  await notifyUser({
    userId: landlordUserId,
    sourceId: actorUserId,
    type: 'complaint_created',
    title: 'New Complaint',
    message: `A new complaint was submitted: "${subject}".`,
    route: landlordRoute(complaint.id),
  });
}

/**
 * Status (or other) update → notify the other party (usually the complaint creator).
 */
export async function notifyComplaintUpdated(
  before: ComplaintSnapshot,
  after: ComplaintSnapshot,
  actorUserId: string
): Promise<void> {
  if (!after?.id) return;

  const statusChanged = Boolean(before.status && after.status && before.status !== after.status);
  if (!statusChanged) return;

  const landlordUserId = await resolveLandlordUserId(after.propertyId ?? before.propertyId);
  const targets = new Set<string>();

  if (after.createdById && after.createdById !== actorUserId) {
    targets.add(after.createdById);
  }
  if (landlordUserId && landlordUserId !== actorUserId) {
    targets.add(landlordUserId);
  }

  const subject = after.subject?.trim() || before.subject?.trim() || 'Complaint';
  const statusLabel = String(after.status).replace(/_/g, ' ');

  await Promise.all(
    [...targets].map((userId) =>
      notifyUser({
        userId,
        sourceId: actorUserId,
        type: 'complaint_status_update',
        title: 'Complaint Updated',
        message: `"${subject}" is now ${statusLabel}.`,
        route:
          userId === landlordUserId
            ? landlordRoute(after.id)
            : tenantRoute(after.id),
      })
    )
  );
}

/**
 * Thread message → notify landlord and/or creator (everyone except sender).
 */
export async function notifyComplaintMessage(
  complaint: ComplaintSnapshot,
  senderId: string,
  message: string
): Promise<void> {
  if (!complaint?.id) return;

  const landlordUserId = await resolveLandlordUserId(complaint.propertyId);
  const targets = new Set<string>();

  if (complaint.createdById && complaint.createdById !== senderId) {
    targets.add(complaint.createdById);
  }
  if (landlordUserId && landlordUserId !== senderId) {
    targets.add(landlordUserId);
  }

  const preview = message.trim().slice(0, 120) || 'New message';
  const subject = complaint.subject?.trim() || 'Complaint';

  await Promise.all(
    [...targets].map((userId) =>
      notifyUser({
        userId,
        sourceId: senderId,
        type: 'complaint_message',
        title: 'Complaint Message',
        message: `${subject}: ${preview}`,
        route:
          userId === landlordUserId
            ? landlordRoute(complaint.id)
            : tenantRoute(complaint.id),
      })
    )
  );
}
