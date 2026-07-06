import {
  ApplicationStatus,
  InvitedResponse,
  LogType,
  logTypeStatus,
} from "@prisma/client";
import { prismaClient } from "..";
import { propertyEngagementUrl } from "../utils/propertyEngagementUrl";

export type ListingEngagementStage =
  | "none"
  | "enquiry_sent"
  | "enquiry_rejected"
  | "viewing_pending"
  | "viewing_scheduled"
  | "viewing_accepted"
  | "awaiting_feedback"
  | "application_available"
  | "application_in_progress"
  | "application_submitted"
  | "application_payment"
  | "application_approved"
  | "application_declined"
  | "application_completed"
  | "viewing_declined";

export interface ListingEngagementResult {
  hasEngagement: boolean;
  stage: ListingEngagementStage;
  label: string;
  description: string;
  date: string | null;
  canEnquire: boolean;
  actionLabel: string | null;
  actionHref: string | null;
  enquiryId: string | null;
  inviteId: string | null;
  applicationId: string | null;
  inviteResponse: string | null;
  applicationStatus: string | null;
  logStatus: string | null;
  propertyListingId: string | null;
}

const NO_ENGAGEMENT: ListingEngagementResult = {
  hasEngagement: false,
  stage: "none",
  label: "",
  description: "",
  date: null,
  canEnquire: true,
  actionLabel: null,
  actionHref: null,
  enquiryId: null,
  inviteId: null,
  applicationId: null,
  inviteResponse: null,
  applicationStatus: null,
  logStatus: null,
  propertyListingId: null,
};

