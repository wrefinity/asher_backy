import {
  ComplianceRecordStatus,
  Prisma,
} from '@prisma/client';
import { prismaClient } from '../db/prismaClient';
import { NotFoundError } from './error.service';
import {
  computeOperationalCompleteness,
  getPropertyPmsFormConfig,
} from '../utils/propertyPmsFormConfig';

const COMPLIANCE_REMINDER_CONCURRENCY = 5;

async function runWithConcurrency<T>(
  items: readonly T[],
  limit: number,
  worker: (item: T) => Promise<void>
): Promise<void> {
  let nextIndex = 0;
  const workerCount = Math.min(Math.max(1, limit), items.length);

  await Promise.all(
    Array.from({ length: workerCount }, async () => {
      while (nextIndex < items.length) {
        const item = items[nextIndex++];
        await worker(item);
      }
    })
  );
}

export type OperationalProfilePayload = {
  complianceRecords?: Array<{
    id?: string;
    certType: string;
    certificateNumber?: string | null;
    issueDate?: Date | string | null;
    expiryDate?: Date | string | null;
    status?: string;
    documentId?: string | null;
    notes?: string | null;
  }>;
  insurancePolicies?: Array<{
    id?: string;
    insuranceType: string;
    provider?: string | null;
    policyNumber?: string | null;
    coverAmount?: number | null;
    premium?: number | null;
    premiumFrequency?: string | null;
    renewalDate?: Date | string | null;
    startDate?: Date | string | null;
    documentId?: string | null;
    notes?: string | null;
  }>;
  utilityAccounts?: Array<{
    id?: string;
    utilityType: string;
    supplier?: string | null;
    accountNumber?: string | null;
    meterNumber?: string | null;
    paidBy?: string;
    annualEstimate?: number | null;
    notes?: string | null;
  }>;
  ownershipProfile?: {
    ownerEntityType?: string | null;
    ownerEntityName?: string | null;
    acquisitionDate?: Date | string | null;
    acquisitionCost?: number | null;
    mortgageLender?: string | null;
    mortgageAccountRef?: string | null;
    titleReference?: string | null;
    taxReference?: string | null;
    notes?: string | null;
  } | null;
};

const parseDate = (value?: Date | string | null): Date | null => {
  if (!value) return null;
  const d = value instanceof Date ? value : new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
};

const deriveComplianceStatus = (
  expiryDate: Date | null,
  explicit?: string
): ComplianceRecordStatus => {
  if (explicit && Object.values(ComplianceRecordStatus).includes(explicit as ComplianceRecordStatus)) {
    return explicit as ComplianceRecordStatus;
  }
  if (!expiryDate) return ComplianceRecordStatus.PENDING;
  const now = Date.now();
  const exp = expiryDate.getTime();
  if (exp < now) return ComplianceRecordStatus.EXPIRED;
  if (exp < now + 90 * 24 * 60 * 60 * 1000) return ComplianceRecordStatus.EXPIRING_SOON;
  return ComplianceRecordStatus.VALID;
};

const operationalInclude = {
  complianceRecords: { where: { isDeleted: false }, orderBy: { certType: 'asc' as const } },
  insurancePolicies: { where: { isDeleted: false }, orderBy: { renewalDate: 'asc' as const } },
  utilityAccounts: { where: { isDeleted: false }, orderBy: { utilityType: 'asc' as const } },
  ownershipProfile: true,
};

class PropertyOperationalService {
  async assertLandlordProperty(propertyId: string, landlordId: string) {
    let property = await prismaClient.properties.findFirst({
      where: { id: propertyId, landlordId, isDeleted: false },
      select: {
        id: true,
        country: true,
        specificationType: true,
        operationalProfileComplete: true,
        operationalProfileCompletedAt: true,
      },
    });

    if (!property) {
      property = await prismaClient.properties.findFirst({
        where: {
          landlordId,
          isDeleted: false,
          specification: {
            some: {
              isActive: true,
              OR: [
                { residential: { is: { id: propertyId } } },
                { commercial: { is: { id: propertyId } } },
                { shortlet: { is: { id: propertyId } } },
              ],
            },
          },
        },
        select: {
          id: true,
          country: true,
          specificationType: true,
          operationalProfileComplete: true,
          operationalProfileCompletedAt: true,
        },
      });
    }

    if (!property) throw new NotFoundError('Property not found');
    return property;
  }

