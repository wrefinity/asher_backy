/**
 * Post-interest with broad criteria to exercise match + enquiry creation
 */
import jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';

const BASE = process.env.SMOKE_BASE_URL || 'http://localhost:9000';
const JWT_SECRET = process.env.JWT_SECRET || 'techkyashermatic';
const prisma = new PrismaClient();

function makeToken(userId: string, email: string, role: string, tenantId: string, tenantCode?: string | null) {
  return jwt.sign(
    { id: userId, email, role: [role], tenantId, tenant: { id: tenantId }, tenantCode },
    JWT_SECRET,
    { expiresIn: '1h' }
  );
}

async function main() {
  const tenant = await prisma.tenants.findFirst({
    where: { isCurrentLease: true, isDeleted: false },
    include: { user: true, landlord: true },
    orderBy: { updatedAt: 'desc' },
  });
  if (!tenant?.user) throw new Error('No tenant found');

  const token = makeToken(tenant.user.id, tenant.user.email, tenant.user.role, tenant.id, tenant.tenantCode);
  const moveOut = new Date();
  moveOut.setDate(moveOut.getDate() + 45);
  const moveIn = new Date();
  moveIn.setDate(moveIn.getDate() + 60);

  const listingCount = await prisma.propertyListingHistory.count({
    where: { isActive: true, onListing: true },
  });
  console.log(`Active listings in DB: ${listingCount}`);
  console.log(`Test tenant: ${tenant.user.email} (landlordId=${tenant.landlordId})\n`);

  const criteria = {
    propertyCategory: 'RESIDENTIAL',
    bedrooms: 1,
    bathrooms: 1,
    minRent: 0,
    maxRent: 999999,
    moveInDate: moveIn.toISOString().slice(0, 10),
  };

  const res = await fetch(`${BASE}/api/tenants/relocation/post-interest`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      criteria,
      intendedMoveOutDate: moveOut.toISOString(),
      reason: 'Smoke test — broad search',
    }),
  });

  const json = await res.json();
  console.log('HTTP', res.status);
  console.log(JSON.stringify(json, null, 2));

  const result = json?.data?.data;
  if (result?.matchCount > 0) {
    console.log(`\n✅ ${result.matchCount} landlord(s) matched, ${result.newMatches ?? 0} new enquiry(ies)`);
    for (const e of result.enquiries ?? []) {
      console.log(`   → enquiry ${e.enquiryId} for landlord ${e.landlordId}`);
    }
  } else {
    console.log('\n⚠️  API succeeded but 0 matches — no active listings outside current landlord in DB');
  }

  await prisma.$disconnect();
}

main().catch(async (e) => {
  console.error(e);
  await prisma.$disconnect();
  process.exit(1);
});
