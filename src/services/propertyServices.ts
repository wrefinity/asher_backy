import { prismaClient } from "..";


class PropertyService {
    async createProperty(propertyData: any) {
        return await prismaClient.properties.create({
            data: propertyData
        })
    }

    async getProperties() {
        return await prismaClient.properties.findMany({})
    }
}

export default new PropertyService()