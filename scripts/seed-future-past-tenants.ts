/**
 * Seeds 10 future + 10 past tenants (full application profile) across 5 properties.
 * Standalone — does not start the API server.
 *
 * Usage:
 *   cd AsherBE
 *   LANDLORD_EMAIL=your@landlord.com npx tsx scripts/seed-future-past-tenants.ts
 */
import {
  ApplicationStatus,
  PrismaClient,
  userRoles,
  type AnswersEnum,
} from '@prisma/client';
import { hashSync } from 'bcrypt';
import dotenv from 'dotenv';

dotenv.config();

const prisma = new PrismaClient();

const iso = (d: Date) => d.toISOString().slice(0, 10);
const toDate = (s: string) => new Date(s);

const addMonths = (d: Date, months: number) => {
  const next = new Date(d);
  next.setMonth(next.getMonth() + months);
  return next;
};

const addYears = (d: Date, years: number) => {
  const next = new Date(d);
  next.setFullYear(next.getFullYear() + years);
  return next;
};

async function generateUniqueTenantCode(landlordCode: string) {
  let tenantCode = '';
  for (let i = 0; i < 20; i++) {
    const suffix = Math.floor(Math.random() * 10000)
      .toString()
      .padStart(4, '0');
    tenantCode = `${landlordCode}-${suffix}`;
    const existing = await prisma.tenants.findUnique({ where: { tenantCode } });
    if (!existing) return tenantCode;
  }
  throw new Error('Could not generate unique tenant code');
}

type TenantSeedRow = {
  no: number;
  kind: 'future' | 'past';
  propertyId: string;
  landlordId: string;
  landlordCode: string;
  emailDomains: string | null;
  email: string;
  firstName: string;
  lastName: string;
  leaseStartDate: string;
  leaseEndDate: string;
  dateOfFirstRent: string;
  createdById: string;
};

