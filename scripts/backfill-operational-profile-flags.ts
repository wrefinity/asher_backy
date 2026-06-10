/**
 * Recalculate operationalProfileComplete flags using market config scoring.
 * Run: cd AsherBE && npm run db:backfill-operational
 * Dry run: npm run db:backfill-operational:dry
 */
import 'dotenv/config';
import { prismaClient } from '../src/db/prismaClient';
import {
  computeOperationalCompleteness,
  getPropertyPmsFormConfig,
} from '../src/utils/propertyPmsFormConfig';

const dryRun = process.argv.includes('--dry-run');

async function main() {
  const properties = await prismaClient.properties.findMany({
    where: { isDeleted: false },
    select: {
      id: true,
      name: true,
      country: true,
      specificationType: true,
      operationalProfileComplete: true,
      complianceRecords: { where: { isDeleted: false } },
      insurancePolicies: { where: { isDeleted: false } },
      utilityAccounts: { where: { isDeleted: false } },
      ownershipProfile: true,
    },
  });

  let updated = 0;

  for (const property of properties) {
    const config = getPropertyPmsFormConfig(property.country, property.specificationType);
    const completeness = computeOperationalCompleteness(config, {
      complianceRecords: property.complianceRecords,
      insurancePolicies: property.insurancePolicies,
      utilityAccounts: property.utilityAccounts,
      ownershipProfile: property.ownershipProfile as Record<string, unknown> | null,
    });

    if (property.operationalProfileComplete !== completeness.complete) {
      console.log(
        `${dryRun ? '[dry-run] ' : ''}${property.name}: ${property.operationalProfileComplete} → ${completeness.complete} (${completeness.score}%)`
      );
      if (!dryRun) {
        await prismaClient.properties.update({
          where: { id: property.id },
          data: {
            operationalProfileComplete: completeness.complete,
            operationalProfileCompletedAt: completeness.complete ? new Date() : null,
          },
        });
      }
      updated += 1;
    }
  }

  console.log(`\n${dryRun ? 'Would update' : 'Updated'} ${updated} / ${properties.length} properties`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prismaClient.$disconnect();
  });
