-- Property operational PMS profile (compliance, insurance, utilities, ownership)
-- Run: npm run db:property-operational

CREATE TYPE "PropertyComplianceCertType" AS ENUM (
  'GAS_SAFETY',
  'EICR',
  'EPC',
  'FIRE_RISK_ASSESSMENT',
  'LEGIONELLA',
  'HMO_LICENCE',
  'ASBESTOS',
  'PAT_TESTING',
  'SMOKE_CO_ALARM',
  'LEAD_PAINT_DISCLOSURE',
  'BUSINESS_FIRE_SAFETY',
  'EMERGENCY_LIGHTING',
  'PLANNING_PERMISSION',
  'OTHER'
);

CREATE TYPE "ComplianceRecordStatus" AS ENUM (
  'VALID',
  'EXPIRED',
  'EXPIRING_SOON',
  'PENDING',
  'NOT_APPLICABLE'
);

CREATE TYPE "PropertyInsuranceType" AS ENUM (
  'BUILDINGS',
  'CONTENTS',
  'LANDLORD',
  'PUBLIC_LIABILITY',
  'RENT_GUARANTEE',
  'COMMERCIAL_COMBINED',
  'OTHER'
);

CREATE TYPE "PropertyUtilityType" AS ENUM (
  'ELECTRICITY',
  'GAS',
  'WATER',
  'BROADBAND',
  'COUNCIL_TAX',
  'BUSINESS_RATES',
  'SEWER',
  'TRASH',
  'GENERATOR',
  'ESTATE_SECURITY',
  'OTHER'
);

CREATE TYPE "UtilityPaidBy" AS ENUM (
  'LANDLORD',
  'TENANT',
  'INCLUDED_IN_RENT',
  'SHARED'
);

CREATE TYPE "OwnerEntityType" AS ENUM (
  'INDIVIDUAL',
  'LIMITED_COMPANY',
  'TRUST',
  'PARTNERSHIP',
  'SPV',
  'OTHER'
);

ALTER TABLE "properties"
  ADD COLUMN IF NOT EXISTS "operationalProfileComplete" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "operationalProfileCompletedAt" TIMESTAMP(3);

CREATE TABLE IF NOT EXISTS "propertyComplianceRecord" (
  "id" TEXT NOT NULL,
  "propertyId" TEXT NOT NULL,
  "certType" "PropertyComplianceCertType" NOT NULL,
  "certificateNumber" TEXT,
  "issueDate" TIMESTAMP(3),
  "expiryDate" TIMESTAMP(3),
  "status" "ComplianceRecordStatus" NOT NULL DEFAULT 'PENDING',
  "documentId" TEXT,
  "notes" TEXT,
  "reminderSentAt" TIMESTAMP(3),
  "isDeleted" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "propertyComplianceRecord_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "propertyComplianceRecord_propertyId_fkey"
    FOREIGN KEY ("propertyId") REFERENCES "properties"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "propertyComplianceRecord_propertyId_isDeleted_idx"
  ON "propertyComplianceRecord"("propertyId", "isDeleted");
CREATE INDEX IF NOT EXISTS "propertyComplianceRecord_expiryDate_status_idx"
  ON "propertyComplianceRecord"("expiryDate", "status");
CREATE INDEX IF NOT EXISTS "propertyComplianceRecord_certType_idx"
  ON "propertyComplianceRecord"("certType");

CREATE TABLE IF NOT EXISTS "propertyInsurance" (
  "id" TEXT NOT NULL,
  "propertyId" TEXT NOT NULL,
  "insuranceType" "PropertyInsuranceType" NOT NULL,
  "provider" TEXT,
  "policyNumber" TEXT,
  "coverAmount" DECIMAL(18,2),
  "premium" DECIMAL(18,2),
  "premiumFrequency" TEXT,
  "renewalDate" TIMESTAMP(3),
  "startDate" TIMESTAMP(3),
  "documentId" TEXT,
  "notes" TEXT,
  "isDeleted" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "propertyInsurance_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "propertyInsurance_propertyId_fkey"
    FOREIGN KEY ("propertyId") REFERENCES "properties"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "propertyInsurance_propertyId_isDeleted_idx"
  ON "propertyInsurance"("propertyId", "isDeleted");
CREATE INDEX IF NOT EXISTS "propertyInsurance_renewalDate_idx"
  ON "propertyInsurance"("renewalDate");

CREATE TABLE IF NOT EXISTS "propertyUtilityAccount" (
  "id" TEXT NOT NULL,
  "propertyId" TEXT NOT NULL,
  "utilityType" "PropertyUtilityType" NOT NULL,
  "supplier" TEXT,
  "accountNumber" TEXT,
  "meterNumber" TEXT,
  "paidBy" "UtilityPaidBy" NOT NULL DEFAULT 'LANDLORD',
  "annualEstimate" DECIMAL(18,2),
  "notes" TEXT,
  "isDeleted" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "propertyUtilityAccount_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "propertyUtilityAccount_propertyId_fkey"
    FOREIGN KEY ("propertyId") REFERENCES "properties"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "propertyUtilityAccount_propertyId_isDeleted_idx"
  ON "propertyUtilityAccount"("propertyId", "isDeleted");
CREATE INDEX IF NOT EXISTS "propertyUtilityAccount_utilityType_idx"
  ON "propertyUtilityAccount"("utilityType");

CREATE TABLE IF NOT EXISTS "propertyOwnershipProfile" (
  "id" TEXT NOT NULL,
  "propertyId" TEXT NOT NULL,
  "ownerEntityType" "OwnerEntityType",
  "ownerEntityName" TEXT,
  "acquisitionDate" TIMESTAMP(3),
  "acquisitionCost" DECIMAL(18,2),
  "mortgageLender" TEXT,
  "mortgageAccountRef" TEXT,
  "titleReference" TEXT,
  "taxReference" TEXT,
  "notes" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "propertyOwnershipProfile_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "propertyOwnershipProfile_propertyId_key" UNIQUE ("propertyId"),
  CONSTRAINT "propertyOwnershipProfile_propertyId_fkey"
    FOREIGN KEY ("propertyId") REFERENCES "properties"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "propertyOwnershipProfile_propertyId_idx"
  ON "propertyOwnershipProfile"("propertyId");
