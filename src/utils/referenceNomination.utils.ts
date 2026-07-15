import { notifyUser } from "../services/notify";

export function joinReferenceNameParts(
  ...parts: Array<string | null | undefined>
): string {
  return parts
    .map((p) => (p == null ? "" : String(p).trim()))
    .filter((p) => p && p.toLowerCase() !== "null" && p.toLowerCase() !== "undefined")
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();
}

export async function notifyReferenceDeclined(params: {
  tenantUserId?: string | null;
  landlordUserId?: string | null;
  tenantEmail?: string | null;
  propertyLandlordEmail?: string | null;
  title: string;
  message: string;
  tenantEmailSubject: string;
  tenantEmailBody: string;
  applicationId?: string | null;
}) {
  const {
    tenantUserId,
    landlordUserId,
    title,
    message,
    tenantEmailSubject,
    tenantEmailBody,
    applicationId,
  } = params;

  if (tenantUserId) {
    await notifyUser({
      userId: tenantUserId,
      type: 'reference_declined',
      title,
      message,
      route: applicationId
        ? `/dashboard/applications/${applicationId}/apply`
        : '/dashboard',
      emailSubject: tenantEmailSubject,
      emailHtml: tenantEmailBody,
    });
  }

  if (landlordUserId) {
    await notifyUser({
      userId: landlordUserId,
      sourceId: tenantUserId || undefined,
      type: 'reference_declined',
      title,
      message,
      route: '/leasing',
      emailSubject: title,
      emailHtml: `<p>${message}</p>`,
    });
  }
}
