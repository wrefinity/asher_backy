/**
 * Smoke-check operational profile stack (no HTTP, no server bootstrap).
 * Run: cd AsherBE && npm run verify:operational-profile
 */
import 'dotenv/config';
import { prismaClient } from '../src/db/prismaClient';
import { isPmsOperationalProfileEnabled } from '../src/config/featureFlags';
import PropertyOperationalService from '../src/services/propertyOperational.service';
import {
  computeOperationalCompleteness,
  getPropertyPmsFormConfig,
} from '../src/utils/propertyPmsFormConfig';

async function main() {
  console.log(`PMS operational profile enabled: ${isPmsOperationalProfileEnabled()}`);

  const propertyCount = await prismaClient.properties.count({ where: { isDeleted: false } });
  console.log(`✅ properties readable — ${propertyCount} active`);

  const certCount = await prismaClient.propertyComplianceRecord.count({ where: { isDeleted: false } });
  const insuranceCount = await prismaClient.propertyInsurance.count({ where: { isDeleted: false } });
  console.log(`✅ operational tables — ${certCount} certs, ${insuranceCount} insurance policies`);

  const ukConfig = getPropertyPmsFormConfig('United Kingdom', 'RESIDENTIAL');
  const score = computeOperationalCompleteness(ukConfig, { complianceRecords: [] });
  console.log(`✅ config + completeness — UK residential baseline ${score.score}%`);

  const { certs, insurance } = await PropertyOperationalService.findExpiringRecords(90);
  console.log(`✅ findExpiringRecords — ${certs.length} certs, ${insurance.length} policies expiring`);

  console.log('\nOperational profile smoke check passed.');
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prismaClient.$disconnect();
  });
