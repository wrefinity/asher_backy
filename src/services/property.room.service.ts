import { prismaClient } from "..";
import { AvailabilityStatus, MediaType, PropertySpecificationType } from "@prisma/client";

class PropertyRoom {

    // Create a room under any one of the property types
    async createRoomDetail(data: any) {
        const { residentialPropertyId, commercialPropertyId, shortletPropertyId, uploadedFiles, ...rest } = data;
        const propertyTypes = [residentialPropertyId, commercialPropertyId].filter(Boolean);
        if (propertyTypes.length !== 1) {
            throw new Error('Exactly one of residentialPropertyId, commercialPropertyId, or commercialPropertyId must be provided.');
        }
        // Separate media by type
        const images = uploadedFiles?.filter(file => file?.identifier === 'MediaTable' && file?.type === MediaType.IMAGE);

        return await prismaClient.roomDetail.create({
            data: {
                ...rest,
                residentialPropertyId,
                commercialPropertyId,
                shortletPropertyId,
                images: {
                    create: images?.map(img => ({
                        type: img.type,
                        size: img.size,
                        fileType: img.fileType,
                        url: img.url,
                        isPrimary: img.isPrimary,
                        caption: img.caption,
                    }))
                },
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



    async getRoomsByProperty(
        propertyType: PropertySpecificationType,
        propertyId: string
      ) {
        if (!Object.values(PropertySpecificationType).includes(propertyType)) {
          throw new Error(`Invalid property type: ${propertyType}`);
        }
      
        let whereClause: any = {};
      
        switch (propertyType) {
          case PropertySpecificationType.RESIDENTIAL:
            whereClause.ResidentialProperty = { id: propertyId };
            break;
          case PropertySpecificationType.COMMERCIAL:
            whereClause.CommercialProperty = { id: propertyId };
            break;
          // Uncomment and extend for SHORTLET or others:
          case PropertySpecificationType.SHORTLET:
            whereClause.ShortletProperty = { id: propertyId };
            break;
          default:
            throw new Error('Invalid property type');
        }
      
        const units = await prismaClient.roomDetail.findMany({
          where: whereClause,
          include: {
            images: true,
            ResidentialProperty: true,
            CommercialProperty: true,
            ShortletProperty: true,
          },
        });
      
        // Format response to flatten and rename relations
        const formattedUnits = units.map(unit => {
          const { ResidentialProperty,ShortletProperty, CommercialProperty, ...rest } = unit;
      
          return {
            ...rest,
            residential: ResidentialProperty,
            commercial: CommercialProperty,
            shortlet: ShortletProperty,
          };
        });
      
        return formattedUnits;
      }


    // Update room details
    updateRoomProperty = async (id: string, data: any) => {
        return await prismaClient.roomDetail.update({
            where: { id },
            data,
        });
    }

    // Soft delete the unit by marking isDeleted = true (you need to add this field in the model)
    softDeleteUnit = async (id: string) => {
        return await prismaClient.roomDetail.update({
            where: { id },
            data: { isDeleted: true },
        });
    }

    // Update unit availability status (VACANT or OCCUPIED)
    updateUnitAvailabilityStatus = async (id: string, availability: AvailabilityStatus) => {
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
