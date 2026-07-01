/**
 * Deactivate live listings for occupied properties/units/rooms.
 *
 * Run:  npm run db:unlist-occupied
 * Dry:  npm run db:unlist-occupied:dry
 */
import { ListingType, PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';

dotenv.config();

const prisma = new PrismaClient();
const dryRun = process.argv.includes('--dry-run');

function resolveVacancyStatus(
  availability?: string | null,
  fallback?: string | null
): 'VACANT' | 'OCCUPIED' | 'OTHER' {
  const raw =
    availability != null && String(availability).trim() !== ''
      ? String(availability).trim().toUpperCase()
      : null;
  if (raw === 'VACANT') return 'VACANT';
  if (raw === 'OCCUPIED') return 'OCCUPIED';
  if (raw) return 'OTHER';
  const fb =
    fallback != null && String(fallback).trim() !== ''
      ? String(fallback).trim().toUpperCase()
      : null;
  if (fb === 'VACANT') return 'VACANT';
  if (fb === 'OCCUPIED') return 'OCCUPIED';
  return 'VACANT';
}

function isEntityVacant(
  availability?: string | null,
  fallback?: string | null
): boolean {
  return resolveVacancyStatus(availability, fallback) === 'VACANT';
}

function isListingEntityVacant(listing: {
  type: ListingType;
  property: { availability: string | null; id: string; name: string | null };
  unit: { availability: string | null } | null;
  room: { availability: string | null } | null;
}): boolean {
  if (listing.type === ListingType.ENTIRE_PROPERTY) {
    return isEntityVacant(listing.property.availability);
  }
  if (listing.type === ListingType.SINGLE_UNIT) {
    return isEntityVacant(
      listing.unit?.availability,
      listing.property.availability
    );
  }
  if (listing.type === ListingType.ROOM) {
    return isEntityVacant(
      listing.room?.availability,
      listing.unit?.availability ?? listing.property.availability
    );
  }
  return true;
}

async function main() {
  const activeListings = await prisma.propertyListingHistory.findMany({
    where: {
      onListing: true,
      isActive: true,
      property: { isDeleted: false },
    },
    include: {
      property: { select: { id: true, name: true, availability: true } },
      unit: { select: { availability: true } },
      room: { select: { availability: true } },
    },
  });

  const occupied = activeListings.filter(
    (listing) => !isListingEntityVacant(listing)
  );

  console.log(
    `Found ${occupied.length} active listing(s) on occupied entities (of ${activeListings.length} active total).`
  );

  if (!occupied.length) {
    return;
  }

  for (const listing of occupied) {
    const label = [
      listing.type,
      listing.property.name || listing.property.id,
      listing.unitId ? `unit:${listing.unitId}` : null,
      listing.roomId ? `room:${listing.roomId}` : null,
    ]
      .filter(Boolean)
      .join(' | ');

    console.log(`- ${listing.id} — ${label}`);

    if (dryRun) continue;

    await prisma.$transaction(async (tx) => {
      await tx.propertyListingHistory.update({
        where: { id: listing.id },
        data: {
          onListing: false,
          isActive: false,
          availableTo: new Date(),
        },
      });

      if (listing.type === ListingType.ENTIRE_PROPERTY) {
        await tx.properties.update({
          where: { id: listing.propertyId! },
          data: { isListed: false },
        });
      } else if (listing.unitId) {
        await tx.unitConfiguration.update({
          where: { id: listing.unitId },
          data: { isListed: false },
        });
      } else if (listing.roomId) {
        await tx.roomDetail.update({
          where: { id: listing.roomId },
          data: { isListed: false },
        });
      }

      const remaining = await tx.propertyListingHistory.count({
        where: {
          propertyId: listing.propertyId!,
          onListing: true,
          isActive: true,
        },
      });

      if (remaining === 0) {
        await tx.properties.update({
          where: { id: listing.propertyId! },
          data: { isListed: false },
        });
      }
    });
  }

  if (dryRun) {
    console.log('Dry run only — no rows updated.');
  } else {
    console.log('Done.');
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
