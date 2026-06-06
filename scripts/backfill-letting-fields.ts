/**
 * Backfill letting/search fields for existing residential listings.
 *
 * - furnishingStatus from furnished (when missing)
 * - billsIncluded from sharedBills or key features (when missing)
 * - petPolicy from pets key features (when missing)
 * - keyFeatures: sync pets-allowed / bills-included tokens from letting data
 * - propertyListingHistory.availableFrom from residential.availableFrom
 *
 * Run:  npm run db:backfill-letting
 * Dry:  npm run db:backfill-letting -- --dry-run
 */
import { FurnishingStatus, PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';

dotenv.config();

const prisma = new PrismaClient();
const dryRun = process.argv.includes('--dry-run');

const NO_PETS_PATTERN = /\b(no\s*pets|not\s*allowed|pets?\s*not)\b/i;

const PET_TOKENS = new Set([
  'pets-allowed',
  'pet friendly',
  'pets allowed',
  'pet-friendly',
]);

const BILLS_TOKENS = new Set([
  'bills-included',
  'bills included',
]);

type SharedBills = Record<string, boolean>;

function parseSharedBills(value: unknown): SharedBills | null {
  if (value == null || typeof value !== 'object' || Array.isArray(value)) {
    return null;
  }
  const out: SharedBills = {};
  for (const [key, entry] of Object.entries(value as Record<string, unknown>)) {
    if (typeof entry === 'boolean') out[key] = entry;
  }
  return Object.keys(out).length > 0 ? out : null;
}

function hasTruthyBill(sharedBills: SharedBills | null): boolean {
  return sharedBills != null && Object.values(sharedBills).some(Boolean);
}

function featureMatches(tokens: Set<string>, features: string[]): boolean {
  return features.some((feature) => tokens.has(String(feature).trim().toLowerCase()));
}

function enrichKeyFeatures(
  features: string[],
  opts: {
    petPolicy?: string | null;
    sharedBills?: SharedBills | null;
    billsIncluded?: boolean | null;
  }
): string[] {
  const set = new Set(features.filter((feature) => Boolean(feature?.trim())));

  const policy = opts.petPolicy?.trim();
  if (policy) {
    if (NO_PETS_PATTERN.test(policy)) {
      set.delete('pets-allowed');
    } else {
      set.add('pets-allowed');
    }
  }

  const hasBills =
    opts.billsIncluded === true || hasTruthyBill(opts.sharedBills ?? null);
  if (hasBills) {
    set.add('bills-included');
  }

  return [...set];
}

function arraysEqual(a: string[], b: string[]): boolean {
  if (a.length !== b.length) return false;
  const sortedA = [...a].sort();
  const sortedB = [...b].sort();
  return sortedA.every((value, index) => value === sortedB[index]);
}

type Stats = {
  residentialScanned: number;
  residentialUpdated: number;
  propertiesScanned: number;
  propertiesKeyFeaturesUpdated: number;
  listingsScanned: number;
  listingsAvailableFromUpdated: number;
};

async function backfillResidential(stats: Stats) {
  const residentialRows = await prisma.residentialProperty.findMany({
    include: {
      PropertySpecification: {
        where: { isActive: true },
        include: {
          property: {
            select: {
              id: true,
              isDeleted: true,
              keyFeatures: true,
              customKeyFeatures: true,
            },
          },
        },
      },
    },
  });

  for (const residential of residentialRows) {
    stats.residentialScanned += 1;

    const activeSpec = residential.PropertySpecification.find(
      (spec) => spec.property && !spec.property.isDeleted
    );
    if (!activeSpec?.property) continue;

    const property = activeSpec.property;
    const allFeatures = [
      ...(property.keyFeatures ?? []),
      ...(property.customKeyFeatures ?? []),
    ];

    const sharedBills = parseSharedBills(residential.sharedBills);
    const patch: {
      furnishingStatus?: FurnishingStatus;
      billsIncluded?: boolean;
      petPolicy?: string;
    } = {};

    if (residential.furnishingStatus == null && residential.furnished != null) {
      patch.furnishingStatus = residential.furnished
        ? FurnishingStatus.FURNISHED
        : FurnishingStatus.UNFURNISHED;
    }

    if (residential.billsIncluded == null) {
      if (hasTruthyBill(sharedBills)) {
        patch.billsIncluded = true;
      } else if (featureMatches(BILLS_TOKENS, allFeatures)) {
        patch.billsIncluded = true;
      }
    }

    if (!residential.petPolicy?.trim()) {
      if (featureMatches(PET_TOKENS, allFeatures)) {
        patch.petPolicy = 'Pets allowed';
      }
    }

    if (Object.keys(patch).length === 0) continue;

    stats.residentialUpdated += 1;
    console.log(
      `[residential] ${residential.id} (property ${property.id}):`,
      patch
    );

    if (!dryRun) {
      await prisma.residentialProperty.update({
        where: { id: residential.id },
        data: patch,
      });
    }
  }
}

async function backfillPropertyKeyFeatures(stats: Stats) {
  const properties = await prisma.properties.findMany({
    where: {
      isDeleted: false,
      specificationType: 'RESIDENTIAL',
    },
    select: {
      id: true,
      name: true,
      keyFeatures: true,
      specification: {
        where: { isActive: true, specificationType: 'RESIDENTIAL' },
        include: { residential: true },
      },
    },
  });

  for (const property of properties) {
    stats.propertiesScanned += 1;
    const residential = property.specification[0]?.residential;
    if (!residential) continue;

    const sharedBills = parseSharedBills(residential.sharedBills);
    const nextFeatures = enrichKeyFeatures(property.keyFeatures ?? [], {
      petPolicy: residential.petPolicy,
      sharedBills,
      billsIncluded: residential.billsIncluded,
    });

    if (arraysEqual(property.keyFeatures ?? [], nextFeatures)) continue;

    stats.propertiesKeyFeaturesUpdated += 1;
    console.log(
      `[keyFeatures] ${property.name} (${property.id}):`,
      property.keyFeatures,
      '->',
      nextFeatures
    );

    if (!dryRun) {
      await prisma.properties.update({
        where: { id: property.id },
        data: { keyFeatures: nextFeatures },
      });
    }
  }
}

async function backfillListingAvailableFrom(stats: Stats) {
  const listings = await prisma.propertyListingHistory.findMany({
    where: {
      isActive: true,
      onListing: true,
      availableFrom: null,
      propertyId: { not: null },
      listAs: 'RESIDENTIAL',
    },
    select: {
      id: true,
      propertyId: true,
      property: {
        select: {
          name: true,
          specification: {
            where: { isActive: true, specificationType: 'RESIDENTIAL' },
            include: { residential: { select: { availableFrom: true } } },
          },
        },
      },
    },
  });

  for (const listing of listings) {
    stats.listingsScanned += 1;
    const availableFrom =
      listing.property?.specification[0]?.residential?.availableFrom;
    if (!availableFrom) continue;

    stats.listingsAvailableFromUpdated += 1;
    console.log(
      `[listing] ${listing.id} (${listing.property?.name}): availableFrom ->`,
      availableFrom.toISOString()
    );

    if (!dryRun) {
      await prisma.propertyListingHistory.update({
        where: { id: listing.id },
        data: { availableFrom },
      });
    }
  }
}

async function main() {
  const stats: Stats = {
    residentialScanned: 0,
    residentialUpdated: 0,
    propertiesScanned: 0,
    propertiesKeyFeaturesUpdated: 0,
    listingsScanned: 0,
    listingsAvailableFromUpdated: 0,
  };

  console.log(dryRun ? 'DRY RUN — no writes' : 'LIVE RUN — applying updates');
  console.log('---');

  await backfillResidential(stats);
  await backfillPropertyKeyFeatures(stats);
  await backfillListingAvailableFrom(stats);

  console.log('---');
  console.log('Summary:', stats);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
