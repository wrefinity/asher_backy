-- Backfill applicationInvites.propertyListingId from linked enquiry Log rows
UPDATE "applicationInvites" AS ai
SET "propertyListingId" = l."propertyListingId"
FROM "Log" AS l
WHERE ai."enquiryId" = l.id
  AND ai."propertyListingId" IS NULL
  AND l."propertyListingId" IS NOT NULL;
