-- Maintenance category Lucide icon id (e.g. Wrench, Droplets)
ALTER TABLE "category"
  ADD COLUMN IF NOT EXISTS "icon" TEXT;