  async getOperationalProfile(propertyId: string, landlordId: string) {
    const property = await this.assertLandlordProperty(propertyId, landlordId);
    const resolvedPropertyId = property.id;
    const data = await prismaClient.properties.findUnique({
      where: { id: resolvedPropertyId },
      select: {
        operationalProfileComplete: true,
        operationalProfileCompletedAt: true,
        country: true,
        specificationType: true,
        ...operationalInclude,
      },
    });

    const config = getPropertyPmsFormConfig(property.country, property.specificationType);
    const completeness = computeOperationalCompleteness(config, {
      complianceRecords: data?.complianceRecords,
      insurancePolicies: data?.insurancePolicies,
      utilityAccounts: data?.utilityAccounts,
      ownershipProfile: data?.ownershipProfile,
    });

    return {
      config,
      completeness,
      complianceRecords: data?.complianceRecords ?? [],
      insurancePolicies: data?.insurancePolicies ?? [],
      utilityAccounts: data?.utilityAccounts ?? [],
      ownershipProfile: data?.ownershipProfile ?? null,
      operationalProfileComplete: data?.operationalProfileComplete ?? false,
      operationalProfileCompletedAt: data?.operationalProfileCompletedAt ?? null,
    };
  }

  async upsertOperationalProfile(
    propertyId: string,
    landlordId: string,
    payload: OperationalProfilePayload
  ) {
    const property = await this.assertLandlordProperty(propertyId, landlordId);
    const resolvedPropertyId = property.id;

    await prismaClient.$transaction(async (tx) => {
      if (payload.complianceRecords !== undefined) {
        await tx.propertyComplianceRecord.updateMany({
          where: { propertyId: resolvedPropertyId, isDeleted: false },
          data: { isDeleted: true },
        });
        const complianceRecords = payload.complianceRecords.map((row) => {
          const expiryDate = parseDate(row.expiryDate);
          return {
            propertyId: resolvedPropertyId,
            certType: row.certType as any,
            certificateNumber: row.certificateNumber || null,
            issueDate: parseDate(row.issueDate),
            expiryDate,
            status: deriveComplianceStatus(expiryDate, row.status),
            documentId: row.documentId || null,
            notes: row.notes || null,
          };
        });
        if (complianceRecords.length > 0) {
          await tx.propertyComplianceRecord.createMany({ data: complianceRecords });
        }
      }

      if (payload.insurancePolicies !== undefined) {
        await tx.propertyInsurance.updateMany({
          where: { propertyId: resolvedPropertyId, isDeleted: false },
          data: { isDeleted: true },
        });
        const insurancePolicies = payload.insurancePolicies.map((row) => ({
          propertyId: resolvedPropertyId,
          insuranceType: row.insuranceType as any,
          provider: row.provider || null,
          policyNumber: row.policyNumber || null,
          coverAmount:
            row.coverAmount != null ? new Prisma.Decimal(row.coverAmount) : null,
          premium: row.premium != null ? new Prisma.Decimal(row.premium) : null,
          premiumFrequency: row.premiumFrequency || null,
          renewalDate: parseDate(row.renewalDate),
          startDate: parseDate(row.startDate),
          documentId: row.documentId || null,
          notes: row.notes || null,
        }));
        if (insurancePolicies.length > 0) {
          await tx.propertyInsurance.createMany({ data: insurancePolicies });
        }
      }

      if (payload.utilityAccounts !== undefined) {
        await tx.propertyUtilityAccount.updateMany({
          where: { propertyId: resolvedPropertyId, isDeleted: false },
          data: { isDeleted: true },
        });
        const utilityAccounts = payload.utilityAccounts.map((row) => ({
          propertyId: resolvedPropertyId,
          utilityType: row.utilityType as any,
          supplier: row.supplier || null,
          accountNumber: row.accountNumber || null,
          meterNumber: row.meterNumber || null,
          paidBy: (row.paidBy as any) || 'LANDLORD',
          annualEstimate:
            row.annualEstimate != null
              ? new Prisma.Decimal(row.annualEstimate)
              : null,
          notes: row.notes || null,
        }));
        if (utilityAccounts.length > 0) {
          await tx.propertyUtilityAccount.createMany({ data: utilityAccounts });
        }
      }

      if (payload.ownershipProfile !== undefined) {
        const op = payload.ownershipProfile;
        if (!op) {
          await tx.propertyOwnershipProfile.deleteMany({ where: { propertyId: resolvedPropertyId } });
        } else {
          await tx.propertyOwnershipProfile.upsert({
            where: { propertyId: resolvedPropertyId },
            create: {
              propertyId: resolvedPropertyId,
              ownerEntityType: (op.ownerEntityType as any) || null,
              ownerEntityName: op.ownerEntityName || null,
              acquisitionDate: parseDate(op.acquisitionDate),
              acquisitionCost:
                op.acquisitionCost != null
                  ? new Prisma.Decimal(op.acquisitionCost)
                  : null,
              mortgageLender: op.mortgageLender || null,
              mortgageAccountRef: op.mortgageAccountRef || null,
              titleReference: op.titleReference || null,
              taxReference: op.taxReference || null,
              notes: op.notes || null,
            },
            update: {
              ownerEntityType: (op.ownerEntityType as any) || null,
              ownerEntityName: op.ownerEntityName || null,
              acquisitionDate: parseDate(op.acquisitionDate),
              acquisitionCost:
                op.acquisitionCost != null
                  ? new Prisma.Decimal(op.acquisitionCost)
                  : null,
              mortgageLender: op.mortgageLender || null,
              mortgageAccountRef: op.mortgageAccountRef || null,
              titleReference: op.titleReference || null,
              taxReference: op.taxReference || null,
              notes: op.notes || null,
            },
          });
        }
      }

      const refreshed = await tx.properties.findUnique({
        where: { id: resolvedPropertyId },
        select: {
          country: true,
          specificationType: true,
          ...operationalInclude,
        },
      });

      const config = getPropertyPmsFormConfig(property.country, property.specificationType);
      const completeness = computeOperationalCompleteness(config, {
        complianceRecords: refreshed?.complianceRecords,
        insurancePolicies: refreshed?.insurancePolicies,
        utilityAccounts: refreshed?.utilityAccounts,
        ownershipProfile: refreshed?.ownershipProfile,
      });

      await tx.properties.update({
        where: { id: resolvedPropertyId },
        data: {
          operationalProfileComplete: completeness.complete,
          operationalProfileCompletedAt: completeness.complete ? new Date() : null,
        },
      });
    });

    return this.getOperationalProfile(resolvedPropertyId, landlordId);
  }

