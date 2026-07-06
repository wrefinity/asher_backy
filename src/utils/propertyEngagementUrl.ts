/** Frontend property page URLs returned in engagement actionHref fields. */

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
