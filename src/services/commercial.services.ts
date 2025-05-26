import { Prisma, PropertySpecificationType } from "@prisma/client";
import { prismaClient } from "..";
import { PropertyType } from "@prisma/client"
import { AdditionalRule, Booking, ICommercialDTO, IResidentialDTO, SeasonalPricing, IShortletDTO, UnavailableDate, ICreateProperty, IPropertySpecificationDTO, IBasePropertyDTO } from "../validations/interfaces/properties.interface";



type PropertyWithSpecification = Prisma.propertiesGetPayload<{
    include: any;
}>;

type FlattenedProperty = Record<string, any>;

interface PropertyFilters {
    landlordId?: string;
    property?: {
        state?: string;
        country?: string;
        isActive?: boolean;
        specificationType?: string;
        propertysize?: number;
        marketValue?: number;
        maxRentalFee?: number;
        minRentalFee?: number;
        rentalFee?: number;
        maxBedRoom?: number;
        minBedRoom?: number;
        // noBathRoom?: number;
        maxBathRoom?: number;
        minBathRoom?: number;
        noKitchen?: number;
        minGarage?: number;
        maxGarage?: number;
        type?: PropertyType | PropertyType[];
    };
    isShortlet?: boolean,
    dueDate?: Date,
    yearBuilt?: Date,
    zipcode?: string,
    amenities?: [string],
    minSize?: number;
    maxSize?: number;
    mustHaves?: string[];
}

class CommercialPropertyService {

    landlordInclusion: any
    propsInclusion: any
    specificationInclusion: any

    constructor() {

        this.specificationInclusion = {
            include: {
                residential: {
                    include: {
                        unitConfigurations: true,
                        sharedFacilities: true,
                        bills: true,
                    }
                },
                commercial: {
                    include: {
                        floorAvailability: true,
                        unitConfigurations: true,
                        suitableFor: true,
                        roomDetails: true,
                        sharedFacilities: true,
                    }
                },
                shortlet: {
                    include: {
                        bookings: true,
                        seasonalPricing: true,
                        unavailableDates: true,
                        additionalRules: true,
                        hostLanguages: true,
                        roomDetails: true,
                        sharedFacilities: true,
                    }
                },
            }
        }
        this.landlordInclusion = {
            include: {
                user: {
                    select: {
                        email: true,
                        id: true,
                        profile: {
                            select: {
                                id: true,
                                fullname: true,
                                firstName: true,
                                lastName: true,
                                middleName: true,
                                profileUrl: true,
                            },
                        },
                    },
                },
            },
        }
        this.propsInclusion = {
            propertyListingHistory: true,
            state: true,
            images: true,
            videos: true,
            virtualTours: true,
            propertyDocument: true,
            application: true,
            reviews: true,
            UserLikedProperty: true,
            landlord: this.landlordInclusion,
            specification: this.specificationInclusion
        }
    }


    getCommercialPropertyById = async (propertyId: string) =>{
        return await prismaClient.commercialProperty.findUnique({
            where:{id: propertyId},
            include:{
                floorAvailability: true,
                unitConfigurations: true,
                suitableFor: true,
                roomDetails: true,
                sharedFacilities: true, 
            }
        })
    }

    createCommercialProperty = async (propertyId: string, data: ICommercialDTO | any, tx: any, specification: IPropertySpecificationDTO) =>{
        const {
            safetyFeatures = [],
            coolingTypes = [],
            heatingTypes = [],
            customSafetyFeatures = [],
            securityFeatures = [],
            otherSharedFacilities = [],
            floorAvailability,
            roomDetails,
            unitConfigurations,
            suitableFor,
            PropertySpecification,
            sharedFacilities,
            ...rest
        } = data;

        const property = await tx.properties.findUnique({
            where: { id: propertyId }
        });
        if (!property) throw new Error(`Property ${propertyId} not found`);
        // Proceed with creation
        const commercial = await tx.commercialProperty.create({
            data: {
                ...rest,
                // property: { connect: { id: propertyId } }, // Ensure connection to parent property


                // All array fields with set operations
                securityFeatures: securityFeatures ? { set: securityFeatures } : undefined,
                safetyFeatures: safetyFeatures ? { set: safetyFeatures } : undefined,
                customSafetyFeatures: customSafetyFeatures ? { set: customSafetyFeatures } : undefined,
                coolingTypes: coolingTypes ? { set: coolingTypes } : undefined,
                heatingTypes: heatingTypes ? { set: heatingTypes } : undefined,
                otherSharedFacilities: otherSharedFacilities ? { set: otherSharedFacilities } : undefined,

                // Required fields from your model
                leaseTermUnit: rest.leaseTermUnit || "YEARS",
                minimumLeaseTerm: rest.minimumLeaseTerm || 12,
                // Nested creates
                floorAvailability: {
                    create: floorAvailability?.map((floor: any) => ({
                        floorNumber: floor.floorNumber,
                        area: floor.area,
                        price: floor.price,
                        available: floor.available,
                        partialFloor: floor.partialFloor,
                        description: floor.description,
                        amenities: floor?.amenities ? { set: securityFeatures } : undefined,
                    })) || []
                },

                roomDetails: {
                    create: roomDetails?.map((room: any) => ({
                        roomName: room.roomName,
                        roomSize: room.roomSize,
                        ensuite: room.ensuite,
                        price: room.price,
                    })) || []
                },

                sharedFacilities: {
                    create: {
                        kitchen: sharedFacilities?.kitchen ?? false,
                        bathroom: sharedFacilities?.bathroom ?? false,
                        livingRoom: sharedFacilities?.livingRoom ?? false,
                        garden: sharedFacilities?.garden ?? false,
                        garage: sharedFacilities?.garage ?? false,
                        laundry: sharedFacilities?.laundry ?? false,
                        parking: sharedFacilities?.parking ?? false,
                        other: sharedFacilities?.other || "",
                    }
                },

                suitableFor: {
                    create: suitableFor?.map((name: string) => ({ name })) || []
                },

                unitConfigurations: {
                    create: unitConfigurations?.map((unit: any) => ({
                        unitType: unit.unitType,
                        unitNumber: unit.unitNumber,
                        floorNumber: unit.floorNumber,
                        count: unit.count,
                        bedrooms: unit.bedrooms,
                        bathrooms: unit.bathrooms,
                        price: unit.price,
                        area: unit.area,
                        description: unit.description,
                        availability: unit.availability,
                    })) || []
                }
            }
        });

        return await tx.propertySpecification.create({
            data: {
                property: {
                    connect: { id: property.id }
                },
                specificationType: PropertySpecificationType.COMMERCIAL,
                commercial: { connect: { id: commercial.id } },
                propertySubType: specification.propertySubType,
                otherTypeSpecific: specification?.otherTypeSpecific
            }
        });
    }

}

export default new CommercialPropertyService()