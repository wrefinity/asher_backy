import { NotificationCategory } from ".prisma/client";
import NotificationService from "../services/notification.service";
import { sendMail } from "./emailer";
import { sendPreferenceAwareMail } from "./sendPreferenceAwareMail";

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
}) {
  const {
    tenantUserId,
    landlordUserId,
    tenantEmail,
    propertyLandlordEmail,
    title,
    message,
    tenantEmailSubject,
    tenantEmailBody,
  } = params;

  if (tenantUserId) {
    await NotificationService.createNotification(
      {
        destId: tenantUserId,
        title,
        message,
        category: NotificationCategory.COMMUNICATION,
      },
      NotificationCategory.COMMUNICATION
    );
    if (tenantEmail) {
      await sendMail(tenantEmail, tenantEmailSubject, tenantEmailBody);
    }
  }

  if (landlordUserId) {
    await NotificationService.createNotification(
      {
        sourceId: tenantUserId || undefined,
        destId: landlordUserId,
        title,
        message,
        category: NotificationCategory.COMMUNICATION,
      },
      NotificationCategory.COMMUNICATION
    );
    if (propertyLandlordEmail) {
      await sendPreferenceAwareMail({
        userId: landlordUserId,
        category: NotificationCategory.COMMUNICATION,
        notificationType: 'reference_declined',
        to: propertyLandlordEmail,
        subject: title,
        html: `<p>${message}</p>`,
      });
    }
  }
}
