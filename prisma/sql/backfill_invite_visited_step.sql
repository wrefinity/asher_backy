-- Backfill VISITED in responseStepsCompleted for invites that reached post-visit
-- states without recording the viewing-completed step (landlord confirm attendance).

UPDATE "applicationInvites"
SET "responseStepsCompleted" = array_append("responseStepsCompleted", 'VISITED'::"InvitedResponse")
WHERE response IN (
  'AWAITING_FEEDBACK',
  'FEEDBACK',
  'APPLY',
  'APPLICATION_NOT_STARTED',
  'APPLICATION_STARTED',
  'SUBMITTED',
  'APPROVED',
  'TENANT_CREATED',
  'AGREEMENTS'
)
AND NOT ('VISITED' = ANY("responseStepsCompleted"))
AND NOT ('NOT_VISITED' = ANY("responseStepsCompleted"));
