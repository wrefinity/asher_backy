// Vendor reputation gating (Part 5 of VENDOR_APP_FLOW_SPEC.md):
//   >= 3.5            NORMAL    - full dispatch
//   3.0 - 3.5         THROTTLED - drastically reduced dispatch + daily
//                                 in-app warning
//   <= 3.0            BLOCKED   - zero dispatch, invisible everywhere,
//                                 account shows reputation-recovery guidance
// All-time average for now (rolling window is an open product question).
// Vendors with no reviews yet are NORMAL - new vendors aren't punished.
import { prismaClient } from "..";

export type ReputationZone = "NORMAL" | "THROTTLED" | "BLOCKED";

export interface VendorReputation {
  averageRating: number | null;
  totalReviews: number;
  zone: ReputationZone;
}

export const REPUTATION_THRESHOLD_WARN = 3.5;
export const REPUTATION_THRESHOLD_BLOCK = 3.0;

// Deterministic throttle: in the warning zone a vendor sees roughly this
// fraction of the jobs they otherwise would ("occasional/random jobs" per
// the spec), selected stably per vendor+job so the feed doesn't flicker.
export const THROTTLE_KEEP_RATIO = 0.3;

export async function getVendorReputation(vendorId: string): Promise<VendorReputation> {
  const result = await prismaClient.reviews.aggregate({
    where: { vendorId, isDeleted: false },
    _avg: { rating: true },
    _count: { id: true },
  });

  const totalReviews = result._count.id ?? 0;
  const averageRating = totalReviews > 0 ? result._avg.rating : null;

  let zone: ReputationZone = "NORMAL";
  if (averageRating != null) {
    if (averageRating <= REPUTATION_THRESHOLD_BLOCK) zone = "BLOCKED";
    else if (averageRating < REPUTATION_THRESHOLD_WARN) zone = "THROTTLED";
  }

  return { averageRating, totalReviews, zone };
}

/** Stable pseudo-random keep/drop for throttled vendors. */
export function throttleKeepsJob(vendorId: string, jobId: string): boolean {
  let hash = 0;
  const key = `${vendorId}:${jobId}`;
  for (let i = 0; i < key.length; i++) {
    hash = (hash * 31 + key.charCodeAt(i)) >>> 0;
  }
  return (hash % 100) / 100 < THROTTLE_KEEP_RATIO;
}
