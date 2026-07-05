import { ApplicationStatus, InvitedResponse, LogType } from "@prisma/client";
import { prismaClient } from "..";
import { loadApplicationForTenantCopy } from "../services/tenantOnboarding.service";
import { formatInviteStatus } from "./inviteStatusLabels";
import { orderedTimelineSteps } from "./inviteFlowSteps";

const MILESTONE_LOG_TYPES: LogType[] = [
  LogType.ENQUIRED,
  LogType.FEEDBACK,
  LogType.APPLICATION,
  LogType.ACTIVITY,
  LogType.EMAIL,
  LogType.MESSAGE,
];

const APPLICATION_INCLUDE = {
  user: true,
  personalDetails: { include: { nextOfKin: true } },
  residentialInfo: { include: { prevAddresses: true } },
  emergencyInfo: true,
  employmentInfo: true,
  guarantorInformation: true,
  applicationQuestions: true,
  declaration: true,
  referee: true,
  properties: true,
  units: true,
  rooms: true,
  tenant: true,
  documents: true,
  agreementDocument: true,
  applicationInvites: true,
  referenceForm: true,
  employeeReference: true,
  guarantorAgreement: true,
} as const;

type TimelineLog = {
  id: string;
  events: string;
  subjects?: string | null;
  type?: LogType | null;
  createdAt: Date;
  propertyId?: string | null;
  applicationId?: string | null;
  createdById?: string | null;
  synthetic?: boolean;
  [key: string]: unknown;
};

type SyntheticStep = {
  key: string;
  events: string;
  subjects?: string;
  shouldInclude: (ctx: TimelineContext) => boolean;
  resolveDate: (ctx: TimelineContext) => Date | null;
  matchPatterns: string[];
};

type TimelineContext = {
  application: Awaited<ReturnType<typeof loadApplicationForTenantCopy>> | null;
  invite: {
    id: string;
    createdAt: Date;
    updatedAt: Date;
    scheduleDate: Date | null;
    reScheduleDate: Date | null;
    response: InvitedResponse;
    responseStepsCompleted: InvitedResponse[];
  } | null;
  tenantCreatedAt: Date | null;
  logs: TimelineLog[];
};

const INVITE_STEP_LOG_ALIASES: Partial<Record<InvitedResponse, string[]>> = {
  [InvitedResponse.FEEDBACK]: ["interested in renting", "feedback received", "feedback submitted"],
  [InvitedResponse.APPLICATION_STARTED]: ["application in progress", "application started"],
  [InvitedResponse.SUBMITTED]: ["application submitted"],
  [InvitedResponse.APPROVED]: ["application approved", "approved by landlord"],
  [InvitedResponse.TENANT_CREATED]: ["tenant profile created", "tenant onboarded", "tenancy created"],
  [InvitedResponse.APPLY]: ["invited to apply", "application invite sent"],
  [InvitedResponse.PENDING]: ["application invites", "invite pending", "viewing invite"],
};

function normalizeEventText(value: string | null | undefined): string {
  return (value ?? "").trim().toLowerCase();
}

function logMatchesPatterns(log: TimelineLog, patterns: string[]): boolean {
  const haystack = `${normalizeEventText(log.events)} ${normalizeEventText(log.subjects)}`;
  return patterns.some((pattern) => haystack.includes(pattern.toLowerCase()));
}

function hasMatchingLog(logs: TimelineLog[], patterns: string[]): boolean {
  return logs.some((log) => logMatchesPatterns(log, patterns));
}

function hasMatchingEvent(entries: TimelineLog[], events: string): boolean {
  const normalized = normalizeEventText(events);
  return entries.some((entry) => normalizeEventText(entry.events) === normalized);
}

function statuesCompleted(application: TimelineContext["application"]): ApplicationStatus[] {
  return Array.isArray(application?.statuesCompleted) ? application.statuesCompleted : [];
}

function latestAgreement(application: TimelineContext["application"]) {
  const agreements = Array.isArray(application?.agreementDocument)
    ? application.agreementDocument
    : [];
  return agreements.length ? agreements[agreements.length - 1] : null;
}

function fallbackDate(ctx: TimelineContext): Date {
  return (
    (ctx.application?.updatedAt && new Date(ctx.application.updatedAt)) ||
    (ctx.invite?.updatedAt && new Date(ctx.invite.updatedAt)) ||
    (ctx.application?.createdAt && new Date(ctx.application.createdAt)) ||
    (ctx.invite?.createdAt && new Date(ctx.invite.createdAt)) ||
    new Date()
  );
}

