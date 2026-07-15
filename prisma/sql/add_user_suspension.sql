ALTER TABLE "users"
  ADD COLUMN IF NOT EXISTS "isSuspended" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "suspendedAt" TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS "users_isSuspended_idx"
  ON "users" ("isSuspended");