async function createFullTenant(row: TenantSeedRow) {
  const password = hashSync('SeedTenant123!', 10);
  const userEmail = row.email.split('@')[0];
  const tenantWebUserEmail = row.emailDomains
    ? `${userEmail}${row.emailDomains}`
    : row.email;

  const user = await prisma.users.create({
    data: {
      email: row.email,
      password,
      isVerified: true,
      role: [userRoles.TENANT],
      profile: {
        create: {
          gender: row.no % 2 === 0 ? 'Female' : 'Male',
          phoneNumber: `+447700900${String(row.no).padStart(3, '0')}`,
          address: `${row.no} Seed Street`,
          dateOfBirth: toDate('1990-06-15'),
          fullname: `${row.lastName} ${row.firstName} ${row.kind === 'future' ? 'Future' : 'Past'}`.trim(),
          firstName: row.firstName,
          lastName: row.lastName,
          middleName: row.kind === 'future' ? 'Future' : 'Past',
          country: 'United Kingdom',
          city: 'London',
          state: 'England',
          zip: '100001',
          unit: `Flat ${row.no}`,
          timeZone: 'UTC',
          taxPayerId: `TP${row.no}${row.kind}`,
          taxType: 'Income',
          title: 'Mr',
          maritalStatus: 'Single',
        },
      },
    },
    include: { profile: true },
  });

  const personalDetails = await prisma.applicantPersonalDetails.create({
    data: {
      title: 'Mr',
      firstName: row.firstName,
      middleName: row.kind === 'future' ? 'Future' : 'Past',
      lastName: row.lastName,
      dob: toDate('1990-06-15'),
      email: row.email,
      phoneNumber: `+447700900${String(row.no).padStart(3, '0')}`,
      maritalStatus: 'Single',
      nationality: 'British',
      identificationType: 'Passport',
      identificationNo: `SEED${row.kind.toUpperCase()}${row.no}`,
      issuingAuthority: 'HM Passport Office',
      expiryDate: toDate('2032-12-31'),
      userId: user.id,
    },
  });

  await prisma.nextOfKin.create({
    data: {
      firstName: 'Alex',
      lastName: row.lastName,
      middleName: '',
      relationship: 'Sibling',
      email: `nok.${row.email}`,
      phoneNumber: `+447700700${String(row.no).padStart(3, '0')}`,
      applicantPersonalDetailsId: personalDetails.id,
      userId: user.id,
    },
  });

  const [guarantorInfo, employmentInfo, emergencyInfo, refereeInfo] =
    await Promise.all([
      prisma.guarantorInformation.create({
        data: {
          fullName: `Guarantor ${row.lastName}`,
          phoneNumber: `+447700800${String(row.no).padStart(3, '0')}`,
          email: `guarantor.${row.email}`,
          address: '10 Guarantor Lane, London',
          relationship: 'Friend',
          identificationType: 'Passport',
          identificationNo: `G${row.no}`,
          monthlyIncome: '5000',
          employerName: 'Seed Employers Ltd',
          userId: user.id,
        },
      }),
      prisma.employmentInformation.create({
        data: {
          employmentStatus: 'Employed',
          taxCredit: '0',
          zipCode: '100002',
          address: '20 Business Park',
          city: 'London',
          state: 'England',
          country: 'United Kingdom',
          startDate: toDate('2019-01-01'),
          monthlyOrAnualIncome: '4500',
          childBenefit: '0',
          childMaintenance: '0',
          disabilityBenefit: '0',
          housingBenefit: '0',
          others: '0',
          pension: '0',
          moreDetails: `Seed ${row.kind} tenant #${row.no}`,
          employerCompany: 'Seed Corp Ltd',
          employerEmail: `hr.${row.email}`,
          employerPhone: '+442012345678',
          positionTitle: 'Analyst',
          userId: user.id,
        },
      }),
      prisma.emergencyContact.create({
        data: {
          fullname: `${row.lastName} ${row.firstName}`,
          phoneNumber: `+447700600${String(row.no).padStart(3, '0')}`,
          email: row.email,
          address: `${row.no} Seed Street, London`,
          userId: user.id,
        },
      }),
      prisma.referees.create({
        data: {
          professionalReferenceName: 'David Jones',
          personalReferenceName: 'Alice Brown',
          personalEmail: `alice.${row.email}`,
          professionalEmail: `david.${row.email}`,
          personalPhoneNumber: '+441111222333',
          professionalPhoneNumber: '+444444555666',
          personalRelationship: 'Friend',
          professionalRelationship: 'Manager',
          userId: user.id,
        },
      }),
    ]);

  const application = await prisma.application.create({
    data: {
      status: ApplicationStatus.COMPLETED,
      userId: user.id,
      applicantPersonalDetailsId: personalDetails.id,
      emergencyContactId: emergencyInfo.id,
      employmentInformationId: employmentInfo.id,
      guarantorInformationId: guarantorInfo.id,
      refereeId: refereeInfo.id,
      createdById: row.createdById,
      propertiesId: row.propertyId,
    },
  });

  await prisma.applicationQuestions.create({
    data: {
      havePet: 'NO' as AnswersEnum,
      youSmoke: 'NO' as AnswersEnum,
      requireParking: 'YES' as AnswersEnum,
      haveOutstandingDebts: 'NO' as AnswersEnum,
      applicantId: application.id,
    },
  });

  const tenantCode = await generateUniqueTenantCode(row.landlordCode);

  const tenant = await prisma.tenants.create({
    data: {
      tenantCode,
      userId: user.id,
      landlordId: row.landlordId,
      propertyId: row.propertyId,
      applicationId: application.id,
      tenantWebUserEmail,
      initialDeposit: 1500 + row.no * 50,
      leaseStartDate: toDate(row.leaseStartDate),
      leaseEndDate: toDate(row.leaseEndDate),
      dateOfFirstRent: toDate(row.dateOfFirstRent),
      isCurrentLease: false,
      rentstatus: row.kind === 'past' ? 0 : 1,
      apartmentOrFlatNumber: row.no,
    },
  });

  return { user, tenant, application };
}

