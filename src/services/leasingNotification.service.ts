import { InvitedResponse } from '@prisma/client';
import { notifyUser, NotifyEventType } from './notify';
import { resolveApplicationPropertyLandlordUser } from '../utils/resolveApplicationLandlord';
import { prismaClient } from '..';

type InviteLike = {
  id?: string | null;
  userInvitedId?: string | null;
  userInvited?: { id?: string | null } | null;
  invitedByLandordId?: string | null;
  landlords?: { user?: { id?: string | null } | null; userId?: string | null } | null;
  properties?: {
    name?: string | null;
    landlord?: { user?: { id?: string | null } | null } | null;
  } | null;
  application?: {
    id?: string | null;
    userId?: string | null;
    user?: { id?: string | null } | null;
  } | null;
};

function propertyName(invite: InviteLike): string {
  return invite.properties?.name?.trim() || 'the property';
}

function applicantRoute(inviteId: string) {
  return `/dashboard/property-viewings/${inviteId}`;
}

function landlordLeasingRoute(inviteId?: string | null) {
  return inviteId ? `/leasing?inviteId=${inviteId}` : '/leasing';
}

function applicationApplicantRoute(applicationId: string, focus?: string) {
  if (focus === 'makepayment') {
    return `/dashboard/applications/${applicationId}/makepayment`;
  }
  if (focus === 'apply') {
    return `/dashboard/applications/${applicationId}/apply`;
  }
  return `/dashboard/applications/${applicationId}/progress`;
}

export function resolveInviteApplicantUserId(invite: InviteLike): string | null {
  return invite.userInvitedId || invite.userInvited?.id || null;
}

export async function resolveInviteLandlordUserId(
  invite: InviteLike
): Promise<string | null> {
  const nested =
    invite.landlords?.user?.id ||
    invite.landlords?.userId ||
    invite.properties?.landlord?.user?.id ||
    null;
  if (nested) return nested;

  if (invite.invitedByLandordId) {
    const landlord = await prismaClient.landlords.findUnique({
      where: { id: invite.invitedByLandordId },
      select: { userId: true },
    });
    return landlord?.userId ?? null;
  }
  return null;
}

/** Tenant/applicant responses → notify landlord */
const TENANT_TO_LANDLORD: Partial<
  Record<InvitedResponse, { type: NotifyEventType; title: string; message: (p: string) => string }>
> = {
  ACCEPTED: {
    type: 'viewing_accepted',
    title: 'Viewing accepted',
    message: (p) => `An applicant accepted the viewing for ${p}.`,
  },
  REJECTED: {
    type: 'viewing_rejected',
    title: 'Viewing declined',
    message: (p) => `An applicant declined the viewing for ${p}.`,
  },
  DECLINED: {
    type: 'viewing_rejected',
    title: 'Viewing declined',
    message: (p) => `An applicant declined the viewing for ${p}.`,
  },
  RESCHEDULED: {
    type: 'viewing_rescheduled',
    title: 'Reschedule requested',
    message: (p) => `An applicant requested a new viewing time for ${p}.`,
  },
  CANCELLED: {
    type: 'viewing_cancelled',
    title: 'Viewing cancelled',
    message: (p) => `An applicant cancelled the viewing for ${p}.`,
  },
  FEEDBACK: {
    type: 'viewing_feedback',
    title: 'Viewing feedback received',
    message: (p) => `An applicant submitted viewing feedback for ${p}.`,
  },
};

/** Landlord responses → notify applicant */
const LANDLORD_TO_APPLICANT: Partial<
  Record<InvitedResponse, { type: NotifyEventType; title: string; message: (p: string) => string }>
> = {
  RESCHEDULED_ACCEPTED: {
    type: 'viewing_reschedule_accepted',
    title: 'Reschedule accepted',
    message: (p) => `Your proposed viewing time for ${p} was accepted.`,
  },
  AWAITING_FEEDBACK: {
    type: 'viewing_awaiting_feedback',
    title: 'Share your viewing feedback',
    message: (p) => `Please share feedback for your viewing of ${p}.`,
  },
  NOT_VISITED: {
    type: 'viewing_no_show',
    title: 'Marked as no-show',
    message: (p) => `You were marked as a no-show for the viewing of ${p}.`,
  },
  CANCELLED: {
    type: 'viewing_cancelled',
    title: 'Viewing cancelled',
    message: (p) => `The viewing for ${p} was cancelled by the landlord.`,
  },
  APPLY: {
    type: 'invite_to_apply',
    title: 'You are invited to apply',
    message: (p) => `You have been invited to apply for ${p}.`,
  },
  RE_INVITED: {
    type: 'invite_to_apply',
    title: 'You are invited to apply',
    message: (p) => `You have been re-invited to apply for ${p}.`,
  },
};

export async function notifyTenantInviteResponse(params: {
  invite: InviteLike;
  response: InvitedResponse;
  actorUserId?: string | null;
}): Promise<void> {
  const { invite, response, actorUserId } = params;
  const config = TENANT_TO_LANDLORD[response];
  if (!config || !invite?.id) return;

  const landlordUserId = await resolveInviteLandlordUserId(invite);
  if (!landlordUserId || landlordUserId === actorUserId) return;

  const name = propertyName(invite);
  await notifyUser({
    userId: landlordUserId,
    sourceId: actorUserId ?? undefined,
    type: config.type,
    title: config.title,
    message: config.message(name),
    route: landlordLeasingRoute(invite.id),
  });
}

