import { prismaClient } from "../..";
import { IPropApartmentSettings, IGlobalSetting } from '../validations/interfaces/propsSettings';


class LandlordSettingsService {

    create = async (data: IPropApartmentSettings) => {
        return prismaClient.propApartmentSettings.create({
            data,
        });
    }

    getById = async (id: string) => {
        return prismaClient.propApartmentSettings.findUnique({
            where: { id },
        });
    }

    getAll = async () => {
        return prismaClient.propApartmentSettings.findMany();
    }

    update = async (id: string, data: IPropApartmentSettings) => {
        return prismaClient.propApartmentSettings.update({
            where: { id },
            data,
        });
    }

    delete = async (id: string) => {
        return prismaClient.propApartmentSettings.delete({
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