async function main() {
  const landlordEmail = process.env.LANDLORD_EMAIL?.trim().toLowerCase();
  const propertyIdsEnv = process.env.PROPERTY_IDS?.split(',').map(s => s.trim()).filter(Boolean);

  const landlord = landlordEmail
    ? await prisma.landlords.findFirst({
        where: { user: { email: landlordEmail }, isDeleted: false },
        include: { user: true },
      })
    : await prisma.landlords.findFirst({
        where: { isDeleted: false },
        include: { user: true },
        orderBy: { createdAt: 'asc' },
      });

  if (!landlord?.user) {
    throw new Error(
      landlordEmail
        ? `No landlord found for LANDLORD_EMAIL=${landlordEmail}`
        : 'No landlord found. Set LANDLORD_EMAIL in env.'
    );
  }

  let landlordCode = landlord.landlordCode;
  if (!landlordCode) {
    landlordCode = `LD${landlord.id.slice(-6).toUpperCase()}`;
    await prisma.landlords.update({
      where: { id: landlord.id },
      data: { landlordCode },
    });
    console.log(`Assigned landlordCode: ${landlordCode}`);
  }

  let properties = propertyIdsEnv?.length
    ? await prisma.properties.findMany({
        where: { id: { in: propertyIdsEnv }, landlordId: landlord.id },
        select: { id: true, name: true },
      })
    : await prisma.properties.findMany({
        where: { landlordId: landlord.id },
        take: 5,
        orderBy: { createdAt: 'asc' },
        select: { id: true, name: true },
      });

  if (properties.length < 5) {
    throw new Error(
      `Need at least 5 properties (found ${properties.length}).`
    );
  }
  properties = properties.slice(0, 5);

  const now = new Date();
  const runId = Date.now();

  console.log(`Landlord: ${landlord.user.email}`);
  properties.forEach((p, i) => console.log(`  ${i + 1}. ${p.name}`));

  const rows: TenantSeedRow[] = [];

  for (let i = 0; i < 10; i++) {
    const property = properties[i % 5];
    rows.push({
      no: i + 1,
      kind: 'past',
      propertyId: property.id,
      landlordId: landlord.id,
      landlordCode,
      emailDomains: landlord.emailDomains,
      email: `seed.past.${i + 1}.${runId}@asher-seed.test`,
      firstName: `Past${i + 1}`,
      lastName: 'Tenant',
      leaseStartDate: iso(addYears(now, -2)),
      leaseEndDate: iso(addMonths(now, -6)),
      dateOfFirstRent: iso(addYears(now, -2)),
      createdById: landlord.user.id,
    });
  }

  for (let i = 0; i < 10; i++) {
    const property = properties[i % 5];
    rows.push({
      no: i + 11,
      kind: 'future',
      propertyId: property.id,
      landlordId: landlord.id,
      landlordCode,
      emailDomains: landlord.emailDomains,
      email: `seed.future.${i + 1}.${runId}@asher-seed.test`,
      firstName: `Future${i + 1}`,
      lastName: 'Tenant',
      leaseStartDate: iso(addMonths(now, 3)),
      leaseEndDate: iso(addMonths(now, 15)),
      dateOfFirstRent: iso(addMonths(now, 3)),
      createdById: landlord.user.id,
    });
  }

  let created = 0;
  const errors: string[] = [];

  for (const row of rows) {
    try {
      const { tenant } = await createFullTenant(row);
      created += 1;
      console.log(
        `✅ ${row.kind} ${row.firstName} → ${tenant.tenantCode} (property ${row.propertyId.slice(0, 8)}…)`
      );
    } catch (err: any) {
      const msg = `${row.email}: ${err?.message || err}`;
      errors.push(msg);
      console.error(`❌ ${msg}`);
    }
  }

  const seedTenants = await prisma.tenants.findMany({
    where: {
      landlordId: landlord.id,
      user: { email: { contains: '@asher-seed.test' } },
    },
    select: { leaseStartDate: true, leaseEndDate: true },
  });

  const nowCheck = new Date();
  let future = 0;
  let past = 0;
  for (const t of seedTenants) {
    if (!t.leaseStartDate) continue;
    const start = new Date(t.leaseStartDate);
    const end = t.leaseEndDate ? new Date(t.leaseEndDate) : null;
    if (start > nowCheck) future += 1;
    else if (end && end < nowCheck) past += 1;
  }

  console.log('\n--- Summary ---');
  console.log(`Created: ${created}/${rows.length}`);
  console.log(`In DB (@asher-seed.test): ${seedTenants.length}`);
  console.log(`Classified future: ${future}, past: ${past}`);

  if (errors.length) process.exit(1);
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
