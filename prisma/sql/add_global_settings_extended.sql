-- Extended global landlord settings (refund %, reminders, market rules, operations)
ALTER TABLE "Settings" ADD COLUMN IF NOT EXISTS "refundPartialPercentage" DOUBLE PRECISION;
ALTER TABLE "Settings" ADD COLUMN IF NOT EXISTS "billReminderLeadPercent" INTEGER;
ALTER TABLE "Settings" ADD COLUMN IF NOT EXISTS "leaseRenewalRemindersEnabled" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Settings" ADD COLUMN IF NOT EXISTS "leaseRenewalReminderFirst" INTEGER;
ALTER TABLE "Settings" ADD COLUMN IF NOT EXISTS "leaseRenewalReminderSecond" INTEGER;
ALTER TABLE "Settings" ADD COLUMN IF NOT EXISTS "leaseRenewalReminderFinal" INTEGER;
ALTER TABLE "Settings" ADD COLUMN IF NOT EXISTS "holdingDepositMaxWeeks" DOUBLE PRECISION;
ALTER TABLE "Settings" ADD COLUMN IF NOT EXISTS "rentIncreaseNoticeDays" INTEGER;
ALTER TABLE "Settings" ADD COLUMN IF NOT EXISTS "defaultRentCollectionFrequency" "FrequencyType";
ALTER TABLE "Settings" ADD COLUMN IF NOT EXISTS "lateFeeMaxPercent" DOUBLE PRECISION;
ALTER TABLE "Settings" ADD COLUMN IF NOT EXISTS "autoCreateRentBill" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Settings" ADD COLUMN IF NOT EXISTS "defaultRentDueDay" INTEGER;
ALTER TABLE "Settings" ADD COLUMN IF NOT EXISTS "depositReturnTimeframe" "FrequencyType";
ALTER TABLE "Settings" ADD COLUMN IF NOT EXISTS "inspectionNoticeHours" INTEGER;
