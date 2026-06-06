import { isActivePipelineInvite } from "./InviteStateMachine";

/** Logical enquiry lifecycle — derived from Log + invite, not a separate table yet. */
export type EnquiryLifecycle = "OPEN" | "INVITED" | "CLOSED";

export const ENQUIRY_LIFECYCLE_LABELS: Record<EnquiryLifecycle, string> = {
  OPEN: "Open enquiry",
  INVITED: "In progress",
  CLOSED: "Closed",
};

export function resolveEnquiryLifecycle(
  enquiryStatus: string | null | undefined,
  inviteResponse: string | null | undefined
): EnquiryLifecycle {
  if (inviteResponse) {
    return isActivePipelineInvite(inviteResponse) ? "INVITED" : "CLOSED";
  }
  if (enquiryStatus === "REJECTED") return "CLOSED";
  if (enquiryStatus === "PENDING") return "OPEN";
  return "OPEN";
}

export function formatEnquiryLifecycle(
  lifecycle: EnquiryLifecycle
): string {
  return ENQUIRY_LIFECYCLE_LABELS[lifecycle] ?? lifecycle;
}
