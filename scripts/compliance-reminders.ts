/**
 * Send in-app notifications for compliance certificates and insurance renewals
 * expiring within 90 days. Run via cron: npm run compliance:reminders
 */
import 'dotenv/config';
import { prismaClient } from '../src/db/prismaClient';
import PropertyOperationalService from '../src/services/propertyOperational.service';

async function main() {
  const sent = await PropertyOperationalService.runComplianceReminders(90);
  console.log(`Compliance reminders sent: ${sent}`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prismaClient.$disconnect();
  });
