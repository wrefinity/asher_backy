import { logTypeStatus, LogType } from '@prisma/client';
import { prismaClient } from '..';
import LandlordSettingsService from '../landlord/services/propertySetting.service';
import { resolveFinancialRules } from '../utils/globalSettings.util';
import {
  PENDING_RENT_ADJUSTMENT_EVENT,
  parsePendingRentAdjustment,
  startOfCalendarDay,
  type PendingRentAdjustmentPayload,
  validateRentIncreaseNotice,
} from '../utils/settingsEnforcement.util';
import { notifyPropertyTenancyFinancialChanges } from './tenancyChangeNotification.service';

class PendingRentAdjustmentService {
  async scheduleAdjustment(params: {
    tenantId: string;
    propertyId: string;
    landlordId: string;
    oldRent: number;
    newRent: number;
    effectiveDate: Date;
    createdById?: string;
  }) {
    const globalSettings = await LandlordSettingsService.getAllGlobalSettings(
      params.landlordId
    );
    const property = await prismaClient.properties.findUnique({
      where: { id: params.propertyId },
      select: { priceFrequency: true },
    });
    const rules = resolveFinancialRules(
      globalSettings,
      params.newRent,
      property?.priceFrequency
    );

    if (params.newRent > params.oldRent) {
      const noticeCheck = validateRentIncreaseNotice(
        params.effectiveDate,
        rules.rentIncreaseNoticeDays
      );
      if (!noticeCheck.valid) {
        throw new Error(noticeCheck.error ?? 'Rent increase notice requirement not met');
      }
    }

    await this.cancelPendingForTenant(params.tenantId);

    const payload: PendingRentAdjustmentPayload = {
      tenantId: params.tenantId,
      propertyId: params.propertyId,
      landlordId: params.landlordId,
      oldRent: params.oldRent,
      newRent: params.newRent,
      effectiveDate: startOfCalendarDay(params.effectiveDate).toISOString(),
    };

    return prismaClient.log.create({
      data: {
        events: PENDING_RENT_ADJUSTMENT_EVENT,
        subjects: JSON.stringify(payload),
        type: LogType.ACTIVITY,
        status: logTypeStatus.PENDING,
        propertyId: params.propertyId,
        createdById: params.createdById,
      },
    });
  }

  async cancelPendingForTenant(tenantId: string) {
    const pending = await this.listPendingForTenant(tenantId);
    await Promise.all(
      pending.map((row) =>
        prismaClient.log.update({
          where: { id: row.id },
          data: { status: logTypeStatus.COMPLETED },
        })
      )
    );
  }

  async listPendingForTenant(tenantId: string) {
    const logs = await prismaClient.log.findMany({
      where: {
        events: PENDING_RENT_ADJUSTMENT_EVENT,
        status: logTypeStatus.PENDING,
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    return logs.filter((log) => {
      const payload = parsePendingRentAdjustment(log.subjects);
      return payload?.tenantId === tenantId && !payload.appliedAt;
    });
  }

  async getPendingForTenant(tenantId: string) {
    const rows = await this.listPendingForTenant(tenantId);
    const log = rows[0];
    if (!log) return null;
    const payload = parsePendingRentAdjustment(log.subjects);
    if (!payload) return null;
    return { logId: log.id, ...payload };
  }

  async listPendingForProperty(propertyId: string) {
    const logs = await prismaClient.log.findMany({
      where: {
        events: PENDING_RENT_ADJUSTMENT_EVENT,
        status: logTypeStatus.PENDING,
        propertyId,
      },
      orderBy: { createdAt: 'desc' },
    });

    return logs
      .map((log) => {
        const payload = parsePendingRentAdjustment(log.subjects);
        if (!payload || payload.appliedAt) return null;
        return { logId: log.id, ...payload };
      })
      .filter(Boolean);
  }

  async applyDueAdjustments(): Promise<number> {
    const today = startOfCalendarDay(new Date());
    const logs = await prismaClient.log.findMany({
      where: {
        events: PENDING_RENT_ADJUSTMENT_EVENT,
        status: logTypeStatus.PENDING,
      },
      take: 200,
    });

    let applied = 0;
    const appliedPropertyKeys = new Set<string>();

    for (const log of logs) {
      const payload = parsePendingRentAdjustment(log.subjects);
      if (!payload || payload.appliedAt) continue;

      const effective = startOfCalendarDay(new Date(payload.effectiveDate));
      if (effective.getTime() > today.getTime()) continue;

      const dedupeKey = `${payload.propertyId}:${payload.effectiveDate}:${payload.newRent}`;
      if (appliedPropertyKeys.has(dedupeKey)) {
        await prismaClient.log.update({
          where: { id: log.id },
          data: {
            status: logTypeStatus.COMPLETED,
            subjects: JSON.stringify({
              ...payload,
              appliedAt: new Date().toISOString(),
              skippedDuplicate: true,
            }),
          },
        });
        continue;
      }

      const property = await prismaClient.properties.findUnique({
        where: { id: payload.propertyId },
        select: { price: true, currency: true, landlordId: true },
      });
      if (!property) continue;

      const oldRent = Number(property.price ?? payload.oldRent);
      await prismaClient.properties.update({
        where: { id: payload.propertyId },
        data: { price: payload.newRent },
      });

      appliedPropertyKeys.add(dedupeKey);

      const duplicateLogs = logs.filter((other) => {
        if (other.id === log.id) return false;
        const otherPayload = parsePendingRentAdjustment(other.subjects);
        if (!otherPayload || otherPayload.appliedAt) return false;
        return (
          `${otherPayload.propertyId}:${otherPayload.effectiveDate}:${otherPayload.newRent}` ===
          dedupeKey
        );
      });

      await prismaClient.log.update({
        where: { id: log.id },
        data: {
          status: logTypeStatus.COMPLETED,
          subjects: JSON.stringify({
            ...payload,
            appliedAt: new Date().toISOString(),
          }),
        },
      });

      await Promise.all(
        duplicateLogs.map((duplicate) =>
          prismaClient.log.update({
            where: { id: duplicate.id },
            data: {
              status: logTypeStatus.COMPLETED,
              subjects: JSON.stringify({
                ...parsePendingRentAdjustment(duplicate.subjects)!,
                appliedAt: new Date().toISOString(),
                skippedDuplicate: true,
              }),
            },
          })
        )
      );

      await notifyPropertyTenancyFinancialChanges({
        propertyId: payload.propertyId,
        landlordId: payload.landlordId,
        currency: property.currency ? String(property.currency) : undefined,
        oldRent,
        newRent: payload.newRent,
        effectiveDate: effective,
        reason: 'scheduled rent adjustment',
      });

      applied += 1;
    }

    return applied;
  }

  async getPendingForProperty(propertyId: string) {
    const rows = await this.listPendingForProperty(propertyId);
    return rows[0] ?? null;
  }
}

export default new PendingRentAdjustmentService();
