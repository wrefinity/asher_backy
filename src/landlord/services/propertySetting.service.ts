import { prismaClient } from "../..";
import { IPropApartmentSettings } from '../validations/interfaces/propsSettings';


class PropApartmentSettingsService {
    
    create = async (data: IPropApartmentSettings) => {
        return prismaClient.propApartmentSettings.create({
            data,
        });
    }

    getById = async (id: string) =>{
        return prismaClient.propApartmentSettings.findUnique({
            where: { id },
        });
    }

    getAll = async () => {
        return prismaClient.propApartmentSettings.findMany();
    }

    update = async (id: string, data: IPropApartmentSettings) =>{
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
}

export default new PropApartmentSettingsService();