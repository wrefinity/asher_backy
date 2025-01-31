import { prismaClient } from "..";
import { PropertyType, PropsSettingType } from "@prisma/client"
import { PropertyListingDTO } from "../landlord/validations/interfaces/propsSettings";
import { ICreateProperty } from "../validations/interfaces/properties.interface";
import { PropsApartmentStatus } from "@prisma/client";

interface PropertyFilters {
    landlordId?: string;
    property?: {
        state?: string;
        country?: string;
        isActive?: boolean;
        specificationType?: string;
        propertysize?: number;
        type?: PropertyType;
    };
    minSize?: number;
    maxSize?: number;
}

class PropertyService {
    createProperty = async (propertyData: ICreateProperty) => {
        return await prismaClient.properties.create({
            data: {
                ...propertyData,
            }
        })
    }

    getProperties = async () => {
        return await prismaClient.properties.findMany({ where: { isDeleted: false }, })
    }
    getLandlordProperties = async (landlordId: string) => {
        return await prismaClient.properties.findMany({ 
            where: { isDeleted: false, landlordId },
            include: {
                propertyListingHistory: true,
                apartments: true,
            }
        })
    }
    getPropertiesById = async (id: string) => {
        return await prismaClient.properties.findUnique({
            where: { id },
        });
    }

    updateProperty = async (id: string, data: any) => {
        return await prismaClient.properties.update({
            where: { id },
            data
        });
    }
    deleteProperty = async (landlordId: string, id: string) => {
        return await prismaClient.properties.update({
            where: { id, landlordId },
            data: { isDeleted: true }
        });
    }
    updateAvailabiltyStatus = async (landlordId: string, id: string, availability: PropsApartmentStatus) => {
        return await prismaClient.properties.update({
            where: { id, landlordId },
            data: { availability }
        });
    }

    // Function to aggregate properties by state for the current landlord
    aggregatePropertiesByState = async (landlordId: string) => {
        // Group properties by state for the current landlord
        const groupedProperties = await prismaClient.properties.groupBy({
            by: ['state'],
            where: {
                landlordId, // Filter by the current landlordId
            },
        });

        // Object to store the grouped properties by state
        const propertiesByState = {};

        // Loop through each state group and fetch properties with apartments for that state
        for (const group of groupedProperties) {
            const state = group.state;

            // Fetch properties belonging to the current state and landlord, including apartments
            const properties = await prismaClient.properties.findMany({
                where: {
                    state,
                    landlordId,
                },
                include: {
                    apartments: true,
                },
            });

            // Store the properties in the result object under the respective state
            propertiesByState[state] = properties;
        }

        return propertiesByState;
    }
    // Function to aggregate properties by state for the current landlord
    getPropertiesByLandlord = async (landlordId: string) => {
        // Group properties by state for the current landlord
        const unGroundProps = await prismaClient.properties.findMany({
            where: {
                landlordId,
            },
        });
        return unGroundProps
    }
    // Function to aggregate properties by state for the current landlord
    getPropertiesByState = async () => {
        // Group properties by state for the current landlord
        const groupedProperties = await prismaClient.properties.groupBy({
            by: ['state'],
        });

        // Object to store the grouped properties by state
        const propertiesByState = {};

        // Loop through each state group and fetch properties with apartments for that state
        for (const group of groupedProperties) {
            const state = group.state;

            // Fetch properties belonging to the current state and landlord, including apartments
            const properties = await prismaClient.properties.findMany({
                where: {
                    state,
                },
                include: {
                    apartments: true,
                },
            });

            // Store the properties in the result object under the respective state
            propertiesByState[state] = properties;
        }

        return propertiesByState;
    }
    showCaseRentals = async (propertyId: string, landlordId: string) => {
        return await prismaClient.properties.update({
            where: {
                landlordId,
                id: propertyId,
            },
            data: {
                showCase: true
            }
        })
    }
    getShowCasedRentals = async (landlordId: string) => {
        return await prismaClient.properties.findMany({
            where: {
                landlordId,
                showCase: true
            }
        })
    }
    

    checkLandlordPropertyExist = async (landlordId: string, propertyId: string) => {

        return await prismaClient.properties.findFirst({
            where: {
                landlordId,
                id: propertyId
            }
        })
    }

    getPropertyExpenses = async (landlordId: string, propertyId: string) => {
        return await prismaClient.maintenance.findMany({
            where: {
                landlordId,
                propertyId,
            }
        })
    }
    getPropertyGlobalFees = async (landlordId: string, settingType: PropsSettingType) => {
        return await prismaClient.propApartmentSettings.findFirst({
            where: {
                landlordId,
                settingType
            }
        })
    }
    // property listings
    getActiveOrInactivePropsListing= async (landlordId: string, isActive: boolean = true ) => {
        return await prismaClient.propertyListingHistory.findMany({
            where: {
                isActive,
                property:{
                    landlordId
                }
            },
            include: {
                property: true,
                apartment: true,
            }
        });
    }
    getAllListedProperties = async (filters: PropertyFilters = {}) => {
        const { landlordId, property, minSize, maxSize } = filters;
        const { type, state, country, specificationType, isActive } = property || {};
    
        return await prismaClient.propertyListingHistory.findMany({
            where: {
                ...(isActive !== undefined && { isActive }),
                ...(isActive !== undefined && { onListing: isActive }),
                property: {
                    ...(landlordId && { landlordId }),
                    ...(type && { type }),
                    ...(specificationType && { specificationType }),
                    ...(state && { state }),
                    ...(country && { country }),
                    ...(minSize || maxSize
                        ? {
                            propertysize: {
                                gte: minSize ?? undefined,
                                lte: maxSize ?? undefined,
                            },
                        }
                        : {}),
                } as any,
            },
            include: {
                property: true,
                apartment: true,
            },
        });
    };
    
    
    

    createPropertyListing = async (data: PropertyListingDTO) => {
        const propListed = await this.getPropsListedById(data.propertyId);
        if (propListed) throw new Error(`The props with ID ${data.propertyId} have been listed`);
        return await prismaClient.propertyListingHistory.create({
            data,
        });
    };
    getPropsListedById = async (propertyId: string) => {
        const propsListed = await prismaClient.propertyListingHistory.findFirst({
            where: {
                propertyId
            },
            include: {
                property: true,
                apartment: true,
            }
        });
        
        return propsListed
    }
    // to update property listings
    updatePropertyListing = async (data: Partial<PropertyListingDTO>, propertyId: string, landlordId: string) => {
        const propsListed = await this.getPropsListedById(propertyId);
        if (!propsListed) throw new Error(`The props with ID ${propertyId} have not been listed`);
        if (propsListed?.property?.landlordId !== landlordId) {
            throw new Error("only landlord that created this props listing can update props listing");
        }

        return await prismaClient.propertyListingHistory.update({
            where: { propertyId },
            data,
        });
    }
    // to update property to listing and not listing 
    updateListingStatus = async (propertyId: string) => {
        const propsListed = await this.getPropsListedById(propertyId);
        if (!propsListed) throw new Error(`The props with ID ${propertyId} have not been listed`);
        return await prismaClient.propertyListingHistory.update({
            where: { propertyId },
            data: { onListing: false },
        });
    }
    // to update property to listing and not listing
    getPropertyById = async (propertyId: string) => {
        return await prismaClient.properties.findFirst({
            where: { id: propertyId },
            include: {
                landlord: true,
                reviews: true,
                applicant: true,
            }
        });
    }

}


export default new PropertyService()