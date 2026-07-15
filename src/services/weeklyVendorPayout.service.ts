// Weekly Friday vendor payout batch (Part 2 §6 of VENDOR_APP_FLOW_SPEC.md):
// money is deducted from the tenant/landlord as soon as a job is
// accepted/quote-accepted, but held - it only reaches the vendor in a
// once-a-week batch release, not immediately on job completion.
import { prismaClient } from "..";
import { stripePayoutService } from "./stripe.payout.service";
import paystackServices from "./paystack.services";
import logger from "../utils/loggers";

interface VendorEarnings {
  vendorId: string;
  maintenanceIds: string[];
  totalAmount: number;
}

async function getUnpaidVendorEarnings(): Promise<VendorEarnings[]> {
  const unpaidJobs = await prismaClient.maintenance.findMany({
    where: {
      status: "COMPLETED",
      paymentStatus: "COMPLETED",
      vendorId: { not: null },
      vendorPaidOutAt: null,
      amount: { not: null },
    },
    select: { id: true, vendorId: true, amount: true },
  });

  const byVendor = new Map<string, VendorEarnings>();
  for (const job of unpaidJobs) {
    if (!job.vendorId || !job.amount) continue;
    const existing = byVendor.get(job.vendorId);
    if (existing) {
      existing.maintenanceIds.push(job.id);
      existing.totalAmount += Number(job.amount);
    } else {
      byVendor.set(job.vendorId, {
        vendorId: job.vendorId,
        maintenanceIds: [job.id],
        totalAmount: Number(job.amount),
      });
    }
  }
  return Array.from(byVendor.values());
}

async function payOutVendor(earnings: VendorEarnings): Promise<{ success: boolean; reason?: string }> {
  const vendor = await prismaClient.vendors.findUnique({
    where: { id: earnings.vendorId },
    include: { user: { select: { id: true } } },
  });
  if (!vendor || !vendor.user) {
    return { success: false, reason: "Vendor or linked user not found" };
  }

  const bankInfo = await prismaClient.bankInfo.findFirst({
    where: { vendorId: earnings.vendorId, isDefault: true },
  });
  const fallbackBankInfo =
    bankInfo || (await prismaClient.bankInfo.findFirst({ where: { vendorId: earnings.vendorId } }));

  if (!fallbackBankInfo) {
    return { success: false, reason: "No bank account on file for vendor" };
  }

  const currency = fallbackBankInfo.currency || "USD";
  const reference = `vendor-weekly-payout-${earnings.vendorId}-${Date.now()}`;

  try {
    if (currency === "NGN") {
      // Nigeria pays out via Paystack (Part 3 §5 of VENDOR_APP_FLOW_SPEC.md).
      if (!fallbackBankInfo.paystackRecipientCode) {
        return {
          success: false,
          reason: "No Paystack transfer-recipient code on file for vendor's NGN account",
        };
      }
      await paystackServices.transferToVendor(
        earnings.totalAmount,
        fallbackBankInfo.paystackRecipientCode,
        reference
      );
      return { success: true };
    }

    if (!fallbackBankInfo.stripeTokenId) {
      return { success: false, reason: "No Stripe destination token on file for vendor" };
    }

    await stripePayoutService.createPayout({
      amount: Math.round(earnings.totalAmount * 100), // Stripe expects cents
      currency: currency.toLowerCase(),
      destination: fallbackBankInfo.stripeTokenId,
      description: "Weekly Asher vendor payout",
      userId: vendor.user.id,
      vendorId: vendor.id,
    });

    return { success: true };
  } catch (error: any) {
    logger.error(`Weekly vendor payout failed for vendor ${earnings.vendorId}`, error);
    return { success: false, reason: error?.message || "Payout provider call failed" };
  }
}

export async function runWeeklyVendorPayoutBatch(): Promise<void> {
  const batches = await getUnpaidVendorEarnings();
  if (batches.length === 0) {
    logger.info("Weekly vendor payout: nothing owed this week.");
    return;
  }

  logger.info(`Weekly vendor payout: processing ${batches.length} vendor(s).`);

  for (const earnings of batches) {
    const result = await payOutVendor(earnings);

    if (result.success) {
      await prismaClient.maintenance.updateMany({
        where: { id: { in: earnings.maintenanceIds } },
        data: { vendorPaidOutAt: new Date() },
      });
      logger.info(
        `Weekly vendor payout: paid vendor ${earnings.vendorId} ${earnings.totalAmount} across ${earnings.maintenanceIds.length} job(s).`
      );
    } else {
      // Left un-marked (vendorPaidOutAt stays null) so it's retried next
      // week rather than silently lost.
      logger.warn(
        `Weekly vendor payout: SKIPPED vendor ${earnings.vendorId} (${earnings.totalAmount}) - ${result.reason}`
      );
    }
  }
}
