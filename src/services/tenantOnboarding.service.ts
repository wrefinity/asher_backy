import { ApplicationStatus, LogType } from "@prisma/client";
import { prismaClient } from "..";
import sendMail from "../utils/emailer";
import LogsServices from "./logs.services";

const TENANT_APP_URL =
  process.env.TENANT_MOBILE_APP_URL ||
  process.env.TENANT_APP_URL ||
  "https://apps.apple.com/app/asher-tenant";

export function calculateAgeFromDob(dob: Date | string | null | undefined): number | null {
  if (!dob) return null;
  const birth = new Date(dob);
  if (Number.isNaN(birth.getTime())) return null;
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const monthDiff = today.getMonth() - birth.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
    age -= 1;
  }
  return age;
}

export function buildAgreementInfoSnapshot(application: any) {
  const agreements = Array.isArray(application?.agreementDocument)
    ? application.agreementDocument
    : [];
  const latest = agreements.length ? agreements[agreements.length - 1] : null;
  if (!latest) return null;

  return {
    agreementId: latest.id,
    templateId: latest.templateId,
    templateVersion: latest.templateVersion,
    documentUrl: latest.documentUrl,
    processedContent: latest.processedContent,
    signedByTenantAt: latest.signedByTenantAt,
    signedByLandlordAt: latest.signedByLandlordAt,
    completedAt: latest.completedAt,
    sentAt: latest.sentAt,
    agreementStatus: latest.agreementStatus,
    applicationId: application.id,
  };
}

export function resolveLeaseDatesFromApplication(application: any) {
  const leaseStartDate = application?.moveInDate
    ? new Date(application.moveInDate)
    : application?.leaseStartDate
      ? new Date(application.leaseStartDate)
      : undefined;

  const leaseEndDate = application?.leaseEndDate
    ? new Date(application.leaseEndDate)
    : undefined;

  const initialDeposit =
    application?.securityDeposit != null
      ? Number(application.securityDeposit)
      : undefined;

  return { leaseStartDate, leaseEndDate, initialDeposit };
}

export function buildTenantWelcomeEmailHtml(params: {
  firstName?: string | null;
  tenantCode: string;
  propertyName?: string | null;
}) {
  const name = params.firstName || "Tenant";
  const propertyLine = params.propertyName
    ? `<p>Your tenancy at <strong>${params.propertyName}</strong> is now active.</p>`
    : "";

  return `<h3>Welcome to Asher</h3>
    <p>Dear ${name},</p>
    <p>Your tenant account has been created. ${propertyLine}</p>
    <p><strong>Your Tenant ID:</strong> ${params.tenantCode}</p>
    <p>To get started:</p>
    <ol>
      <li>Download the Asher Tenant app: <a href="${TENANT_APP_URL}">${TENANT_APP_URL}</a></li>
      <li>Open the app and enter your Tenant ID</li>
      <li>Confirm your identity and set a secure password</li>
    </ol>
    <p>If you did not expect this email, please contact your landlord or Asher support.</p>
    <p>Best regards,<br/>The Asher Team</p>`;
}

export async function sendTenantWelcomeEmail(params: {
  email: string;
  firstName?: string | null;
  tenantCode: string;
  propertyName?: string | null;
}) {
  await sendMail(
    params.email,
    "Welcome to Asher — Your tenant account is ready",
    buildTenantWelcomeEmailHtml(params)
  );
}

export async function seedTenantOnboardingMilestones(params: {
  application: any;
  tenantId: string;
  propertyId: string;
  unitId?: string | null;
  roomId?: string | null;
  createdById?: string | null;
}) {
  const { application, tenantId, propertyId, unitId, roomId, createdById } = params;
  const applicationId = application.id;
  const userId = application.userId;

  const steps: { events: string; subjects?: string }[] = [
    { events: "Enquiry received", subjects: "Enquiry" },
    { events: "Application invite sent", subjects: "Invite" },
    { events: "Application submitted", subjects: "Application" },
    { events: "Application approved by landlord", subjects: "Approval" },
    { events: "Lease agreement sent to tenant", subjects: "Agreement" },
    { events: "Lease signed by tenant", subjects: "Agreement" },
    { events: "Lease counter-signed by landlord", subjects: "Agreement" },
    { events: "Tenant profile created — ready for mobile onboarding", subjects: "Onboarding" },
  ];

  const latestAgreement = Array.isArray(application.agreementDocument)
    ? application.agreementDocument[application.agreementDocument.length - 1]
    : null;

  const skipIf = [
    () => !application.applicationInviteId,
    () => false,
    () => application.status === ApplicationStatus.PENDING,
    () => !application.statuesCompleted?.includes?.(ApplicationStatus.APPROVED),
    () => !latestAgreement?.sentAt,
    () => !latestAgreement?.signedByTenantAt,
    () => !latestAgreement?.signedByLandlordAt,
    () => false,
  ];

  for (let i = 0; i < steps.length; i += 1) {
    if (skipIf[i]?.()) continue;
    await LogsServices.createLog({
      events: steps[i].events,
      subjects: steps[i].subjects,
      type: LogType.APPLICATION,
      propertyId,
      unitId: unitId ?? undefined,
      roomId: roomId ?? undefined,
      applicationId,
      createdById: createdById ?? userId,
    });
  }

  await LogsServices.createLog({
    events: `Tenant onboarded — ${tenantId}`,
    subjects: "Tenant created",
    type: LogType.ACTIVITY,
    propertyId,
    unitId: unitId ?? undefined,
    roomId: roomId ?? undefined,
    applicationId,
    createdById: createdById ?? userId,
  });
}

export async function loadApplicationForTenantCopy(applicationId: string) {
  return prismaClient.application.findUnique({
    where: { id: applicationId },
    include: {
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
    },
  });
}
