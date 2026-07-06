/** Frontend tenant-web URLs returned in engagement actionHref fields. */

export type PropertyEngagementQuery = {
  focus?: "viewing" | "apply" | "payment" | "status" | "feedback";
  applicationId?: string;
  applicationInviteId?: string;
  invitationId?: string;
  status?: string;
};

export function propertyEngagementUrl(
  listingId: string,
  query: PropertyEngagementQuery = {}
): string {
  if (!listingId?.trim()) return "/search";

  const params = new URLSearchParams();
  if (query.focus) params.set("focus", query.focus);
  if (query.applicationId) params.set("applicationId", query.applicationId);
  if (query.applicationInviteId) {
    params.set("applicationInviteId", query.applicationInviteId);
  }
  if (query.invitationId) params.set("invitationId", query.invitationId);
  if (query.status) params.set("status", query.status);

  const qs = params.toString();
  return qs ? `/property/${listingId}?${qs}` : `/property/${listingId}`;
}

export function viewingInviteUrl(
  inviteId: string,
  opts?: {
    listingId?: string;
    scheduleDate?: string;
    from?: string;
  }
): string {
  const params = new URLSearchParams();
  if (opts?.scheduleDate) params.set("schedule_date", opts.scheduleDate);
  if (opts?.from) params.set("from", opts.from);
  const qs = params.toString();
  return `/dashboard/property-viewings/${encodeURIComponent(inviteId)}${qs ? `?${qs}` : ""}`;
}

export function applicationApplyUrl(opts: {
  applicationId?: string;
  applicationInviteId?: string;
  propertyId?: string;
  listingId?: string;
  resume?: boolean;
}): string {
  const { applicationId, applicationInviteId, propertyId, listingId, resume } =
    opts;

  const params = new URLSearchParams();
  if (resume) params.set("status", "resume");

  if (applicationId) {
    const qs = params.toString();
    return `/dashboard/applications/${applicationId}/apply${qs ? `?${qs}` : ""}`;
  }

  const pathId = propertyId?.trim() || listingId?.trim() || "start";
  if (applicationInviteId) {
    params.set("applicationInviteId", applicationInviteId);
  }
  const qs = params.toString();
  return qs
    ? `/dashboard/applications/${pathId}/apply?${qs}`
    : `/dashboard/applications/${pathId}/apply`;
}