function formatDateIso(value?: Date | string | null): string | null {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function resolveFromApplication(
  application: {
    id: string;
    status: ApplicationStatus;
    createdAt: Date;
    updatedAt: Date;
    stepCompleted?: number | null;
  } | null | undefined,
  listingId: string
): ListingEngagementResult | null {
  if (!application) return null;

  const date = formatDateIso(application.updatedAt || application.createdAt);
  const appId = application.id;
  const base = { propertyListingId: listingId, applicationId: appId };

  switch (application.status) {
    case ApplicationStatus.DECLINED:
      return {
        ...NO_ENGAGEMENT,
        ...base,
        hasEngagement: true,
        stage: "application_declined",
        label: "Application declined",
        description: "The landlord declined your application for this property.",
        date,
        canEnquire: false,
        actionLabel: "View details",
        actionHref: propertyEngagementUrl(listingId, {
          focus: "status",
          applicationId: appId,
          status: "declined",
        }),
        applicationStatus: application.status,
      };
    case ApplicationStatus.SUBMITTED:
      return {
        ...NO_ENGAGEMENT,
        ...base,
        hasEngagement: true,
        stage: "application_submitted",
        label: "Application submitted",
        description: "Your application is with the landlord — awaiting their review.",
        date,
        canEnquire: false,
        actionLabel: "Track application",
        actionHref: propertyEngagementUrl(listingId, {
          focus: "status",
          applicationId: appId,
          status: "submitted",
        }),
        applicationStatus: application.status,
      };
    case ApplicationStatus.MAKEPAYMENT:
      return {
        ...NO_ENGAGEMENT,
        ...base,
        hasEngagement: true,
        stage: "application_payment",
        label: "Payment required",
        description: "Complete payment to continue with this application.",
        date,
        canEnquire: false,
        actionLabel: "Complete payment",
        actionHref: propertyEngagementUrl(listingId, {
          focus: "payment",
          applicationId: appId,
          status: "makepayment",
        }),
        applicationStatus: application.status,
      };
    case ApplicationStatus.APPROVED:
    case ApplicationStatus.ACCEPTED:
      return {
        ...NO_ENGAGEMENT,
        ...base,
        hasEngagement: true,
        stage: "application_approved",
        label: "Application approved",
        description: "Good news — your application was approved.",
        date,
        canEnquire: false,
        actionLabel: "View details",
        actionHref: propertyEngagementUrl(listingId, {
          focus: "status",
          applicationId: appId,
          status: "approved",
        }),
        applicationStatus: application.status,
      };
    case ApplicationStatus.COMPLETED:
    case ApplicationStatus.TENANT_CREATED:
    case ApplicationStatus.AGREEMENTS_SIGNED:
      return {
        ...NO_ENGAGEMENT,
        ...base,
        hasEngagement: true,
        stage: "application_completed",
        label: "Application completed",
        description: "You have completed the application process for this property.",
        date,
        canEnquire: false,
        actionLabel: "View application",
        actionHref: propertyEngagementUrl(listingId, {
          focus: "status",
          applicationId: appId,
          status: "completed",
        }),
        applicationStatus: application.status,
      };
    case ApplicationStatus.PENDING:
    default: {
      const inProgress = (application.stepCompleted ?? 1) > 1;
      return {
        ...NO_ENGAGEMENT,
        ...base,
        hasEngagement: true,
        stage: inProgress ? "application_in_progress" : "application_available",
        label: inProgress ? "Application in progress" : "Ready to apply",
        description: inProgress
          ? "Continue your application to secure this property."
          : "You can start your application for this property.",
        date,
        canEnquire: false,
        actionLabel: inProgress ? "Continue application" : "Start application",
        actionHref: propertyEngagementUrl(listingId, {
          focus: "apply",
          applicationId: appId,
          status: inProgress ? "resume" : undefined,
        }),
        applicationStatus: application.status,
      };
    }
  }
}

function resolveFromInvite(
  invite: {
    id: string;
    response: InvitedResponse;
    createdAt: Date;
    updatedAt: Date;
    scheduleDate?: Date | null;
    reScheduleDate?: Date | null;
    propertiesId?: string | null;
    propertyListingId?: string | null;
    application?: {
      id: string;
      status: ApplicationStatus;
      createdAt: Date;
      updatedAt: Date;
      stepCompleted?: number | null;
    } | null;
  } | null | undefined,
  enquiryId: string | null,
  listingId: string
): ListingEngagementResult | null {
  if (!invite) return null;

  const fromApp = resolveFromApplication(invite.application, listingId);
  if (fromApp) {
    return {
      ...fromApp,
      inviteId: invite.id,
      enquiryId,
      inviteResponse: invite.response,
    };
  }

  const viewingDate = formatDateIso(
    invite.reScheduleDate || invite.scheduleDate || invite.updatedAt
  );
  const inviteDate = formatDateIso(invite.createdAt);
  const viewingUrl = propertyEngagementUrl(listingId, {
    focus: "viewing",
    invitationId: invite.id,
  });

  switch (invite.response) {
    case InvitedResponse.AWAITING_FEEDBACK:
      return {
        ...NO_ENGAGEMENT,
        hasEngagement: true,
        stage: "awaiting_feedback",
        label: "Awaiting your feedback",
        description: "Share your thoughts after the viewing so the landlord can proceed.",
        date: viewingDate,
        canEnquire: false,
        actionLabel: "Leave feedback",
        actionHref: propertyEngagementUrl(listingId, {
          focus: "feedback",
          invitationId: invite.id,
        }),
        enquiryId,
        inviteId: invite.id,
        inviteResponse: invite.response,
        propertyListingId: listingId,
      };
    case InvitedResponse.FEEDBACK:
      return {
        ...NO_ENGAGEMENT,
        hasEngagement: true,
        stage: "awaiting_feedback",
        label: "Feedback submitted",
        description: "Thanks for your feedback — the landlord will review and may invite you to apply.",
        date: viewingDate,
        canEnquire: false,
        actionLabel: "View property",
        actionHref: viewingUrl,
        enquiryId,
        inviteId: invite.id,
        inviteResponse: invite.response,
        propertyListingId: listingId,
      };
    case InvitedResponse.APPLY:
    case InvitedResponse.APPLICATION_NOT_STARTED:
      return {
        ...NO_ENGAGEMENT,
        hasEngagement: true,
        stage: "application_available",
        label: "Invited to apply",
        description: "The landlord invited you to apply for this property.",
        date: inviteDate,
        canEnquire: false,
        actionLabel: "Start application",
        actionHref: propertyEngagementUrl(listingId, {
          focus: "apply",
          applicationInviteId: invite.id,
        }),
        enquiryId,
        inviteId: invite.id,
        inviteResponse: invite.response,
        propertyListingId: listingId,
      };
    case InvitedResponse.APPLICATION_STARTED: {
      const appId = invite.application?.id;
      return {
        ...NO_ENGAGEMENT,
        hasEngagement: true,
        stage: "application_in_progress",
        label: "Application started",
        description: "Continue your application for this property.",
        date: inviteDate,
        canEnquire: false,
        actionLabel: "Continue application",
        actionHref: propertyEngagementUrl(listingId, {
          focus: "apply",
          applicationId: appId ?? undefined,
          applicationInviteId: invite.id,
          status: "resume",
        }),
        enquiryId,
        inviteId: invite.id,
        inviteResponse: invite.response,
        applicationId: appId ?? null,
        propertyListingId: listingId,
      };
    }
    case InvitedResponse.SCHEDULED:
      return {
        ...NO_ENGAGEMENT,
        hasEngagement: true,
        stage: "viewing_scheduled",
        label: "Viewing scheduled",
        description: "Your property viewing is scheduled.",
        date: viewingDate,
        canEnquire: false,
        actionLabel: "View schedule",
        actionHref: viewingUrl,
        enquiryId,
        inviteId: invite.id,
        inviteResponse: invite.response,
        propertyListingId: listingId,
      };
    case InvitedResponse.ACCEPTED:
    case InvitedResponse.RESCHEDULED_ACCEPTED:
    case InvitedResponse.VISITED:
      return {
        ...NO_ENGAGEMENT,
        hasEngagement: true,
        stage: "viewing_accepted",
        label: "Viewing confirmed",
        description: "Your viewing for this property is confirmed.",
        date: viewingDate,
        canEnquire: false,
        actionLabel: "View details",
        actionHref: viewingUrl,
        enquiryId,
        inviteId: invite.id,
        inviteResponse: invite.response,
        propertyListingId: listingId,
      };
    case InvitedResponse.REJECTED:
    case InvitedResponse.CANCELLED:
    case InvitedResponse.NOT_VISITED:
      return {
        ...NO_ENGAGEMENT,
        hasEngagement: true,
        stage: "viewing_declined",
        label: "Viewing declined",
        description: "You declined or cancelled the viewing invite for this property.",
        date: inviteDate,
        canEnquire: false,
        actionLabel: "View history",
        actionHref: "/dashboard/property-viewings?tab=history",
        enquiryId,
        inviteId: invite.id,
        inviteResponse: invite.response,
        propertyListingId: listingId,
      };
    case InvitedResponse.PENDING:
    case InvitedResponse.RE_INVITED:
    case InvitedResponse.RESCHEDULED:
    default:
      return {
        ...NO_ENGAGEMENT,
        hasEngagement: true,
        stage: "viewing_pending",
        label: "Viewing invite received",
        description: "The landlord invited you to view this property — respond to the invite.",
        date: inviteDate,
        canEnquire: false,
        actionLabel: "Respond to invite",
        actionHref: viewingUrl,
        enquiryId,
        inviteId: invite.id,
        inviteResponse: invite.response,
        propertyListingId: listingId,
      };
  }
}

function resolveFromEnquiry(
  enquiry: {
    id: string;
    status: logTypeStatus | null;
    createdAt: Date;
  } | null | undefined,
  listingId: string
): ListingEngagementResult | null {
  if (!enquiry) return null;

  const date = formatDateIso(enquiry.createdAt);
  const propertyUrl = propertyEngagementUrl(listingId);

  if (enquiry.status === logTypeStatus.REJECTED) {
    return {
      ...NO_ENGAGEMENT,
      hasEngagement: true,
      stage: "enquiry_rejected",
      label: "Enquiry declined",
      description: "The landlord is not proceeding with your enquiry for this property.",
      date,
      canEnquire: false,
      actionLabel: "View history",
      actionHref: "/dashboard/property-viewings?tab=history",
      enquiryId: enquiry.id,
      logStatus: enquiry.status,
      propertyListingId: listingId,
    };
  }

  if (
    enquiry.status === logTypeStatus.INVITED ||
    enquiry.status === logTypeStatus.RE_INVITED
  ) {
    return {
      ...NO_ENGAGEMENT,
      hasEngagement: true,
      stage: "enquiry_sent",
      label: "Enquiry sent",
      description: "The landlord has responded — check your viewing invites.",
      date,
      canEnquire: false,
      actionLabel: "View invites",
      actionHref: propertyEngagementUrl(listingId, { focus: "viewing" }),
      enquiryId: enquiry.id,
      logStatus: enquiry.status,
      propertyListingId: listingId,
    };
  }

  return {
    ...NO_ENGAGEMENT,
    hasEngagement: true,
    stage: "enquiry_sent",
    label: "Enquiry sent",
    description: "Awaiting landlord response.",
    date,
    canEnquire: false,
    actionLabel: "View property",
    actionHref: propertyUrl,
    enquiryId: enquiry.id,
    logStatus: enquiry.status,
    propertyListingId: listingId,
  };
}

class ListingEngagementService {
  async getForUserAndListing(
    userId: string,
    listingId: string
  ): Promise<ListingEngagementResult> {
    const enquiry = await prismaClient.log.findFirst({
      where: {
        createdById: userId,
        propertyListingId: listingId,
        type: LogType.ENQUIRED,
      },
      orderBy: { createdAt: "desc" },
    });

    let invite = await prismaClient.applicationInvites.findFirst({
      where: {
        userInvitedId: userId,
        propertyListingId: listingId,
        isDeleted: false,
      },
      orderBy: { createdAt: "desc" },
      include: {
        application: true,
      },
    });

    if (!invite && enquiry?.id) {
      invite = await prismaClient.applicationInvites.findFirst({
        where: {
          userInvitedId: userId,
          enquiryId: enquiry.id,
          isDeleted: false,
        },
        orderBy: { createdAt: "desc" },
        include: {
          application: true,
        },
      });
    }

    const fromInvite = resolveFromInvite(invite, enquiry?.id ?? null, listingId);
    if (fromInvite?.hasEngagement) return fromInvite;

    const fromEnquiry = resolveFromEnquiry(enquiry, listingId);
    if (fromEnquiry?.hasEngagement) return fromEnquiry;

    return { ...NO_ENGAGEMENT, propertyListingId: listingId };
  }

  async userCanAccessListing(userId: string, listingId: string): Promise<boolean> {
    const engagement = await this.getForUserAndListing(userId, listingId);
    return engagement.hasEngagement;
  }
}

export default new ListingEngagementService();
