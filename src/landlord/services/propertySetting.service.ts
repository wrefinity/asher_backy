import { PropsSettingType, Refundability, ReminderMethodType, RefundPolicyType } from "@prisma/client";
import { prismaClient } from "../..";
import { IPropApartmentSettings, IGlobalSetting } from '../validations/interfaces/propsSettings';
import {
  mapToPropertyLateFeeFrequency,
  normalizeReminderMethods,
  parseGracePeriodDays,
  reminderMethodsNeedMigration,
  resolveFinancialRules,
} from '../../utils/globalSettings.util';

class LandlordSettingsService {

    createOrUpdate = async (data: IPropApartmentSettings) => {
        const payload = { ...data };
        if (payload.gracePeriodDays != null) {
            payload.gracePeriodDays = parseGracePeriodDays(payload.gracePeriodDays) ?? 0;
        }
        return prismaClient.propertySettings.upsert({
            where: {
                propertyId_settingType: {
                    propertyId: payload.propertyId,
                    settingType: payload.settingType,
                },
            },
            update: {
                ...payload,
            },
            create: {
                ...payload,
            },
        });
    };

    getById = async (id: string) => {
        return prismaClient.propertySettings.findUnique({
            where: { id },
        });
    }

    getAll = async () => {
        return prismaClient.propertySettings.findMany();
    }
    getLandlordPropsSetting = async (landlordId) => {
        return prismaClient.propertySettings.findMany({
            where: { landlordId }
        });
    }

    update = async (id: string, data: IPropApartmentSettings) => {
        return prismaClient.propertySettings.update({
            where: { id },
            data,
        });
    }

    async updateLandlordSettings(landlordId: string, updateData: Partial<IGlobalSetting>) {
        const data = { ...updateData };

        if (data.reminderMethods) {
            data.reminderMethods = normalizeReminderMethods(data.reminderMethods);
        }

        const existingSettings = await prismaClient.settings.findFirst({
            where: { landlordId, isDeleted: false },
        });

        if (existingSettings) {
            return prismaClient.settings.update({
                where: { id: existingSettings.id },
                data,
            });
        }

        return prismaClient.settings.create({
            data: {
                landlordId,
                lateFeeEnabled: data.lateFeeEnabled ?? false,
                notificationEnabled: data.notificationEnabled ?? false,
                reminderMethods: data.reminderMethods ?? [],
                ...data,
            },
        });
    }
    delete = async (id: string) => {
        return prismaClient.propertySettings.delete({
            where: { id },
        });
    }

    createGlobalSetting = async (data: IGlobalSetting): Promise<IGlobalSetting> => {
        return await prismaClient.settings.create({ data });
    }

    private async migrateReminderMethodsIfNeeded(
        settings: IGlobalSetting
    ): Promise<IGlobalSetting> {
        if (!reminderMethodsNeedMigration(settings.reminderMethods)) {
            return settings;
        }

        const reminderMethods = normalizeReminderMethods(settings.reminderMethods);
        return prismaClient.settings.update({
            where: { id: settings.id },
            data: { reminderMethods },
        });
    }

    getGlobalSettingById = async (id: string): Promise<IGlobalSetting | null> => {
        const settings = await prismaClient.settings.findUnique({ where: { id } });
        if (!settings) return null;
        return this.migrateReminderMethodsIfNeeded(settings);
    }

    getAllGlobalSettings = async (landlordId: string): Promise<IGlobalSetting | null> => {
        if (!landlordId) return null;
        const settings = await prismaClient.settings.findFirst({
            where: { landlordId, isDeleted: false },
        });
        if (!settings) return null;
        return this.migrateReminderMethodsIfNeeded(settings);
    }

    updateGlobalSetting = async (id: string, data: Partial<IGlobalSetting>): Promise<IGlobalSetting | null> => {
        return prismaClient.settings.update({
            where: { id },
            data,
        });
    }
    deleteGlobalSetting = async (id: string): Promise<IGlobalSetting | null> => {
        return prismaClient.settings.update({ where: { id }, data: { isDeleted: true } });
    }

    getPropertyLateFeeOverride = async (propertyId: string) => {
        return prismaClient.propertySettings.findFirst({
            where: { propertyId, settingType: PropsSettingType.LATEFEE },
        });
    };

    upsertPropertyLateFeeSettings = async (params: {
        landlordId: string;
        propertyId: string;
        lateFeePercentage?: number;
        lateFeeFixed?: number;
        gracePeriodDays?: number | string;
        lateFeeFrequency?: IGlobalSetting['lateFeeFrequency'];
    }) => {
        const { landlordId, propertyId, lateFeePercentage, lateFeeFixed, gracePeriodDays, lateFeeFrequency } =
            params;

        const parsedGrace =
            parseGracePeriodDays(gracePeriodDays) ?? 0;

        return prismaClient.propertySettings.upsert({
            where: {
                propertyId_settingType: {
                    propertyId,
                    settingType: PropsSettingType.LATEFEE,
                },
            },
            update: {
                lateFeePercentage: lateFeePercentage ?? 0,
                lateFee: lateFeeFixed ?? 0,
                gracePeriodDays: parsedGrace,
                lateFeeFrequency: mapToPropertyLateFeeFrequency(lateFeeFrequency),
            },
            create: {
                landlordId,
                propertyId,
                settingType: PropsSettingType.LATEFEE,
                lateFeePercentage: lateFeePercentage ?? 0,
                lateFee: lateFeeFixed ?? 0,
                gracePeriodDays: parsedGrace,
                lateFeeFrequency: mapToPropertyLateFeeFrequency(lateFeeFrequency),
            },
        });
    };

    syncApplicationSettingsFromGlobal = async (
        landlordId: string,
        propertyId: string,
        rent: number,
        priceFrequency?: string | null
    ) => {
        const globalSettings = await this.getAllGlobalSettings(landlordId);
        if (!globalSettings) return null;

        const rules = resolveFinancialRules(
            globalSettings,
            rent,
            priceFrequency as any
        );

        return prismaClient.propertySettings.upsert({
            where: {
                propertyId_settingType: {
                    propertyId,
                    settingType: PropsSettingType.APPLICATION,
                },
            },
            update: {
                applicationFee: rules.applicationFeePercent,
                refundPolicy:
                    rules.refundPolicy === RefundPolicyType.NONE
                        ? Refundability.NO
                        : Refundability.YES,
                refundTimeframe: rules.refundTimeframe ?? undefined,
            },
            create: {
                landlordId,
                propertyId,
                settingType: PropsSettingType.APPLICATION,
                applicationFee: rules.applicationFeePercent,
                refundPolicy:
                    rules.refundPolicy === RefundPolicyType.NONE
                        ? Refundability.NO
                        : Refundability.YES,
                refundTimeframe: rules.refundTimeframe ?? undefined,
            },
        });
    };
}

export default new LandlordSettingsService();