  async getLandlordComplianceSummary(landlordId: string) {
    const properties = await prismaClient.properties.findMany({
      where: { landlordId, isDeleted: false },
      select: {
        id: true,
        name: true,
        country: true,
        specificationType: true,
        operationalProfileComplete: true,
        complianceRecords: {
          where: { isDeleted: false },
          select: {
            id: true,
            certType: true,
            expiryDate: true,
            status: true,
            certificateNumber: true,
          },
        },
        insurancePolicies: {
          where: { isDeleted: false },
          select: { id: true, renewalDate: true, insuranceType: true },
        },
      },
    });

    const complianceChecks: Array<Record<string, unknown>> = [];
    let totalScore = 0;
    let violationsFound = 0;

    for (const property of properties) {
      const config = getPropertyPmsFormConfig(property.country, property.specificationType);
      const completeness = computeOperationalCompleteness(config, {
        complianceRecords: property.complianceRecords,
        insurancePolicies: property.insurancePolicies,
      });

      totalScore += completeness.score;
      violationsFound += completeness.expired.length + completeness.missing.length;

      for (const record of property.complianceRecords) {
        complianceChecks.push({
          propertyId: property.id,
          propertyName: property.name,
          certType: record.certType,
          certificateNumber: record.certificateNumber,
          expiryDate: record.expiryDate,
          status: record.status,
        });
      }

      for (const label of completeness.missing) {
        complianceChecks.push({
          propertyId: property.id,
          propertyName: property.name,
          certType: 'MISSING',
          status: 'PENDING',
          label,
        });
      }
    }

    const count = properties.length || 1;
    return {
      summary: {
        totalProperties: properties.length,
        complianceScore: Math.round(totalScore / count),
        violationsFound,
        recommendations: [
          'Complete recommended certificates for each market',
          'Add insurance policies with renewal dates',
          'Record utility account details for handover',
        ],
      },
      complianceChecks,
      generatedAt: new Date().toISOString(),
    };
  }

