import { InvitedResponse } from "@prisma/client";

/** Canonical tenant viewing pipeline order for timelines and checklists. */
export const TENANT_VIEWING_PIPELINE: InvitedResponse[] = [
  InvitedResponse.PENDING,
  InvitedResponse.ACCEPTED,
  InvitedResponse.RESCHEDULED_ACCEPTED,
  InvitedResponse.VISITED,
  InvitedResponse.AWAITING_FEEDBACK,
  InvitedResponse.FEEDBACK,
  InvitedResponse.APPLY,
  InvitedResponse.APPLICATION_STARTED,
  InvitedResponse.SUBMITTED,
  InvitedResponse.APPROVED,
  InvitedResponse.TENANT_CREATED,
];

const POST_VISIT_RESPONSES: InvitedResponse[] = [
  InvitedResponse.AWAITING_FEEDBACK,
  InvitedResponse.FEEDBACK,
  InvitedResponse.APPLY,
  InvitedResponse.APPLICATION_STARTED,
  InvitedResponse.APPLICATION_NOT_STARTED,
  InvitedResponse.SUBMITTED,
  InvitedResponse.APPROVED,
  InvitedResponse.TENANT_CREATED,
  InvitedResponse.AGREEMENTS,
];

/**
 * When landlord confirms attendance they set AWAITING_FEEDBACK directly.
 * Ensure VISITED is recorded in step history for a complete timeline.
 */
export function withImplicitInviteSteps(
  completed: InvitedResponse[],
  next: InvitedResponse
): InvitedResponse[] {
  const steps = [...completed];
  const add = (step: InvitedResponse) => {
    if (!steps.includes(step)) steps.push(step);
  };

  if (next === InvitedResponse.AWAITING_FEEDBACK) {
    add(InvitedResponse.VISITED);
  }

  if (
    POST_VISIT_RESPONSES.includes(next) &&
    !steps.includes(InvitedResponse.VISITED) &&
    !steps.includes(InvitedResponse.NOT_VISITED)
  ) {
    add(InvitedResponse.VISITED);
  }

  add(next);
  return steps;
}

export function orderedTimelineSteps(
  completed: InvitedResponse[],
  current?: InvitedResponse | null
): InvitedResponse[] {
  const set = new Set<InvitedResponse>([
    ...completed,
    ...(current ? [current] : []),
  ]);

  if (
    [...set].some((s) => POST_VISIT_RESPONSES.includes(s)) &&
    !set.has(InvitedResponse.VISITED) &&
    !set.has(InvitedResponse.NOT_VISITED)
  ) {
    set.add(InvitedResponse.VISITED);
  }

  return TENANT_VIEWING_PIPELINE.filter((step) => set.has(step));
}
