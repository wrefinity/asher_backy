/**
 * Test: tenant relocates to Bradford → Laex Brown landlord sees them on /currents
 */
import jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';

const BASE = process.env.SMOKE_BASE_URL || 'http://localhost:9000';
const JWT_SECRET = process.env.JWT_SECRET || 'techkyashermatic';
const BRADFORD_LANDLORD_ID = 'cmpvs5yk30007uxfv4864f2fs';
const BRADFORD_LANDLORD_EMAIL = 'lxbrw23@gamil.com';

const prisma = new PrismaClient();

function makeToken(payload: Record<string, unknown>) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '1h' });
}

async function api(method: string, path: string, token: string, body?: unknown) {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  return { status: res.status, json: await res.json() };
}

async function main() {
  console.log('\n🏠 Bradford landlord match test\n');
  console.log(`Bradford landlord: ${BRADFORD_LANDLORD_EMAIL} (${BRADFORD_LANDLORD_ID})\n`);

  // Use tenant NOT on Laex Brown's portfolio
  const tenant = await prisma.tenants.findFirst({
    where: {
      isCurrentLease: true,
      isDeleted: false,
      landlordId: { not: BRADFORD_LANDLORD_ID },
      user: { email: 'john.smith.tenant@example.com' },
    },
    include: {
      user: true,
      landlord: { include: { user: { select: { email: true } } } },
    },
  });

  if (!tenant?.user) {
    console.error('❌ Test tenant john.smith.tenant@example.com not found');
    process.exit(1);
  }

  console.log(`Relocating tenant: ${tenant.user.email}`);
  console.log(`Current landlord: ${tenant.landlord?.user?.email}\n`);

  const tenantToken = makeToken({
    id: tenant.user.id,
    email: tenant.user.email,
    role: [tenant.user.role],
    tenantId: tenant.id,
    tenant: { id: tenant.id },
    tenantCode: tenant.tenantCode,
  });

  const bradfordLandlord = await prisma.landlords.findUnique({
    where: { id: BRADFORD_LANDLORD_ID },
    include: { user: true },
  });

  if (!bradfordLandlord?.user) {
    console.error('❌ Bradford landlord not found');
    process.exit(1);
  }

  const landlordToken = makeToken({
    id: bradfordLandlord.user.id,
    email: bradfordLandlord.user.email,
    role: [bradfordLandlord.user.role],
    landlords: { id: bradfordLandlord.id },
  });

  // Check eligibility
  const elig = await api('GET', '/api/tenants/relocation/eligibility', tenantToken);
  const displayScore = elig.json?.data?.data?.displayScore;
  const premium = elig.json?.data?.data?.premiumEligible;
  console.log(`Tenant score: ${displayScore}, premium: ${premium}`);

  if (!premium) {
    console.log('⚠️  Tenant below 850 — post-interest will fail. Trying anyway for visibility...\n');
  }

  const moveOut = new Date();
  moveOut.setDate(moveOut.getDate() + 30);

  // Search Bradford — no moveInDate (null availableTo bug)
  const post = await api('POST', '/api/tenants/relocation/post-interest', tenantToken, {
    criteria: {
      propertyCategory: 'RESIDENTIAL',
      location: 'Bradford',
      minRent: 0,
      maxRent: 999999,
    },
    intendedMoveOutDate: moveOut.toISOString(),
    reason: 'Relocating to Bradford',
    comments: 'Bradford landlord visibility test',
  });

  console.log(`\nPOST post-interest: HTTP ${post.status}`);
  const result = post.json?.data?.data;
  if (post.status !== 201) {
    console.log(JSON.stringify(post.json, null, 2));
    process.exit(1);
  }

  console.log(`matchCount: ${result?.matchCount}, newMatches: ${result?.newMatches}`);
  const matchedBradford = (result?.enquiries ?? []).find(
    (e: { landlordId: string }) => e.landlordId === BRADFORD_LANDLORD_ID
  );

  if (matchedBradford) {
    console.log(`✅ Matched Bradford landlord — enquiry ${matchedBradford.enquiryId}`);
  } else {
    console.log('❌ Bradford landlord NOT in match results');
    console.log('Enquiries:', JSON.stringify(result?.enquiries, null, 2));
  }

  // Bradford landlord checks /currents
  const currents = await api('GET', '/api/landlord/tenants/currents', landlordToken);
  const tenants = currents.json?.currentTenants ?? [];
  const found = tenants.find((t: { id: string }) => t.id === tenant.id);

  console.log(`\nBradford landlord /currents: ${tenants.length} tenant(s)`);
  if (found) {
    console.log('✅ Bradford landlord CAN see relocating tenant');
    console.log(`   Email: ${found.user?.email}`);
    console.log(`   referenceMode: ${found.referenceMode}`);
    console.log(`   Asher score: ${found.asherReference?.displayScore ?? (found.performanceScore?.overallScore ? Math.round(found.performanceScore.overallScore * 10) : 'n/a')}`);
    if (found.PropertyEnquiry?.length) {
      const last = found.PropertyEnquiry[found.PropertyEnquiry.length - 1];
      console.log(`   Enquiry message: ${last.message?.slice(0, 80)}...`);
      console.log(`   Listing city: ${last.listing?.property?.city ?? 'n/a'}`);
    }
  } else {
    console.log('❌ Bradford landlord does NOT see tenant on Existing Tenants');
    for (const t of tenants) {
      console.log(`   - ${t.user?.email}`);
    }
  }

  await prisma.$disconnect();
  process.exit(found && matchedBradford ? 0 : 1);
}

main().catch(async (e) => {
  console.error(e);
  await prisma.$disconnect();
  process.exit(1);
});