export async function notifyLandlordInviteResponse(params: {
  invite: InviteLike;
  response: InvitedResponse;
  actorUserId?: string | null;
  applicationId?: string | null;
}): Promise<void> {
  const { invite, response, actorUserId, applicationId } = params;
  const config = LANDLORD_TO_APPLICANT[response];
  if (!config || !invite?.id) return;

  const applicantUserId = resolveInviteApplicantUserId(invite);
  if (!applicantUserId || applicantUserId === actorUserId) return;

  const name = propertyName(invite);
  const isApply =
    response === InvitedResponse.APPLY || response === InvitedResponse.RE_INVITED;
  const route =
    isApply && applicationId
      ? applicationApplicantRoute(applicationId, 'apply')
      : isApply
        ? '/dashboard/applications'
        : applicantRoute(invite.id);

  await notifyUser({
    userId: applicantUserId,
    sourceId: actorUserId ?? undefined,
    type: config.type,
    title: config.title,
    message: config.message(name),
    route,
  });
}

export async function notifyEnquiryRejected(params: {
  applicantUserId?: string | null;
  actorUserId?: string | null;
  propertyName?: string | null;
}): Promise<void> {
  if (!params.applicantUserId || params.applicantUserId === params.actorUserId) return;
  const name = params.propertyName?.trim() || 'the property';
  await notifyUser({
    userId: params.applicantUserId,
    sourceId: params.actorUserId ?? undefined,
    type: 'enquiry_rejected',
    title: 'Enquiry closed',
    message: `Your enquiry for ${name} was closed by the landlord.`,
    route: '/dashboard',
  });
}

export async function notifyReferenceSubmitted(params: {
  applicationId: string;
  referenceKind: 'guarantor' | 'employer' | 'previous_landlord';
}): Promise<void> {
  const application = await prismaClient.application.findUnique({
    where: { id: params.applicationId },
    include: {
      user: { select: { id: true } },
      properties: {
        select: {
          name: true,
          landlordId: true,
          landlord: { select: { user: { select: { id: true } } } },
        },
      },
      createdBy: { select: { id: true, role: true, email: true } },
    },
  });
  if (!application) return;

  const landlordUser = await resolveApplicationPropertyLandlordUser(application as any);
  const applicantUserId = application.userId || application.user?.id || null;
  const label =
    params.referenceKind === 'guarantor'
      ? 'guarantor'
      : params.referenceKind === 'employer'
        ? 'employer'
        : 'previous landlord';
  const propertyLabel = application.properties?.name || 'an application';

  const targets = new Set<string>();
  if (landlordUser?.id) targets.add(landlordUser.id);
  if (applicantUserId) targets.add(applicantUserId);

  await Promise.all(
    [...targets].map((userId) =>
      notifyUser({
        userId,
        type: 'reference_submitted',
        title: 'Reference submitted',
        message: `A ${label} reference was submitted for ${propertyLabel}.`,
        route:
          userId === landlordUser?.id
            ? `/leasing`
            : applicationApplicantRoute(params.applicationId),
      })
    )
  );
}

export async function notifyAgreementCounterSigned(params: {
  applicantUserId?: string | null;
  actorUserId?: string | null;
  applicationId?: string | null;
  propertyName?: string | null;
}): Promise<void> {
  if (!params.applicantUserId || params.applicantUserId === params.actorUserId) return;
  const name = params.propertyName?.trim() || 'the property';
  await notifyUser({
    userId: params.applicantUserId,
    sourceId: params.actorUserId ?? undefined,
    type: 'application_agreement_counter_signed',
    title: 'Agreement counter-signed',
    message: `Your landlord has counter-signed the lease agreement for ${name}.`,
    route: params.applicationId
      ? applicationApplicantRoute(params.applicationId)
      : '/dashboard',
  });
}

export async function notifyMoveInPaymentRequested(params: {
  applicantUserId?: string | null;
  actorUserId?: string | null;
  applicationId: string;
  propertyName?: string | null;
}): Promise<void> {
  if (!params.applicantUserId || params.applicantUserId === params.actorUserId) return;
  const name = params.propertyName?.trim() || 'the property';
  await notifyUser({
    userId: params.applicantUserId,
    sourceId: params.actorUserId ?? undefined,
    type: 'move_in_payment_requested',
    title: 'Move-in payment required',
    message: `Please pay the move-in deposit and rent for ${name}.`,
    route: applicationApplicantRoute(params.applicationId, 'makepayment'),
  });
}

export async function notifyMoveInPaymentReceived(params: {
  landlordUserId?: string | null;
  applicantUserId?: string | null;
  actorUserId?: string | null;
  applicationId: string;
  amountLabel?: string | null;
  propertyName?: string | null;
}): Promise<void> {
  const name = params.propertyName?.trim() || 'the property';
  const amountBit = params.amountLabel ? ` (${params.amountLabel})` : '';

  if (params.landlordUserId && params.landlordUserId !== params.actorUserId) {
    await notifyUser({
      userId: params.landlordUserId,
      sourceId: params.actorUserId ?? undefined,
      type: 'move_in_payment_received',
      title: 'Move-in payment received',
      message: `Move-in payment${amountBit} was received for ${name}.`,
      route: `/leasing`,
    });
  }

  if (params.applicantUserId) {
    await notifyUser({
      userId: params.applicantUserId,
      type: 'move_in_payment_received',
      title: 'Move-in payment confirmed',
      message: `Your move-in payment${amountBit} for ${name} was successful.`,
      route: applicationApplicantRoute(params.applicationId),
      channels: ['IN_APP', 'PUSH'],
    });
  }
}
