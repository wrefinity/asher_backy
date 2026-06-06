import { InvitedResponse } from "@prisma/client";

/** Terminal invite responses — no further progression allowed. */
export const TERMINAL_INVITE_RESPONSES: InvitedResponse[] = [
  InvitedResponse.DECLINED,
  InvitedResponse.REJECTED,
  InvitedResponse.CANCELLED,
  InvitedResponse.TENANT_CREATED,
];

/** Responses that block new actions when present in step history. */
export const FORBIDDEN_INVITE_HISTORY: InvitedResponse[] = [
  ...TERMINAL_INVITE_RESPONSES,
];

/** Active viewing / application pipeline — shown in enquiries pipeline section. */
export const ACTIVE_PIPELINE_RESPONSES: InvitedResponse[] = [
  InvitedResponse.PENDING,
  InvitedResponse.SCHEDULED,
  InvitedResponse.RESCHEDULED,
  InvitedResponse.RESCHEDULED_ACCEPTED,
  InvitedResponse.ACCEPTED,
  InvitedResponse.RE_INVITED,
  InvitedResponse.AWAITING_FEEDBACK,
  InvitedResponse.FEEDBACK,
  InvitedResponse.APPLY,
  InvitedResponse.APPLICATION_STARTED,
  InvitedResponse.APPLICATION_NOT_STARTED,
  InvitedResponse.VISITED,
  InvitedResponse.NOT_VISITED,
  InvitedResponse.SUBMITTED,
  InvitedResponse.APPROVED,
  InvitedResponse.AGREEMENTS,
];

/** Landlord must complete these before prompting tenant to apply. */
export const LANDLORD_APPLY_PREREQUISITES: InvitedResponse[] = [
  InvitedResponse.FEEDBACK,
  InvitedResponse.AWAITING_FEEDBACK,
  InvitedResponse.PENDING,
];

/** Tenant must see these in history before starting an application. */
export const TENANT_APPLICATION_START_PREREQUISITES: InvitedResponse[] = [
  InvitedResponse.APPLY,
  InvitedResponse.AWAITING_FEEDBACK,
  InvitedResponse.FEEDBACK,
  InvitedResponse.PENDING,
];

/** Responses a web user (tenant) may set via PATCH /invites/update/:id */
export const TENANT_SETTABLE_RESPONSES: InvitedResponse[] = [
  InvitedResponse.ACCEPTED,
  InvitedResponse.REJECTED,
  InvitedResponse.RESCHEDULED,
  InvitedResponse.CANCELLED,
  InvitedResponse.FEEDBACK,
  InvitedResponse.NOT_VISITED,
  InvitedResponse.VISITED,
];

export interface InviteValidationResult {
  valid: boolean;
  error?: string;
}

export function hasForbiddenInviteHistory(
  steps: InvitedResponse[] | null | undefined
): boolean {
  return (steps ?? []).some((step) =>
    FORBIDDEN_INVITE_HISTORY.includes(step)
  );
}

export function hasRequiredInviteSteps(
  steps: InvitedResponse[] | null | undefined,
  required: InvitedResponse[]
): boolean {
  const completed = steps ?? [];
  return required.every((step) => completed.includes(step));
}

export function isTerminalInviteResponse(
  response: InvitedResponse | string | null | undefined
): boolean {
  if (!response) return false;
  return TERMINAL_INVITE_RESPONSES.includes(response as InvitedResponse);
}

export function isActivePipelineInvite(
  response: InvitedResponse | string | null | undefined
): boolean {
  if (!response) return false;
  return ACTIVE_PIPELINE_RESPONSES.includes(response as InvitedResponse);
}

export function validateLandlordInviteUpdate(
  invite: {
    responseStepsCompleted?: InvitedResponse[] | null;
  },
  nextResponse: InvitedResponse
): InviteValidationResult {
  if (hasForbiddenInviteHistory(invite.responseStepsCompleted)) {
    return {
      valid: false,
      error: "This invitation was declined or rejected",
    };
  }

  if (nextResponse === InvitedResponse.APPLY) {
    if (
      !hasRequiredInviteSteps(
        invite.responseStepsCompleted,
        LANDLORD_APPLY_PREREQUISITES
      )
    ) {
      return {
        valid: false,
        error:
          "Application requires completion of SCHEDULING, FEEDBACK, and PENDING steps before prompting the user to apply",
      };
    }
  }

  return { valid: true };
}

export function validateTenantApplicationStart(
  invite: {
    responseStepsCompleted?: InvitedResponse[] | null;
  }
): InviteValidationResult {
  if (hasForbiddenInviteHistory(invite.responseStepsCompleted)) {
    return {
      valid: false,
      error: "This invitation is declined or rejected",
    };
  }

  if (
    !hasRequiredInviteSteps(
      invite.responseStepsCompleted,
      TENANT_APPLICATION_START_PREREQUISITES
    )
  ) {
    return {
      valid: false,
      error:
        "Application requires completion of APPLY, FEEDBACK, and PENDING steps",
    };
  }

  return { valid: true };
}

export function validateTenantInviteUpdate(
  invite: {
    response?: InvitedResponse | null;
    responseStepsCompleted?: InvitedResponse[] | null;
  },
  nextResponse: InvitedResponse
): InviteValidationResult {
  if (hasForbiddenInviteHistory(invite.responseStepsCompleted)) {
    return {
      valid: false,
      error: "This invitation was declined or rejected",
    };
  }

  if (!TENANT_SETTABLE_RESPONSES.includes(nextResponse)) {
    return {
      valid: false,
      error: `Tenants cannot set invite response to ${nextResponse}`,
    };
  }

  const current = invite.response ?? InvitedResponse.PENDING;

  if (isTerminalInviteResponse(current)) {
    return {
      valid: false,
      error: "This invitation is no longer active",
    };
  }

  // Tenant feedback only valid when landlord requested it
  if (nextResponse === InvitedResponse.FEEDBACK) {
    const awaiting =
      current === InvitedResponse.AWAITING_FEEDBACK ||
      (invite.responseStepsCompleted ?? []).includes(
        InvitedResponse.AWAITING_FEEDBACK
      );
    if (!awaiting) {
      return {
        valid: false,
        error: "Feedback can only be submitted when awaiting feedback",
      };
    }
  }

  return { valid: true };
}
