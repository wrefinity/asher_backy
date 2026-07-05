/**
 * Smoke test: tenant ad create flow (NG + UK payload normalization + POST /api/ads)
 * Run: npx tsx scripts/smoke-ads-create.ts
 */
import jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';
import { adSchema } from '../src/tenant/schema/adShema';
import { normalizeAdCreatePayload } from '../src/tenant/utils/normalizeAdPayload';

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
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '1h' });
}

function validateNormalizedPayload(label: string, body: Record<string, unknown>) {
  const normalized = normalizeAdCreatePayload(body);
  const { error, value } = adSchema.validate(normalized);
  if (error) {
    fail(label, error.details.map((d) => d.message).join('; '));
    return null;
  }
  pass(label, `currency=${value.currency}, locations=${value.locations.join('|')}, listed=${value.isListed}`);
  return value;
}

function buildTenantFormBody(params: {
  currency: 'NGN' | 'GBP';
  marketCountry: string;
  state: string;
  city: string;
  amountPaid: number;
}) {
  const startedDate = new Date();
  const endDate = new Date(startedDate.getTime() + 3 * 24 * 60 * 60 * 1000);

  return {
    title: `Smoke Ad ${params.currency} ${Date.now()}`,
    description: 'Automated smoke test ad — safe to delete.',
    currency: params.currency,
    amountPaid: String(params.amountPaid),
    price: String(params.amountPaid),
    duration: '3',
    radius: '10',
    isPremiumBanner: 'false',
    locationMode: 'city',
    state: params.state,
    city: params.city,
    marketCountry: params.marketCountry,
    startedDate: startedDate.toISOString(),
    endDate: endDate.toISOString(),
    isListed: 'true',
    phoneNumber: '+440000000000',
    email: 'smoke-ad@example.com',
    address: '1 Smoke Test Street',
    bussinessDetails: JSON.stringify({
      bussinessName: 'Smoke Test',
      bussinessDescription: 'Automated smoke test ad',
      phoneNumber: '+440000000000',
      email: 'smoke-ad@example.com',
      marketCountry: params.marketCountry,
      locationMode: 'city',
      duration: 3,
      radius: 10,
      isPremiumBanner: false,
    }),
  };
}

async function postAd(token: string, body: Record<string, string>) {
  const form = new FormData();
  for (const [key, value] of Object.entries(body)) {
    form.append(key, value);
  }

  const res = await fetch(`${BASE}/api/ads`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: form,
  });

  let json: any = null;
  try {
    json = await res.json();
  } catch {
    json = null;
  }

  return { status: res.status, json };
}

async function ensureWalletBalance(userId: string, currency: 'NGN' | 'GBP', minimum: number) {
  let wallet = await prisma.wallet.findFirst({
    where: { userId, currency },
  });

  if (!wallet) {
    wallet = await prisma.wallet.create({
      data: {
        userId,
        currency,
        balance: minimum,
      },
    });
    return wallet;
  }

  if (Number(wallet.balance) < minimum) {
    wallet = await prisma.wallet.update({
      where: { id: wallet.id },
      data: { balance: minimum },
    });
  }

  return wallet;
}

function printSummary() {
  const failed = results.filter((r) => !r.ok);
  console.log('\n--- Summary ---');
  console.log(`${results.length - failed.length}/${results.length} passed`);
  if (failed.length) {
    console.log('Failed:');
    for (const item of failed) {
      console.log(`  - ${item.name}: ${item.detail}`);
    }
  }
}

