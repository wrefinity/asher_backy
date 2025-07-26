import { ReminderMethodType } from "@prisma/client";
import { prismaClient } from "../..";
import { IPropApartmentSettings, IGlobalSetting } from '../validations/interfaces/propsSettings';

class LandlordSettingsService {

    createOrUpdate = async (data: IPropApartmentSettings) => {
        return prismaClient.propertySettings.upsert({
            where: {
                propertyId_settingType: {
                    propertyId: data.propertyId,
                    settingType: data.settingType,
                },
            },
            update: {
                ...data,
            },
            create: {
                ...data,
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

    // Update landlord settings with enum validation
    async updateLandlordSettings(landlordId: string, updateData: IGlobalSetting) {
        // Validate reminderMethods if provided
        if (updateData.reminderMethods) {
            const validMethods = Object.values(ReminderMethodType);
            updateData.reminderMethods = updateData.reminderMethods
                .filter((method: string) => validMethods.includes(method as ReminderMethodType))
                .map(method => method.toUpperCase() as ReminderMethodType);
        }

        // First check if settings exist for this landlord
        const existingSettings = await prismaClient.settings.findFirst({
            where: { landlordId }
        });

        if (existingSettings) {
            // Update existing settings
            return await prismaClient.settings.update({
                where: { id: existingSettings.id },
                data: updateData
            });
        } else {
            // Create new settings
            return await prismaClient.settings.create({
                data: {
                    landlordId,
                    ...updateData
                }
            });
        }
    }
    delete = async (id: string) => {
        return prismaClient.propertySettings.delete({
            where: { id },
        });
    }

    createGlobalSetting = async (data: IGlobalSetting): Promise<IGlobalSetting> => {
        return await prismaClient.settings.create({ data });
    }

    getGlobalSettingById = async (id: string): Promise<IGlobalSetting | null> => {
        return prismaClient.settings.findUnique({ where: { id } });
    }

    getAllGlobalSettings = async (landlordId: string): Promise<IGlobalSetting> => {
        return prismaClient.settings.findFirst({ where: { landlordId } });
    }
    getLandlordGlobalSettingWithStatus = async (landlordId: string, type: string): Promise<IGlobalSetting | null> => {
        return prismaClient.settings.findFirst({
            where: {
                ...(type ? { type } : {}),
                landlordId
            }
        }
        );
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
}

export default new LandlordSettingsService();