-- Cached Google Places results for property map display (refreshed on save / TTL).
ALTER TABLE "properties"
  ADD COLUMN IF NOT EXISTS "cachedNearbyPlaces" JSONB,
  ADD COLUMN IF NOT EXISTS "cachedNearbyPlacesFetchedAt" TIMESTAMP(3);