  async findExpiringRecords(withinDays = 90) {
    const threshold = new Date(Date.now() + withinDays * 24 * 60 * 60 * 1000);
    const now = new Date();

    const [certs, insurance] = await Promise.all([
      prismaClient.propertyComplianceRecord.findMany({
        where: {
          isDeleted: false,
          expiryDate: { lte: threshold, gte: now },
        },
        include: {
          property: {
            select: {
              id: true,
              name: true,
              landlordId: true,
              landlord: {
                select: {
                  userId: true,
                  user: { select: { email: true } },
                },
              },
            },
          },
        },
      }),
      prismaClient.propertyInsurance.findMany({
        where: {
          isDeleted: false,
          renewalDate: { lte: threshold, gte: now },
        },
        include: {
          property: {
            select: {
              id: true,
              name: true,
              landlordId: true,
              landlord: {
                select: {
                  userId: true,
                  user: { select: { email: true } },
                },
              },
            },
          },
        },
      }),
    ]);

    return { certs, insurance };
  }

  /** Send in-app reminders for expiring certs and insurance (deduped). */
  async runComplianceReminders(withinDays = 90): Promise<number> {
    const NotificationService = (await import('./notification.service')).default;
    const { certs, insurance } = await this.findExpiringRecords(withinDays);
    let sent = 0;

    const emailEnabled = process.env.PMS_COMPLIANCE_EMAIL !== 'false';

    await runWithConcurrency(certs, COMPLIANCE_REMINDER_CONCURRENCY, async (cert) => {
      const userId = cert.property.landlord?.userId;
      if (!userId || cert.reminderSentAt) return;

      const title = 'Compliance certificate expiring';
      const message = `${cert.certType.replace(/_/g, ' ')} for ${cert.property.name} expires on ${cert.expiryDate?.toISOString().slice(0, 10)}.`;

      await NotificationService.createNotification(
        { destId: userId, title, message },
        'MAINTENANCE_REQUESTS'
      );

      const landlordEmail = cert.property.landlord?.user?.email;
      if (emailEnabled && landlordEmail) {
        try {
          const { sendMail } = await import('../utils/emailer');
          await sendMail(landlordEmail, title, `<p>${message}</p>`);
        } catch (emailErr) {
          console.warn('Compliance reminder email skipped:', emailErr);
        }
      }

      await prismaClient.propertyComplianceRecord.update({
        where: { id: cert.id },
        data: { reminderSentAt: new Date() },
      });
      sent += 1;
    });

    const policyGroups = new Map<string, typeof insurance>();
    for (const policy of insurance) {
      const userId = policy.property.landlord?.userId;
      const renewalDate = policy.renewalDate;
      if (!userId || !renewalDate) continue;

      const message = `${policy.insuranceType.replace(/_/g, ' ')} for ${policy.property.name} renews on ${renewalDate.toISOString().slice(0, 10)}.`;
      const key = JSON.stringify([userId, 'Insurance renewal due', message]);
      const policies = policyGroups.get(key);
      if (policies) {
        policies.push(policy);
      } else {
        policyGroups.set(key, [policy]);
      }
    }

    await runWithConcurrency(
      Array.from(policyGroups.values()),
      COMPLIANCE_REMINDER_CONCURRENCY,
      async (policies) => {
        // Matching notification identities stay sequential so the read-before-
        // create deduplication check cannot race within this run.
        for (const policy of policies) {
          const userId = policy.property.landlord?.userId;
          if (!userId || !policy.renewalDate) continue;

          const message = `${policy.insuranceType.replace(/_/g, ' ')} for ${policy.property.name} renews on ${policy.renewalDate.toISOString().slice(0, 10)}.`;
          const alreadySent = await prismaClient.notification.findFirst({
            where: {
              destId: userId,
              title: 'Insurance renewal due',
              message,
            },
          });
          if (alreadySent) continue;

          const title = 'Insurance renewal due';
          await NotificationService.createNotification(
            { destId: userId, title, message },
            'MAINTENANCE_REQUESTS'
          );

          const landlordEmail = policy.property.landlord?.user?.email;
          if (emailEnabled && landlordEmail) {
            try {
              const { sendMail } = await import('../utils/emailer');
              await sendMail(landlordEmail, title, `<p>${message}</p>`);
            } catch (emailErr) {
              console.warn('Insurance reminder email skipped:', emailErr);
            }
          }

          sent += 1;
        }
      }
    );

    return sent;
  }

