/**
 * Verifies dashboard breakdown counts match per-property tenant categorization.
 * Run: npx tsx scripts/validate-tenant-lease-categorization.ts
 */
import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';
import { countTenantsByLeaseBucket } from '../src/utils/categorizeTenantLeaseStatus';
import { groupTenantsByLeaseBucket } from '../src/utils/categorizeTenantLeaseStatus';

dotenv.config();
const prisma = new PrismaClient();

async function main() {
  const landlord = await prisma.landlords.findFirst({
    where: { isDeleted: false, user: { email: 'lxbrw23@gamil.com' } },
  });
  if (!landlord) {
    console.log('Skip: test landlord not found');
    return;
  }

  const allTenants = await prisma.tenants.findMany({
    where: { landlordId: landlord.id },
    select: {
      propertyId: true,
      isCurrentLease: true,
      leaseStartDate: true,
      leaseEndDate: true,
    },
  });

  const dashboard = countTenantsByLeaseBucket(allTenants);

  const properties = [...new Set(allTenants.map(t => t.propertyId))];
  let sumCurrent = 0;
  let sumPrevious = 0;
  let sumFuture = 0;

  for (const propertyId of properties) {
    const propertyTenants = allTenants.filter(t => t.propertyId === propertyId);
    const grouped = groupTenantsByLeaseBucket(propertyTenants);
    sumCurrent += grouped.current.length;
    sumPrevious += grouped.previous.length;
    sumFuture += grouped.future.length;
  }

  const ok =
    dashboard.current === sumCurrent &&
    dashboard.past === sumPrevious &&
    dashboard.future === sumFuture;

  console.log('Dashboard:', dashboard);
  console.log('Sum of property buckets:', {
    current: sumCurrent,
    previous: sumPrevious,
    future: sumFuture,
  });
  console.log(ok ? '✅ Counts align' : '❌ Mismatch');
  if (!ok) process.exit(1);
}

main().finally(() => prisma.$disconnect());