function offsetBetweenDates(start: Date, end: Date, index: number, total: number): Date {
  if (total <= 1) return start;
  const startMs = start.getTime();
  const endMs = Math.max(end.getTime(), startMs + 60_000);
  const ratio = index / (total - 1);
  return new Date(startMs + (endMs - startMs) * ratio);
}

function resolveInviteStepDate(
  step: InvitedResponse,
  ctx: TimelineContext,
  stepIndex: number,
  totalSteps: number
): Date {
  const invite = ctx.invite;
  if (!invite) return fallbackDate(ctx);

  const inviteStart = new Date(invite.createdAt);
  const inviteEnd = new Date(invite.updatedAt);

  switch (step) {
    case InvitedResponse.PENDING:
      return inviteStart;
    case InvitedResponse.ACCEPTED:
    case InvitedResponse.SCHEDULED:
    case InvitedResponse.RESCHEDULED_ACCEPTED:
      if (invite.scheduleDate) return new Date(invite.scheduleDate);
      if (invite.reScheduleDate) return new Date(invite.reScheduleDate);
      return offsetBetweenDates(inviteStart, inviteEnd, stepIndex, totalSteps);
    case InvitedResponse.VISITED:
    case InvitedResponse.COMPLETED:
      if (invite.scheduleDate) {
        return new Date(new Date(invite.scheduleDate).getTime() + 60 * 60 * 1000);
      }
      return offsetBetweenDates(inviteStart, inviteEnd, stepIndex, totalSteps);
    case InvitedResponse.AWAITING_FEEDBACK:
    case InvitedResponse.FEEDBACK: {
      const feedbackLog = ctx.logs.find((log) => log.type === LogType.FEEDBACK);
      if (feedbackLog) return new Date(feedbackLog.createdAt);
      return offsetBetweenDates(inviteStart, inviteEnd, stepIndex, totalSteps);
    }
    case InvitedResponse.APPLICATION_STARTED: {
      const progressLog = ctx.logs.find((log) =>
        normalizeEventText(log.events).includes("application in progress")
      );
      if (progressLog) return new Date(progressLog.createdAt);
      return ctx.application?.createdAt
        ? new Date(ctx.application.createdAt)
        : offsetBetweenDates(inviteStart, inviteEnd, stepIndex, totalSteps);
    }
    case InvitedResponse.SUBMITTED:
    case InvitedResponse.APPROVED:
    case InvitedResponse.TENANT_CREATED:
    case InvitedResponse.AGREEMENTS:
      return fallbackDate(ctx);
    default:
      return offsetBetweenDates(inviteStart, inviteEnd, stepIndex, totalSteps);
  }
}

function buildInvitePipelineMilestones(
  ctx: TimelineContext,
  base: TimelineLog
): TimelineLog[] {
  if (!ctx.invite) return [];

  const steps = orderedTimelineSteps(
    ctx.invite.responseStepsCompleted ?? [],
    ctx.invite.response
  );

  const milestones: TimelineLog[] = [];

  steps.forEach((step, index) => {
    const events = formatInviteStatus(step, "landlord");
    const patterns = [
      events.toLowerCase(),
      step.toLowerCase().replace(/_/g, " "),
      ...(INVITE_STEP_LOG_ALIASES[step] ?? []),
    ];

    if (hasMatchingLog(ctx.logs, patterns)) return;
    if (hasMatchingEvent([...ctx.logs, ...milestones], events)) return;

    const createdAt = resolveInviteStepDate(step, ctx, index, steps.length);
    milestones.push({
      ...base,
      id: `synthetic-invite-${step.toLowerCase()}`,
      events,
      subjects: "Invite",
      type: LogType.APPLICATION,
      createdAt,
      synthetic: true,
    });
  });

  return milestones;
}