async function main() {
  console.log(`\n📣 Ads create smoke test against ${BASE}\n`);

  try {
    const health = await fetch(`${BASE}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: '{}',
    });
    pass('Server reachable', `auth/login responded ${health.status}`);
  } catch (error) {
    fail('Server reachable', String(error));
    printSummary();
    process.exit(1);
  }

  validateNormalizedPayload(
    'Normalize + validate NGN payload',
    buildTenantFormBody({
      currency: 'NGN',
      marketCountry: 'Nigeria',
      state: 'Lagos',
      city: 'Ikeja',
      amountPaid: 5000,
    })
  );

  validateNormalizedPayload(
    'Normalize + validate GBP payload',
    buildTenantFormBody({
      currency: 'GBP',
      marketCountry: 'United Kingdom',
      state: 'Greater London',
      city: 'London',
      amountPaid: 5,
    })
  );

  const tenantRecord = await prisma.tenants.findFirst({
    where: { isCurrentLease: true, isDeleted: false },
    include: {
      user: { select: { id: true, email: true, role: true } },
      property: { select: { country: true, city: true, state: true } },
    },
    orderBy: { updatedAt: 'desc' },
  });

  if (!tenantRecord?.user) {
    fail('Test tenant', 'No current tenant found in DB');
    printSummary();
    await prisma.$disconnect();
    process.exit(1);
  }

  pass('Test tenant', tenantRecord.user.email);

  const propertyCountry = tenantRecord.property?.country || 'Nigeria';
  const isUk = /united kingdom|uk|england|scotland|wales|gb/i.test(propertyCountry);
  const currency = isUk ? 'GBP' : 'NGN';
  const amountPaid = isUk ? 5 : 5000;
  const state = isUk ? 'Greater London' : 'Lagos';
  const city = isUk ? 'London' : 'Ikeja';
  const marketCountry = isUk ? 'United Kingdom' : 'Nigeria';

  await ensureWalletBalance(tenantRecord.user.id, currency, amountPaid * 2);

  const token = tokenForUser({
    id: tenantRecord.user.id,
    email: tenantRecord.user.email,
    role: tenantRecord.user.role,
    tenant: { id: tenantRecord.id, tenantCode: tenantRecord.tenantCode },
  });

  const createBody = buildTenantFormBody({
    currency,
    marketCountry,
    state,
    city,
    amountPaid,
  });

  const createRes = await postAd(token, createBody as Record<string, string>);
  const created = unwrap(createRes.json);

  if (createRes.status === 201 && created?.id) {
    pass('POST /api/ads', `created ${created.id}, listed=${created.isListed}`);
  } else {
    const errors = createRes.json?.data?.errors || createRes.json?.errors || createRes.json?.message;
    fail('POST /api/ads', `status ${createRes.status} ${JSON.stringify(errors)?.slice(0, 300)}`);
    printSummary();
    await prisma.$disconnect();
    process.exit(1);
  }

  const listRes = await fetch(`${BASE}/api/ads/user/${tenantRecord.user.id}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const listJson = await listRes.json();
  const myAds = unwrap(listJson);
  const found = Array.isArray(myAds) && myAds.some((ad: any) => ad.id === created.id);

  if (listRes.status === 200 && found) {
    pass('GET /api/ads/user/:userId', 'created ad appears in My Ads');
  } else {
    fail('GET /api/ads/user/:userId', `status ${listRes.status}, found=${found}`);
  }

  const listedRes = await fetch(
    `${BASE}/api/ads/listed?city=${encodeURIComponent(city)}&state=${encodeURIComponent(state)}`,
    { headers: { Authorization: `Bearer ${token}` } }
  );
  const listedJson = await listedRes.json();
  const listedAds = unwrap(listedJson);
  const visible = Array.isArray(listedAds) && listedAds.some((ad: any) => ad.id === created.id);

  if (listedRes.status === 200 && visible) {
    pass('GET /api/ads/listed', 'created ad visible in browse feed');
  } else {
    fail(
      'GET /api/ads/listed',
      `status ${listedRes.status}, visible=${visible}, count=${Array.isArray(listedAds) ? listedAds.length : 0}`
    );
  }

  await prisma.ads.delete({ where: { id: created.id } }).catch(() => undefined);
  pass('Cleanup', `deleted smoke ad ${created.id}`);

  printSummary();
  await prisma.$disconnect();
  process.exit(results.some((r) => !r.ok) ? 1 : 0);
}

main().catch(async (error) => {
  console.error(error);
  await prisma.$disconnect();
  process.exit(1);
});
