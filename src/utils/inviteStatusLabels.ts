/** Human-readable labels for InvitedResponse enum values (DB values unchanged). */

export type InviteStatusAudience = "tenant" | "landlord";

const TENANT_LABELS: Record<string, string> = {
  PENDING: "Viewing invite received",
  SCHEDULED: "Viewing scheduled",
  RESCHEDULED: "Reschedule requested",
  RESCHEDULED_ACCEPTED: "Reschedule accepted",
  RE_INVITED: "Re-invited to view",
  VISITED: "Viewing completed",
  NOT_VISITED: "Did not attend",
  REJECTED: "Declined",
  DECLINED: "Declined",
  ACCEPTED: "Viewing accepted",
  AWAITING_FEEDBACK: "Awaiting your feedback",
  FEEDBACK: "Feedback submitted",
  COMPLETED: "Viewing completed",
  CANCELLED: "Cancelled",
  APPLY: "Invited to apply",
  APPLICATION_STARTED: "Application in progress",
  APPLICATION_NOT_STARTED: "Ready to apply",
  SUBMITTED: "Application submitted",
  APPROVED: "Application approved",
  TENANT_CREATED: "Tenancy created",
  AGREEMENTS: "Agreement in progress",
};

const LANDLORD_LABELS: Record<string, string> = {
  PENDING: "Invite pending",
  SCHEDULED: "Viewing scheduled",
  RESCHEDULED: "Reschedule requested",
  RESCHEDULED_ACCEPTED: "Reschedule accepted",
  RE_INVITED: "Re-invited",
  VISITED: "Viewing completed",
  NOT_VISITED: "Tenant did not attend",
  REJECTED: "Declined by tenant",
  DECLINED: "Declined",
  ACCEPTED: "Accepted",
  AWAITING_FEEDBACK: "Awaiting tenant feedback",
  FEEDBACK: "Feedback received",
  COMPLETED: "Viewing completed",
  CANCELLED: "Cancelled",
  APPLY: "Invited to apply",
  APPLICATION_STARTED: "Application in progress",
  APPLICATION_NOT_STARTED: "Ready to apply",
  SUBMITTED: "Application submitted",
  APPROVED: "Application approved",
  TENANT_CREATED: "Tenancy created",
  AGREEMENTS: "Agreement in progress",
};

function humanizeEnum(value: string): string {
  const text = value.replace(/_/g, " ").trim().toLowerCase();
  if (!text) return "Unknown";
  return text.charAt(0).toUpperCase() + text.slice(1);
}

export function formatInviteStatus(
  status: string | null | undefined,
  audience: InviteStatusAudience = "tenant"
): string {
  if (!status?.trim()) return "Unknown";
  const key = status.trim().toUpperCase();
  const labels = audience === "landlord" ? LANDLORD_LABELS : TENANT_LABELS;
  return labels[key] ?? humanizeEnum(key);
}