  /** Parse JSON/object operational payload after property create (wizard, bulk, API). */
  async syncOperationalProfileFromRaw(
    propertyId: string,
    landlordId: string,
    operationalRaw: unknown
  ): Promise<boolean> {
    if (!operationalRaw || !propertyId || !landlordId) return false;
    try {
      const parsed =
        typeof operationalRaw === 'string' ? JSON.parse(operationalRaw) : operationalRaw;
      await this.upsertOperationalProfile(propertyId, landlordId, parsed);
      return true;
    } catch (err) {
      console.warn('Operational profile sync skipped:', err);
      return false;
    }
  }

  async getPlatformComplianceOverview() {
    const properties = await prismaClient.properties.findMany({
      where: { isDeleted: false },
      select: {
        id: true,
        name: true,
        country: true,
        specificationType: true,
        operationalProfileComplete: true,
        landlord: {
          select: {
            id: true,
            user: { select: { email: true, profile: { select: { fullname: true } } } },
          },
        },
        complianceRecords: {
          where: { isDeleted: false },
          select: { certType: true, expiryDate: true, status: true },
        },
        insurancePolicies: {
          where: { isDeleted: false },
          select: { insuranceType: true, renewalDate: true },
        },
      },
      orderBy: { updatedAt: 'desc' },
      take: 500,
    });

    const rows: Array<Record<string, unknown>> = [];
    let totalScore = 0;
    let expiredCount = 0;
    let incompleteCount = 0;

    for (const property of properties) {
      const config = getPropertyPmsFormConfig(property.country, property.specificationType);
      const completeness = computeOperationalCompleteness(config, {
        complianceRecords: property.complianceRecords,
        insurancePolicies: property.insurancePolicies,
      });
      totalScore += completeness.score;
      if (!completeness.complete) incompleteCount += 1;
      expiredCount += completeness.expired.length;

      rows.push({
        propertyId: property.id,
        propertyName: property.name,
        country: property.country,
        specificationType: property.specificationType,
        landlordEmail: property.landlord?.user?.email,
        landlordName: property.landlord?.user?.profile?.fullname,
        completenessScore: completeness.score,
        complete: completeness.complete,
        missing: completeness.missing,
        expiringSoon: completeness.expiringSoon,
        expired: completeness.expired,
      });
    }

    const count = properties.length || 1;
    return {
      summary: {
        totalProperties: properties.length,
        averageCompleteness: Math.round(totalScore / count),
        incompleteProperties: incompleteCount,
        propertiesWithExpiredCerts: expiredCount,
      },
      properties: rows,
      generatedAt: new Date().toISOString(),
    };
  }
}

export default new PropertyOperationalService();

export { operationalInclude };