const POST_APPLICATION_STEPS: SyntheticStep[] = [
  {
    key: "landlord-reference",
    events: "Landlord reference completed",
    subjects: "Reference",
    shouldInclude: (ctx) => {
      const completed = statuesCompleted(ctx.application);
      const reference = ctx.application?.referenceForm;
      return (
        completed.includes(ApplicationStatus.LANDLORD_REFERENCE) ||
        reference?.status === "COMPLETED" ||
        Boolean(reference?.signature)
      );
    },
    resolveDate: (ctx) => {
      const reference = ctx.application?.referenceForm;
      if (reference?.signedDate) return new Date(reference.signedDate);
      if (reference?.updatedAt) return new Date(reference.updatedAt);
      return fallbackDate(ctx);
    },
    matchPatterns: ["landlord reference"],
  },
  {
    key: "employer-reference",
    events: "Employer reference completed",
    subjects: "Reference",
    shouldInclude: (ctx) => {
      const completed = statuesCompleted(ctx.application);
      const reference = ctx.application?.employeeReference;
      return (
        completed.includes(ApplicationStatus.EMPLOYEE_REFERENCE) ||
        Boolean(reference?.signature || reference?.date)
      );
    },
    resolveDate: (ctx) => {
      const reference = ctx.application?.employeeReference;
      if (reference?.date) return new Date(reference.date);
      return fallbackDate(ctx);
    },
    matchPatterns: ["employer reference", "employment reference"],
  },
  {
    key: "guarantor-reference",
    events: "Guarantor reference completed",
    subjects: "Reference",
    shouldInclude: (ctx) => {
      const completed = statuesCompleted(ctx.application);
      const agreement = ctx.application?.guarantorAgreement;
      return (
        completed.includes(ApplicationStatus.GUARANTOR_REFERENCE) ||
        Boolean(agreement?.signedByGuarantor || agreement?.guarantorSignedAt)
      );
    },
    resolveDate: (ctx) => {
      const agreement = ctx.application?.guarantorAgreement;
      if (agreement?.guarantorSignedAt) return new Date(agreement.guarantorSignedAt);
      if (agreement?.submittedAt) return new Date(agreement.submittedAt);
      if (agreement?.updatedAt) return new Date(agreement.updatedAt);
      return fallbackDate(ctx);
    },
    matchPatterns: ["guarantor reference", "guarantor agreement"],
  },
  {
    key: "agreement-sent",
    events: "Lease agreement sent to tenant",
    subjects: "Agreement",
    shouldInclude: (ctx) => Boolean(latestAgreement(ctx.application)?.sentAt),
    resolveDate: (ctx) => {
      const sentAt = latestAgreement(ctx.application)?.sentAt;
      return sentAt ? new Date(sentAt) : fallbackDate(ctx);
    },
    matchPatterns: ["lease agreement sent", "agreement sent", "agreement letter"],
  },
  {
    key: "agreement-tenant-signed",
    events: "Lease signed by tenant",
    subjects: "Agreement",
    shouldInclude: (ctx) => Boolean(latestAgreement(ctx.application)?.signedByTenantAt),
    resolveDate: (ctx) => {
      const signedAt = latestAgreement(ctx.application)?.signedByTenantAt;
      return signedAt ? new Date(signedAt) : fallbackDate(ctx);
    },
    matchPatterns: ["lease signed by tenant", "signed by tenant"],
  },
  {
    key: "agreement-landlord-signed",
    events: "Lease counter-signed by landlord",
    subjects: "Agreement",
    shouldInclude: (ctx) => Boolean(latestAgreement(ctx.application)?.signedByLandlordAt),
    resolveDate: (ctx) => {
      const signedAt = latestAgreement(ctx.application)?.signedByLandlordAt;
      return signedAt ? new Date(signedAt) : fallbackDate(ctx);
    },
    matchPatterns: ["counter-signed", "signed by landlord", "landlord signed", "counter-signature"],
  },
  {
    key: "tenant-profile-created",
    events: "Tenant profile created — ready for mobile onboarding",
    subjects: "Onboarding",
    shouldInclude: (ctx) => Boolean(ctx.tenantCreatedAt || ctx.application?.tenant),
    resolveDate: (ctx) =>
      ctx.tenantCreatedAt
        ? new Date(ctx.tenantCreatedAt)
        : ctx.application?.tenant?.createdAt
          ? new Date(ctx.application.tenant.createdAt)
          : fallbackDate(ctx),
    matchPatterns: [
      "tenant profile created",
      "ready for mobile onboarding",
      "tenant onboarded",
      "tenancy created",
    ],
  },
];

async function resolveInvite(
  propertyId: string,
  userId: string,
  tenantId?: string,
  applicationId?: string | null
) {
  return prismaClient.applicationInvites.findFirst({
    where: {
      isDeleted: false,
      OR: [
        ...(tenantId ? [{ tenantsId: tenantId }] : []),
        { userInvitedId: userId, propertiesId: propertyId },
        ...(applicationId ? [{ application: { id: applicationId } }] : []),
      ],
    },
    orderBy: { updatedAt: "desc" },
    select: {
      id: true,
      createdAt: true,
      updatedAt: true,
      scheduleDate: true,
      reScheduleDate: true,
      response: true,
      responseStepsCompleted: true,
      application: { select: { id: true } },
    },
  });
}

