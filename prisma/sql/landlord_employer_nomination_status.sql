-- Landlord and employer reference nomination consent tracking
ALTER TABLE "residentialInformation"
  ADD COLUMN IF NOT EXISTS "nominationStatus" "GuarantorNominationStatus" NOT NULL DEFAULT 'PENDING',
  ADD COLUMN IF NOT EXISTS "nominationRespondedAt" TIMESTAMP(3);

ALTER TABLE "EmploymentInformation"
  ADD COLUMN IF NOT EXISTS "nominationStatus" "GuarantorNominationStatus" NOT NULL DEFAULT 'PENDING',
  ADD COLUMN IF NOT EXISTS "nominationRespondedAt" TIMESTAMP(3);
