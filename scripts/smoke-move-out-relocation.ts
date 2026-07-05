/**
 * Smoke test: move-out notice, relocation, Asher reference APIs
 * Run: npx tsx scripts/smoke-move-out-relocation.ts
 */
import jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';

const BASE = process.env.SMOKE_BASE_URL || 'http://localhost:9000';
const JWT_SECRET = process.env.JWT_SECRET || 'techkyashermatic';
const prisma = new PrismaClient();

type Result = { name: string; ok: boolean; detail: string };

const results: Result[] = [];

function pass(name: string, detail = 'OK') {
  results.push({ name, ok: true, detail });
  console.log(`✅ ${name}: ${detail}`);
}

function fail(name: string, detail: string) {
  results.push({ name, ok: false, detail });
  console.log(`❌ ${name}: ${detail}`);
}

function tokenForUser(user: {
  id: string;
  email: string;
  role: string | string[];
  tenant?: { id: string; tenantCode?: string | null };
  landlords?: { id: string } | null;
}) {
  const payload: Record<string, unknown> = {
    id: user.id,
    email: user.email,
    role: Array.isArray(user.role) ? user.role : String(user.role).split(','),
  };
  if (user.tenant) {
    payload.tenantId = user.tenant.id;
    payload.tenant = { id: user.tenant.id };
    if (user.tenant.tenantCode) payload.tenantCode = user.tenant.tenantCode;
  }
  if (user.landlords) {
    payload.landlords = { id: user.landlords.id };
  }
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '1h' });
}

async function api(
  method: string,
  path: string,
  token?: string,
  body?: unknown
): Promise<{ status: number; json: any }> {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  let json: any = null;
  try {
    json = await res.json();
  } catch {
    json = null;
  }
  return { status: res.status, json };
}

