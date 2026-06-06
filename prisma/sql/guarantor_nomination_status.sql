-- Run after deploying schema: adds guarantor nomination consent tracking
DO $$ BEGIN
  CREATE TYPE "GuarantorNominationStatus" AS ENUM ('PENDING', 'ACCEPTED', 'DECLINED');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE "guarantorInformation"
  ADD COLUMN IF NOT EXISTS "nominationStatus" "GuarantorNominationStatus" NOT NULL DEFAULT 'PENDING',
  ADD COLUMN IF NOT EXISTS "nominationRespondedAt" TIMESTAMP(3);
