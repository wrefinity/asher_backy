// Confirm-and-approve nudge (Part 18 of VENDOR_APP_FLOW_SPEC.md): when a
// vendor completes a job but the requester (tenant or landlord) hasn't
// confirmed it, remind them daily - mirrors the lease-renewal reminder
// pattern. Deduped to one reminder per job per day via notification title
// matching.
import { maintenanceStatus } from "@prisma/client";
import { prismaClient } from "..";
import NotificationService from "./notification.service";
import logger from "../utils/loggers";

const REMIND_AFTER_HOURS = 6;

export async function sendMaintenanceVerificationReminders(): Promise<void> {
  const cutoff = new Date(Date.now() - REMIND_AFTER_HOURS * 3600 * 1000);

  const awaiting = await prismaClient.maintenance.findMany({
    where: {
      status: maintenanceStatus.COMPLETED,
      tenantVerified: false,
      isDeleted: false,
      updatedAt: { lte: cutoff },
    },
    select: {
      id: true,
      description: true,
      tenant: { select: { userId: true } },
      landlord: { select: { userId: true } },
      handleByLandlord: true,
    },
    take: 200,
  });

  if (awaiting.length === 0) return;

  const since = new Date();
  since.setHours(0, 0, 0, 0);

  for (const job of awaiting) {
    // The requester confirms: landlord-liable jobs -> landlord, else tenant.
    const destId = job.handleByLandlord ? job.landlord?.userId : job.tenant?.userId;
    if (!destId) continue;

    const title = "Please confirm your completed job";

    // One nudge per job per day.
    const already = await prismaClient.notification.findFirst({
      where: {
        destId,
        title,
        message: { contains: job.id },
        createdAt: { gte: since },
      },
      select: { id: true },
    });
    if (already) continue;

    try {
      await NotificationService.createNotification(
        {
          destId,
          title,
          message: `Your vendor marked "${job.description?.slice(0, 60)}" as completed. Please review the photos and confirm so it can be closed out. (ref: ${job.id})`,
          notificationType: "maintenance_verification_reminder",
        },
        "MAINTENANCE_REQUESTS"
      );
    } catch (error) {
      logger.warn(`Verification reminder failed for maintenance ${job.id}`, error);
    }
  }

  logger.info(`Maintenance verification reminders processed: ${awaiting.length} awaiting confirmation.`);
}