async function main() {
  console.log(`\n🔍 Smoke test against ${BASE}\n`);

  // 1. Server reachable
  try {
    const health = await fetch(`${BASE}/api/auth/login`, { method: 'POST', body: '{}' });
    if (health.status === 400 || health.status === 401 || health.status === 422) {
      pass('Server reachable', `auth/login responded ${health.status}`);
    } else {
      pass('Server reachable', `status ${health.status}`);
    }
  } catch (e) {
    fail('Server reachable', String(e));
    printSummary();
    process.exit(1);
  }

  // 2. DB models
  try {
    await prisma.moveOutNotice.findFirst({ take: 1 });
    await prisma.relocationInterest.findFirst({ take: 1 });
    pass('Prisma models', 'move_out_notice + relocation_interest query OK');
  } catch (e) {
    fail('Prisma models', String(e));
  }

  // 3. Find test tenant + landlord
  const tenantRecord = await prisma.tenants.findFirst({
    where: { isCurrentLease: true, isDeleted: false },
    include: {
      user: { select: { id: true, email: true, role: true } },
      landlord: { select: { id: true, userId: true } },
    },
    orderBy: { updatedAt: 'desc' },
  });

  if (!tenantRecord?.user) {
    fail('Test data', 'No current tenant found in DB');
    printSummary();
    await prisma.$disconnect();
    process.exit(1);
  }

  pass('Test tenant', `${tenantRecord.user.email} (${tenantRecord.id})`);

  const landlordUser = await prisma.users.findUnique({
    where: { id: tenantRecord.landlord.userId },
    include: { landlords: { select: { id: true } } },
  });

  const tenantToken = tokenForUser({
    id: tenantRecord.user.id,
    email: tenantRecord.user.email,
    role: tenantRecord.user.role,
    tenant: { id: tenantRecord.id, tenantCode: tenantRecord.tenantCode },
  });

  const landlordToken = landlordUser?.landlords
    ? tokenForUser({
        id: landlordUser.id,
        email: landlordUser.email,
        role: landlordUser.role,
        landlords: { id: landlordUser.landlords.id },
      })
    : null;

  // 4. Unauthenticated → 401
  const unauth = await api('GET', '/api/tenants/move-out-notice');
  if (unauth.status === 401) pass('Auth guard (tenant move-out)', '401 without token');
  else fail('Auth guard (tenant move-out)', `expected 401, got ${unauth.status}`);

  const unauthLandlord = await api('GET', '/api/landlord/tenants/move-out-notices');
  if (unauthLandlord.status === 401) pass('Auth guard (landlord notices)', '401 without token');
  else fail('Auth guard (landlord notices)', `expected 401, got ${unauthLandlord.status}`);

  // 5. Tenant relocation eligibility
  const elig = await api('GET', '/api/tenants/relocation/eligibility', tenantToken);
  if (elig.status === 200 && elig.json?.data?.data?.displayScore != null) {
    pass(
      'GET /relocation/eligibility',
      `score=${elig.json.data.data.displayScore}, premium=${elig.json.data.data.premiumEligible}`
    );
  } else {
    fail('GET /relocation/eligibility', JSON.stringify(elig.json)?.slice(0, 200));
  }

  // 6. Tenant get move-out notice
  const getNotice = await api('GET', '/api/tenants/move-out-notice', tenantToken);
  if (getNotice.status === 200) {
    pass('GET /move-out-notice', getNotice.json?.data?.data ? 'has active notice' : 'null (none pending)');
  } else {
    fail('GET /move-out-notice', `status ${getNotice.status}`);
  }

  // 7. Tenant get relocation interest
  const getInterest = await api('GET', '/api/tenants/relocation/interest', tenantToken);
  if (getInterest.status === 200) {
    pass('GET /relocation/interest', getInterest.json?.data?.data ? 'active interest' : 'null');
  } else {
    fail('GET /relocation/interest', `status ${getInterest.status}`);
  }

  // 8. Landlord move-out notices
  if (landlordToken) {
    const notices = await api('GET', '/api/landlord/tenants/move-out-notices', landlordToken);
    if (notices.status === 200 && Array.isArray(notices.json?.data)) {
      pass('GET /landlord/move-out-notices', `${notices.json.data.length} notice(s)`);
    } else {
      fail('GET /landlord/move-out-notices', JSON.stringify(notices.json)?.slice(0, 200));
    }

    const pendingCount = await api(
      'GET',
      '/api/landlord/tenants/move-out-notices/pending-count',
      landlordToken
    );
    if (pendingCount.status === 200 && pendingCount.json?.data?.count != null) {
      pass('GET /move-out-notices/pending-count', `count=${pendingCount.json.data.count}`);
    } else {
      fail('GET /move-out-notices/pending-count', JSON.stringify(pendingCount.json)?.slice(0, 200));
    }

    // 9. Asher reference
    const asherRef = await api(
      'GET',
      `/api/landlord/tenants/${tenantRecord.id}/asher-reference`,
      landlordToken
    );
    if (asherRef.status === 200 && asherRef.json?.referenceMode === 'ASHER_VOUCHED') {
      pass('GET /asher-reference', `score=${asherRef.json?.data?.displayScore}`);
    } else if (asherRef.status === 403) {
      pass('GET /asher-reference', '403 — tenant below 850 threshold (expected for some tenants)');
    } else {
      fail('GET /asher-reference', `status ${asherRef.status}: ${JSON.stringify(asherRef.json)?.slice(0, 150)}`);
    }

    // 10. Existing tenants with asherReference embed
    const currents = await api('GET', '/api/landlord/tenants/currents', landlordToken);
    if (currents.status === 200 && Array.isArray(currents.json?.currentTenants)) {
      const withRef = currents.json.currentTenants.filter(
        (t: any) => t.referenceMode === 'ASHER_VOUCHED'
      ).length;
      pass('GET /tenants/currents', `${currents.json.currentTenants.length} tenants, ${withRef} vouched`);
    } else {
      fail('GET /tenants/currents', `status ${currents.status}`);
    }
  } else {
    fail('Landlord token', 'Could not build landlord JWT');
  }

  // 11. POST move-out notice (LEAVING) then verify + cleanup
  const moveOutDate = new Date();
  moveOutDate.setDate(moveOutDate.getDate() + 30);
  const createNotice = await api('POST', '/api/tenants/move-out-notice', tenantToken, {
    intendedMoveOutDate: moveOutDate.toISOString(),
    reason: 'Smoke test — leaving',
    type: 'LEAVING',
    comments: 'Automated smoke test',
  });

  if (createNotice.status === 201 && createNotice.json?.data?.data?.id) {
    const noticeId = createNotice.json.data.data.id;
    pass('POST /move-out-notice', `created ${noticeId}`);

    const verify = await api('GET', '/api/tenants/move-out-notice', tenantToken);
    if (verify.status === 200 && verify.json?.data?.data?.id === noticeId) {
      pass('Verify tenant notice', 'GET returns created notice');
    } else {
      fail('Verify tenant notice', 'GET did not return created notice');
    }

    if (landlordToken) {
      const pendingAfter = await api(
        'GET',
        '/api/landlord/tenants/move-out-notices/pending-count',
        landlordToken
      );
      if ((pendingAfter.json?.data?.count ?? 0) >= 1) {
        pass('Landlord pending count after create', `count=${pendingAfter.json.data.count}`);
      } else {
        fail('Landlord pending count after create', 'expected >= 1');
      }

      const ack = await api(
        'POST',
        `/api/landlord/tenants/move-out-notices/${noticeId}/acknowledge`,
        landlordToken
      );
      if (ack.status === 200) {
        pass('POST acknowledge move-out', 'landlord acknowledged');
      } else {
        fail('POST acknowledge move-out', JSON.stringify(ack.json)?.slice(0, 200));
      }
    }
  } else if (createNotice.status === 400 && String(createNotice.json?.message || '').includes('pending')) {
    pass('POST /move-out-notice', 'skipped — tenant already has pending notice');
  } else {
    fail('POST /move-out-notice', `status ${createNotice.status}: ${JSON.stringify(createNotice.json)?.slice(0, 200)}`);
  }

  // 12. POST /relocation/post-interest (premium path — creates matches + enquiries)
  const moveOutForRelocate = new Date();
  moveOutForRelocate.setDate(moveOutForRelocate.getDate() + 45);
  const moveInForRelocate = new Date();
  moveInForRelocate.setDate(moveInForRelocate.getDate() + 60);

  const searchCriteria = {
    propertyCategory: 'RESIDENTIAL',
    propertyType: 'SINGLE_UNIT',
    location: 'London',
    bedrooms: 2,
    bathrooms: 1,
    minRent: 500,
    maxRent: 2000,
    moveInDate: moveInForRelocate.toISOString().slice(0, 10),
  };

  const postInterest = await api('POST', '/api/tenants/relocation/post-interest', tenantToken, {
    criteria: searchCriteria,
    intendedMoveOutDate: moveOutForRelocate.toISOString(),
    reason: 'Smoke test — premium relocation',
    comments: 'Automated post-interest smoke test',
  });

  if (postInterest.status === 201) {
    const result = postInterest.json?.data?.data;
    const matchCount = result?.matchCount ?? result?.interest?.matchCount;
    const newMatches = result?.newMatches ?? 0;
    const enquiryCount = Array.isArray(result?.enquiries) ? result.enquiries.length : 0;
    pass(
      'POST /relocation/post-interest',
      `matchCount=${matchCount}, newMatches=${newMatches}, enquiriesCreated=${enquiryCount}`
    );

    const interestAfter = await api('GET', '/api/tenants/relocation/interest', tenantToken);
    if (interestAfter.status === 200 && interestAfter.json?.data?.data?.id) {
      pass(
        'Verify relocation interest',
        `status=${interestAfter.json.data.data.status}, matchCount=${interestAfter.json.data.data.matchCount}`
      );
    } else {
      fail('Verify relocation interest', JSON.stringify(interestAfter.json)?.slice(0, 200));
    }

    const relocateNotice = await api('GET', '/api/tenants/move-out-notice', tenantToken);
    if (
      relocateNotice.status === 200 &&
      relocateNotice.json?.data?.data?.type === 'RELOCATING'
    ) {
      pass('Verify RELOCATING move-out notice', `id=${relocateNotice.json.data.data.id}`);
    } else if (relocateNotice.json?.data?.data === null) {
      // Notice may have been created but not pending if only RELOCATING was upserted
      pass('Verify RELOCATING move-out notice', 'no pending notice (may be acknowledged from prior test)');
    } else {
      fail('Verify RELOCATING move-out notice', JSON.stringify(relocateNotice.json)?.slice(0, 200));
    }

    if (landlordToken && enquiryCount > 0) {
      const matchedLandlordId = result.enquiries[0]?.landlordId;
      if (matchedLandlordId) {
        const matchedLandlordUser = await prisma.users.findFirst({
          where: { landlords: { id: matchedLandlordId } },
          include: { landlords: { select: { id: true } } },
        });
        if (matchedLandlordUser?.landlords) {
          const matchedLandlordToken = tokenForUser({
            id: matchedLandlordUser.id,
            email: matchedLandlordUser.email,
            role: matchedLandlordUser.role,
            landlords: { id: matchedLandlordUser.landlords.id },
          });
          const matchedCurrents = await api('GET', '/api/landlord/tenants/currents', matchedLandlordToken);
          const found = (matchedCurrents.json?.currentTenants ?? []).some(
            (t: any) => t.id === tenantRecord.id
          );
          if (found) {
            pass('Matched landlord /currents', 'tenant visible under Existing Tenants');
          } else {
            fail('Matched landlord /currents', 'tenant not found in matched landlord currents');
          }
        }
      }
    } else if (matchCount === 0) {
      pass('Matched landlord /currents', 'skipped — no listings matched search criteria');
    }
  } else if (postInterest.status === 403) {
    fail('POST /relocation/post-interest', `403 insufficient score: ${postInterest.json?.message}`);
  } else {
    fail(
      'POST /relocation/post-interest',
      `status ${postInterest.status}: ${JSON.stringify(postInterest.json)?.slice(0, 300)}`
    );
  }

  printSummary();
  await prisma.$disconnect();
  process.exit(results.some((r) => !r.ok) ? 1 : 0);
}

function printSummary() {
  const passed = results.filter((r) => r.ok).length;
  const failed = results.filter((r) => !r.ok).length;
  console.log(`\n${'─'.repeat(50)}`);
  console.log(`Results: ${passed} passed, ${failed} failed (${results.length} total)`);
  if (failed) {
    console.log('\nFailed:');
    results.filter((r) => !r.ok).forEach((r) => console.log(`  • ${r.name}: ${r.detail}`));
  }
}

main().catch(async (e) => {
  console.error(e);
  await prisma.$disconnect();
  process.exit(1);
});
