import { SettingType } from "@prisma/client";
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
            where:{landlordId}
        });
    }

    update = async (id: string, data: IPropApartmentSettings) => {
        return prismaClient.propertySettings.update({
            where: { id },
            data,
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

    getGlobalSettingById = async (id: string): Promise<IGlobalSetting | null> => {
        return prismaClient.settings.findUnique({ where: { id } });
    }

    getAllGlobalSettings = async (landlordId:string): Promise<IGlobalSetting[]> => {
        return prismaClient.settings.findMany({where: {landlordId}});
    }
    getLandlordGlobalSettingWithStatus = async (landlordId:string, type: SettingType): Promise<IGlobalSetting|null> => {
        return prismaClient.settings.findFirst({
            where: {
                ...(type ? { type } : {}),
                landlordId
            }}
        );
    }

    updateGlobalSetting = async (id: string, data: Partial<IGlobalSetting>): Promise<IGlobalSetting | null> => {
        return prismaClient.settings.update({
            where: { id },
            data,
        });
    }
    deleteGlobalSetting = async (id: string): Promise<IGlobalSetting | null> => {
        return prismaClient.settings.update({ where: { id }, data: {isDeleted: true} });
    }
}

export default new LandlordSettingsService();