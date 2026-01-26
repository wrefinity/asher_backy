import { prismaClient } from "..";
import { AvailabilityStatus, MediaType, PropertySpecificationType } from "@prisma/client";

class PropertyUnit {

    // Create a unit under any one of the property types
    async createUnitDetail(data: any) {
        const { residentialPropertyId, commercialPropertyId, uploadedFiles, ...rest } = data;
        const propertyTypes = [residentialPropertyId, commercialPropertyId].filter(Boolean);
        if (propertyTypes.length !== 1) {
            throw new Error('Exactly one of residentialPropertyId or commercialPropertyId must be provided.');
        }
        // Separate media by type
        const images = uploadedFiles?.filter(file => file?.identifier === 'MediaTable' && file?.type === MediaType.IMAGE);

        return await prismaClient.unitConfiguration.create({

            data: {
                ...rest,
                residentialPropertyId,
                commercialPropertyId,
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

    // Get unit by ID
    async getUnitById(id: string) {
        const props = await prismaClient.unitConfiguration.findUnique({
            where: { id },
            include: {
                ResidentialProperty: true,
                CommercialProperty: true,
                images: true,
                RoomDetail: {
                    where: {
                        isDeleted: false,
                    },
                    include: {
                        images: true,
                    },
                },
            }
        });

        if (!props) { throw new Error("Unit not found") }

        const {
            ResidentialProperty,
            CommercialProperty,
            RoomDetail,
            ...rest
        } = props;

        return {
            // property: rest,
            ...rest,
            residential: ResidentialProperty,
            commercial: CommercialProperty,
            RoomDetail: RoomDetail || [],
        };
    }


    async getUnitByProperty(
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
          // case PropertySpecificationType.SHORTLET:
          //   whereClause.ShortletProperty = { id: propertyId };
          //   break;
          default:
            throw new Error('Invalid property type');
        }
      
        const units = await prismaClient.unitConfiguration.findMany({
          where: whereClause,
          include: {
            images: true,
            ResidentialProperty: true,
            CommercialProperty: true,
          },
        });
      
        // Format response to flatten and rename relations
        const formattedUnits = units.map(unit => {
          const { ResidentialProperty, CommercialProperty, ...rest } = unit;
      
          return {
            ...rest,
            residential: ResidentialProperty,
            commercial: CommercialProperty,
          };
        });
      
        return formattedUnits;
      }
      


    // Update unit details
    updateUnitProperty = async (id: string, data: any) => {
        return await prismaClient.unitConfiguration.update({
            where: { id },
            data,
        });
    }

    // Soft delete the unit by marking isDeleted = true (you need to add this field in the model)
    softDeleteUnit = async (id: string) => {
        return await prismaClient.unitConfiguration.update({
            where: { id },
            data: { isDeleted: true },
        });
    }

    // Update unit availability status (VACANT or OCCUPIED)
    updateUnitAvailabilityStatus = async (id: string, availability: AvailabilityStatus) => {
        return await prismaClient.unitConfiguration.update({
            where: { id },
            data: { availability },
        });
    }

    // Fetch all unit across all property types
    getAllUnit = async () => {
        return await prismaClient.unitConfiguration.findMany({
            include: {
                ResidentialProperty: true,
                CommercialProperty: true,
                images: true,
            },
        });
    }
}

export default new PropertyUnit();
