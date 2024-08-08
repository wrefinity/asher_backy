import { prismaClient } from "..";


class PropertyService {
    async createProperty(propertyData: any) {
        return await prismaClient.properties.create({
            data: {
                ...propertyData,   }
        })
    }

    async getProperties() {
        return await prismaClient.properties.findMany({})
    }
    getPropertiesById = async (id: string) => {
        return await prismaClient.properties.findUnique({
            where: { id },
        });
    }
}

export default new PropertyService()