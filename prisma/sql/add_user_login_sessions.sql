-- Login session tracking for Settings → Security → Login Activity
-- Safe to re-run (IF NOT EXISTS). Apply on each environment after deploy:
--   npm run db:login-sessions
-- Or: npx prisma db execute --file prisma/sql/add_user_login_sessions.sql

CREATE TABLE IF NOT EXISTS "UserLoginSession" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "tokenHash" TEXT NOT NULL,
  "userAgent" TEXT,
  "ipAddress" TEXT,
  "deviceLabel" TEXT,
  "lastActiveAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "revokedAt" TIMESTAMP(3),
  CONSTRAINT "UserLoginSession_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "UserLoginSession_tokenHash_key"
  ON "UserLoginSession"("tokenHash");

CREATE INDEX IF NOT EXISTS "UserLoginSession_userId_idx"
  ON "UserLoginSession"("userId");

DO $$ BEGIN
  ALTER TABLE "UserLoginSession"
    ADD CONSTRAINT "UserLoginSession_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "users"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
