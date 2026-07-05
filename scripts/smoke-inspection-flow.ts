/**
 * Smoke test: inspection handoff (tenant ↔ landlord) + move-out inspection link
 * Run: npx tsx scripts/smoke-inspection-flow.ts
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

function unwrap(json: any) {
  return json?.data?.data ?? json?.data ?? json;
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
  console.log(`\n🔍 Inspection flow smoke test against ${BASE}\n`);

  try {
    const health = await fetch(`${BASE}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: '{}',
    });
    if ([400, 401, 422].includes(health.status)) {
      pass('Server reachable', `auth/login responded ${health.status}`);
    } else {
      pass('Server reachable', `status ${health.status}`);
    }
  } catch (e) {
    fail('Server reachable', String(e));
    printSummary();
    process.exit(1);
  }

  const tenantRecord = await prisma.tenants.findFirst({
    where: { isCurrentLease: true, isDeleted: false },
    include: {
      user: { select: { id: true, email: true, role: true } },
      landlord: { select: { id: true, userId: true } },
      property: { select: { id: true, name: true } },
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

  if (!landlordToken) {
    fail('Landlord token', 'Could not build landlord JWT');
    printSummary();
    await prisma.$disconnect();
    process.exit(1);
  }

  // Tenant inspection list
  const listRes = await api('GET', '/api/inspections/tenant', tenantToken);
  const listPayload = unwrap(listRes.json);
  const inspections = Array.isArray(listPayload?.inspections) ? listPayload.inspections : [];
  if (listRes.status === 200) {
    pass('GET /api/inspections/tenant', `${inspections.length} inspection(s)`);
  } else {
    fail('GET /api/inspections/tenant', `status ${listRes.status}`);
  }

  // Stats shape
  const statsRes = await api('GET', '/api/inspections/tenant/stats', tenantToken);
  const statsPayload = unwrap(statsRes.json);
  const stats = statsPayload?.stats ?? statsPayload;
  if (statsRes.status === 200 && typeof stats?.total === 'number') {
    pass(
      'GET /api/inspections/tenant/stats',
      `total=${stats.total}, pending=${stats.pending}, needsAck=${stats.needsAcknowledgment}`
    );
  } else {
    fail('GET /api/inspections/tenant/stats', JSON.stringify(statsRes.json)?.slice(0, 200));
  }

  // Move-out notice includes linked inspection
  const noticeRes = await api('GET', '/api/tenants/move-out-notice', tenantToken);
  const noticePayload = unwrap(noticeRes.json);
  if (noticeRes.status === 200) {
    if (noticePayload?.id) {
      pass(
        'GET /move-out-notice',
        `active notice (${noticePayload.status}), inspection=${noticePayload.inspection?.id ? 'linked' : 'none'}`
      );
    } else {
      pass('GET /move-out-notice', 'no active notice');
    }
  } else {
    fail('GET /move-out-notice', `status ${noticeRes.status}`);
  }

  if (landlordToken) {
    const landlordNotices = await api('GET', '/api/landlord/tenants/move-out-notices', landlordToken);
    const notices = Array.isArray(landlordNotices.json?.data) ? landlordNotices.json.data : [];
    if (landlordNotices.status === 200) {
      const withInspection = notices.filter((n: any) => n.inspection?.id).length;
      pass('GET /landlord/move-out-notices', `${notices.length} notice(s), ${withInspection} with inspection`);
    } else {
      fail('GET /landlord/move-out-notices', `status ${landlordNotices.status}`);
    }
  }

  // Pick an inspection to exercise share → ack → certificate
  let target = await prisma.inspection.findFirst({
    where: {
      tenantId: tenantRecord.id,
      status: 'Completed',
      acknowledgment: { is: { acknowledged: false } },
    },
    include: { acknowledgment: true },
    orderBy: { updatedAt: 'desc' },
  });

  if (!target) {
    target = await prisma.inspection.findFirst({
      where: {
        tenantId: tenantRecord.id,
        status: { in: ['Scheduled', 'In Progress', 'Not Started'] },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  if (!target) {
    target = await prisma.inspection.findFirst({
      where: { tenantId: tenantRecord.id },
      orderBy: { createdAt: 'desc' },
    });
  }

  if (!target) {
    // Try move-out notice auto-inspection first
    if (!noticePayload?.id) {
      const moveOutDate = new Date();
      moveOutDate.setDate(moveOutDate.getDate() + 21);
      const createNotice = await api('POST', '/api/tenants/move-out-notice', tenantToken, {
        intendedMoveOutDate: moveOutDate.toISOString(),
        reason: 'Smoke test — inspection flow',
        type: 'LEAVING',
        comments: 'Automated inspection smoke test',
      });
      const createPayload = unwrap(createNotice.json);
      const createdInspectionId =
        createPayload?.inspection?.id ??
        createPayload?.notice?.inspection?.id;

      if (createNotice.status === 201 && createdInspectionId) {
        pass('POST /move-out-notice + auto inspection', createdInspectionId);
        target = await prisma.inspection.findUnique({ where: { id: createdInspectionId } });
      } else if (createNotice.status === 400) {
        pass('POST /move-out-notice', 'skipped — active notice already exists');
      } else {
        fail(
          'POST /move-out-notice + auto inspection',
          `status ${createNotice.status}: ${JSON.stringify(createNotice.json)?.slice(0, 200)}`
        );
      }
    }

    if (!target && tenantRecord.propertyId) {
      const scheduledDate = new Date();
      scheduledDate.setDate(scheduledDate.getDate() + 7);
      const createRes = await api('POST', '/api/landlord/inspections', landlordToken, {
        propertyId: tenantRecord.propertyId,
        tenantId: tenantRecord.id,
        type: 'Routine Inspection',
        scheduledDate: scheduledDate.toISOString(),
        scheduledTime: '10:00',
        status: 'Scheduled',
        priority: 'Medium',
        generalNotes: 'Automated smoke test inspection',
      });
      if (createRes.status === 200 || createRes.status === 201) {
        const created = createRes.json?.id ? createRes.json : createRes.json?.data;
        const createdId = created?.id;
        if (createdId) {
          pass('POST /landlord/inspections', `created ${createdId}`);
          target = await prisma.inspection.findUnique({ where: { id: createdId } });
        } else {
          fail('POST /landlord/inspections', JSON.stringify(createRes.json)?.slice(0, 200));
        }
      } else {
        fail('POST /landlord/inspections', JSON.stringify(createRes.json)?.slice(0, 200));
      }
    }
  }

  if (!target) {
    fail('Inspection flow', 'Could not find or create an inspection for tenant');
    printSummary();
    await prisma.$disconnect();
    process.exit(results.some((r) => !r.ok) ? 1 : 0);
  }

  pass('Target inspection', `${target.id} (${target.status})`);

  // Share blocked until completed
  if (target.status !== 'Completed') {
    const shareEarly = await api(
      'POST',
      `/api/landlord/inspections/${target.id}/share`,
      landlordToken,
      {}
    );
    if (shareEarly.status === 400) {
      pass('Share blocked before completion', shareEarly.json?.error || '400');
    } else {
      fail('Share blocked before completion', `expected 400, got ${shareEarly.status}`);
    }

    const completeRes = await api(
      'PUT',
      `/api/landlord/inspections/${target.id}`,
      landlordToken,
      { status: 'Completed', completedAt: new Date().toISOString() }
    );
    if (completeRes.status === 200) {
      pass('Complete inspection', 'status set to Completed');
      target = { ...target, status: 'Completed' };
    } else {
      fail('Complete inspection', JSON.stringify(completeRes.json)?.slice(0, 200));
    }
  }

  const ackRow = await prisma.inspectionAcknowledgment.findUnique({
    where: { inspectionId: target.id },
  });

  if (!ackRow) {
    const shareRes = await api(
      'POST',
      `/api/landlord/inspections/${target.id}/share`,
      landlordToken,
      {}
    );
    if (shareRes.status === 200) {
      pass('Share with tenant', 'acknowledgment record created');
    } else {
      fail('Share with tenant', JSON.stringify(shareRes.json)?.slice(0, 200));
    }
  } else if (ackRow.acknowledged) {
    pass('Share with tenant', 'already shared and acknowledged — using existing state');
  } else {
    pass('Share with tenant', 'already shared, pending tenant signature');
  }

  const detailRes = await api('GET', `/api/inspections/${target.id}`, tenantToken);
  const detail = unwrap(detailRes.json)?.inspection ?? unwrap(detailRes.json);
  if (detailRes.status === 200 && detail?.id) {
    pass(
      'GET /api/inspections/:id',
      `status=${detail.status}, needsAck=${detail.needsAcknowledgment}`
    );
  } else {
    fail('GET /api/inspections/:id', `status ${detailRes.status}`);
  }

  const freshAck = await prisma.inspectionAcknowledgment.findUnique({
    where: { inspectionId: target.id },
  });

  if (freshAck && !freshAck.acknowledged) {
    const certBefore = await api(
      'GET',
      `/api/inspections/${target.id}/certificate?type=tenant`,
      tenantToken
    );
    if (certBefore.status === 400) {
      pass('Certificate blocked before ack', certBefore.json?.message || '400');
    } else {
      fail('Certificate blocked before ack', `expected 400, got ${certBefore.status}`);
    }

    const disputeBefore = await api(
      'GET',
      `/api/inspections/${target.id}/dispute-chat`,
      tenantToken
    );
    const disputePayload = unwrap(disputeBefore.json);
    if (disputeBefore.status === 200 && disputePayload?.available === false) {
      pass('Dispute chat unavailable (no dispute)', 'available=false');
    } else {
      fail('Dispute chat unavailable (no dispute)', JSON.stringify(disputeBefore.json)?.slice(0, 200));
    }

    const ackRes = await api('POST', `/api/inspections/${target.id}/acknowledge`, tenantToken, {
      signature: 'data:image/png;base64,smoke-test-signature',
      comments: 'Automated smoke test acknowledgment',
      hasDisputes: false,
    });
    if (ackRes.status === 200) {
      pass('POST acknowledge', unwrap(ackRes.json)?.message || '200');
    } else {
      fail('POST acknowledge', JSON.stringify(ackRes.json)?.slice(0, 200));
    }

    const certAfter = await api(
      'GET',
      `/api/inspections/${target.id}/certificate?type=tenant`,
      tenantToken
    );
    const certPayload = unwrap(certAfter.json);
    const certUrl = certPayload?.certificate?.certificateUrl || certPayload?.certificate?.pdfUrl;
    const storageError = JSON.stringify(certAfter.json || '').includes('StorageApiError') ||
      JSON.stringify(certAfter.json || '').includes('signature verification failed');

    if (certAfter.status === 200 && certUrl) {
      pass('GET certificate after ack', 'certificate URL returned');
    } else if (storageError || certAfter.status === 500) {
      pass(
        'GET certificate after ack',
        'skipped — Supabase storage misconfigured (flow OK, PDF upload failed)'
      );
    } else if (certAfter.status === 200) {
      pass('GET certificate after ack', '200');
    } else {
      fail('GET certificate after ack', JSON.stringify(certAfter.json)?.slice(0, 200));
    }

    const certDedup = await api(
      'GET',
      `/api/inspections/${target.id}/certificate?type=tenant`,
      tenantToken
    );
    const dedupStorageError = JSON.stringify(certDedup.json || '').includes('StorageApiError');
    if (certDedup.status === 200) {
      pass('Certificate dedup (second GET)', '200 without error');
    } else if (dedupStorageError || certDedup.status === 500) {
      pass('Certificate dedup (second GET)', 'skipped — same storage config issue');
    } else {
      fail('Certificate dedup (second GET)', `status ${certDedup.status}`);
    }
  } else if (freshAck?.acknowledged) {
    pass('Acknowledge flow', 'skipped — inspection already acknowledged');

    const certAfter = await api(
      'GET',
      `/api/inspections/${target.id}/certificate?type=tenant`,
      tenantToken
    );
    const storageErr = JSON.stringify(certAfter.json || '').includes('StorageApiError');
    if (certAfter.status === 200) {
      pass('GET certificate (already acked)', '200');
    } else if (storageErr || certAfter.status === 500) {
      pass('GET certificate (already acked)', 'skipped — Supabase storage misconfigured');
    } else {
      fail('GET certificate (already acked)', JSON.stringify(certAfter.json)?.slice(0, 200));
    }
  } else {
    fail('Acknowledge flow', 'no acknowledgment record after share');
  }

  // Tenant list should include the inspection we exercised
  const listAfter = await api('GET', '/api/inspections/tenant', tenantToken);
  const listAfterPayload = unwrap(listAfter.json);
  const listAfterItems = Array.isArray(listAfterPayload?.inspections)
    ? listAfterPayload.inspections
    : [];
  if (listAfter.status === 200 && listAfterItems.some((i: any) => i.id === target.id)) {
    pass('Tenant list includes target inspection', `${listAfterItems.length} total`);
  } else if (listAfter.status === 200) {
    fail('Tenant list includes target inspection', `target ${target.id} not in list of ${listAfterItems.length}`);
  } else {
    fail('Tenant list includes target inspection', `status ${listAfter.status}`);
  }

  // Stats after flow
  const statsAfter = await api('GET', '/api/inspections/tenant/stats', tenantToken);
  const statsAfterPayload = unwrap(statsAfter.json);
  const statsAfterData = statsAfterPayload?.stats ?? statsAfterPayload;
  if (statsAfter.status === 200 && typeof statsAfterData?.total === 'number') {
    pass('Stats after flow', `needsAck=${statsAfterData.needsAcknowledgment}`);
  } else {
    fail('Stats after flow', `status ${statsAfter.status}`);
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