async function resolveApplication(
  propertyId: string,
  userId: string,
  applicationId?: string | null,
  inviteApplicationId?: string | null,
  logApplicationId?: string | null
) {
  const resolvedId = applicationId ?? inviteApplicationId ?? logApplicationId ?? null;

  if (resolvedId) {
    return loadApplicationForTenantCopy(resolvedId);
  }

  return prismaClient.application.findFirst({
    where: {
      userId,
      isDeleted: false,
      OR: [{ propertiesId: propertyId }, { properties: { id: propertyId } }],
    },
    orderBy: { updatedAt: "desc" },
    include: APPLICATION_INCLUDE,
  });
}

function buildPostApplicationMilestones(
  ctx: TimelineContext,
  base: TimelineLog,
  existing: TimelineLog[]
): TimelineLog[] {
  const synthetic: TimelineLog[] = [];

  for (const step of POST_APPLICATION_STEPS) {
    if (!step.shouldInclude(ctx)) continue;

    const pool = [...ctx.logs, ...existing, ...synthetic];
    if (hasMatchingLog(pool, step.matchPatterns)) continue;
    if (hasMatchingEvent(pool, step.events)) continue;

    const createdAt = step.resolveDate(ctx);
    if (!createdAt) continue;

    synthetic.push({
      ...base,
      id: `synthetic-${step.key}`,
      events: step.events,
      subjects: step.subjects ?? null,
      type: LogType.APPLICATION,
      createdAt,
      synthetic: true,
    });
  }

  return synthetic;
}

export async function resolveTenantMilestoneTimeline(params: {
  propertyId: string;
  userId: string;
  landlordId: string;
  tenantId?: string;
  applicationId?: string | null;
}) {
  const { propertyId, userId, landlordId, tenantId, applicationId } = params;

  const tenantRecord = tenantId
    ? await prismaClient.tenants.findUnique({
        where: { id: tenantId },
        select: { applicationId: true, createdAt: true },
      })
    : null;

  const initialApplicationId = applicationId ?? tenantRecord?.applicationId ?? null;

  const invite = await resolveInvite(
    propertyId,
    userId,
    tenantId,
    initialApplicationId
  );

  const resolvedApplicationId =
    initialApplicationId ?? invite?.application?.id ?? null;

  const application = await resolveApplication(
    propertyId,
    userId,
    resolvedApplicationId,
    invite?.application?.id,
    null
  );

  const finalApplicationId = application?.id ?? resolvedApplicationId ?? null;

  const allLogs = await prismaClient.log.findMany({
    where: {
      property: { landlordId },
      type: { in: MILESTONE_LOG_TYPES },
      OR: [
        { propertyId, createdById: userId },
        ...(finalApplicationId ? [{ applicationId: finalApplicationId }] : []),
        // Move-out / inspection lifecycle (landlord-authored property activity)
        {
          propertyId,
          type: LogType.ACTIVITY,
          OR: [
            { subjects: { contains: 'Move-out', mode: 'insensitive' as const } },
            { subjects: { contains: 'Inspection', mode: 'insensitive' as const } },
            { events: { contains: 'move-out', mode: 'insensitive' as const } },
            { events: { contains: 'inspection', mode: 'insensitive' as const } },
          ],
        },
      ],
    },
    orderBy: { createdAt: "asc" },
  });

  const logsById = new Map<string, TimelineLog>();
  for (const log of allLogs) {
    logsById.set(log.id, log);
  }
  const timelineLogs = [...logsById.values()].sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
  );

  const ctx: TimelineContext = {
    application,
    invite: invite
      ? {
          id: invite.id,
          createdAt: invite.createdAt,
          updatedAt: invite.updatedAt,
          scheduleDate: invite.scheduleDate,
          reScheduleDate: invite.reScheduleDate,
          response: invite.response,
          responseStepsCompleted: invite.responseStepsCompleted ?? [],
        }
      : null,
    tenantCreatedAt: tenantRecord?.createdAt ?? null,
    logs: timelineLogs,
  };

  const baseSynthetic: TimelineLog = {
    id: "synthetic-base",
    events: "",
    createdAt: new Date(),
    propertyId,
    applicationId: finalApplicationId,
    createdById: userId,
    type: LogType.APPLICATION,
  };

  const inviteMilestones = buildInvitePipelineMilestones(ctx, baseSynthetic);
  const postApplicationMilestones = buildPostApplicationMilestones(
    ctx,
    baseSynthetic,
    inviteMilestones
  );

  const merged = [...timelineLogs, ...inviteMilestones, ...postApplicationMilestones].sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
  );

  const deduped = new Map<string, TimelineLog>();
  for (const entry of merged) {
    const key = normalizeEventText(entry.events);
    const existing = deduped.get(key);
    if (!existing || new Date(entry.createdAt) < new Date(existing.createdAt)) {
      deduped.set(key, entry);
    }
  }

  return [...deduped.values()].sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
  );
}
