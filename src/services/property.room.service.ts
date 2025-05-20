import { prismaClient } from "..";
import { AvailabilityStatus, PropertySpecificationType } from "@prisma/client";

class PropertyRoom {

    // Create a room under any one of the property types
    async createRoomDetail(data: any) {
        const { residentialPropertyId, commercialPropertyId, shortletPropertyId, ...rest } = data;
        const propertyTypes = [residentialPropertyId, commercialPropertyId, shortletPropertyId].filter(Boolean);
        if (propertyTypes.length !== 1) {
            throw new Error('Exactly one of residentialPropertyId, commercialPropertyId, or shortletPropertyId must be provided.');
        }
        return await prismaClient.roomDetail.create({
            data: {
                ...rest,
                residentialPropertyId,
                commercialPropertyId,
                shortletPropertyId,
            },
        });
    }

    // Get room by ID
    async getRoomById(id: string) {
        return await prismaClient.roomDetail.findUnique({
            where: { id },
            include: {
                ResidentialProperty: true,
                CommercialProperty: true,
                ShortletProperty: true,
                images: true,
            }
        });
    }

    getRoomsByProperty = async (propertyType: PropertySpecificationType, propertyId: string) => {
        let whereClause: any = {};
        switch (propertyType) {
            case PropertySpecificationType.RESIDENTIAL:
                whereClause.residentialPropertyId = propertyId;
                break;
            case PropertySpecificationType.COMMERCIAL:
                whereClause.commercialPropertyId = propertyId;
                break;
            case PropertySpecificationType.SHORTLET:
                whereClause.shortletPropertyId = propertyId;
                break;
            default:
                throw new Error('Invalid property type');
        }

        return await prismaClient.roomDetail.findMany({
            where: whereClause,
            include: { images: true },
        });
    }


    // Update room details
    updateRoomProperty = async (id: string, data: any) =>{
        return await prismaClient.roomDetail.update({
            where: { id },
            data,
        });
    }

    // Soft delete the unit by marking isDeleted = true (you need to add this field in the model)
    softDeleteUnit = async (id: string) =>{
        return await prismaClient.roomDetail.update({
            where: { id },
            data: { isDeleted: true },
        });
    }

    // Update unit availability status (VACANT or OCCUPIED)
    updateUnitAvailabilityStatus= async (id: string, availability: AvailabilityStatus) =>{
        return await prismaClient.roomDetail.update({
            where: { id },
            data: { availability },
        });
    }

    // Fetch all rooms across all property types
    getAllRooms = async () => {
        return await prismaClient.roomDetail.findMany({
            include: {
                ResidentialProperty: true,
                CommercialProperty: true,
                ShortletProperty: true,
                images: true,
            },
        });
    }
}

export default new PropertyRoom();
