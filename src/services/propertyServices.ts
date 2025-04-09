import { prismaClient } from "..";
import { PropertyType, ShortletType, PropsSettingType } from "@prisma/client"
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

class PropertyService {

    landlordInclusion: any
    propsInclusion: any

    constructor() {
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
            apartments: true,
            state: true,
            applicant: true,
            reviews: true,
            UserLikedProperty: true,
            landlord: this.landlordInclusion
        }
    }
    createProperty = async (propertyData: ICreateProperty) => {
        return await prismaClient.properties.create({
            data: {
                ...propertyData,
            }
        })
    }

    getProperties = async () => {
        return await prismaClient.properties.findMany({
            where: { isDeleted: false },
            include: {
                ...this.propsInclusion
            }
        })
    }

    getLandlordProperties = async (landlordId: string) => {
        return await prismaClient.properties.findMany({
            where: { isDeleted: false, landlordId },
            include: {
                ...this.propsInclusion
            }
        })
    }
    getPropertiesById = async (id: string) => {
        return await prismaClient.properties.findUnique({
            where: { id },
            include: {
                apartments: true,
                state: true,
                applicant: true,
                reviews: true,
                UserLikedProperty: true,
                landlord: this.landlordInclusion,
            }
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
            data: { isDeleted: true },
            include: {
                ...this.propsInclusion
            }
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
        try {
            // Group properties by stateId for the current landlord
            const groupedProperties = await prismaClient.properties.groupBy({
                by: ['stateId'], // Group by stateId instead of state name
                where: {
                    landlordId, // Filter by the current landlordId
                    isDeleted: false, // Exclude deleted properties
                },
            });

            // Object to store the grouped properties by state
            const propertiesByState: { [key: string]: any[] } = {};

            // Loop through each state group and fetch properties with apartments for that state
            for (const group of groupedProperties) {
                const stateId = group.stateId;

                if (!stateId) continue; // Skip if stateId is null or undefined

                // Fetch the state details
                const state = await prismaClient.state.findUnique({
                    where: { id: stateId },
                });

                if (!state) continue; // Skip if state is not found

                // Fetch properties belonging to the current state and landlord, including apartments
                const properties = await prismaClient.properties.findMany({
                    where: {
                        stateId: stateId,
                        landlordId: landlordId,
                        isDeleted: false, // Exclude deleted properties
                    },
                    include: {
                        ...this.propsInclusion
                    },
                });

                // Store the properties in the result object under the respective state name
                propertiesByState[state.name.toLowerCase()] = properties;
            }

            return propertiesByState;
        } catch (error) {
            console.error('Error in aggregatePropertiesByState:', error);
            throw error; // or handle it as per your application's needs
        }
    }
    // Function to aggregate properties by state for the current landlord
    getPropertiesByLandlord = async (landlordId: string) => {
        // Group properties by state for the current landlord
        const unGroundProps = await prismaClient.properties.findMany({
            where: {
                landlordId,
            },
            include: {
                ...this.propsInclusion
            }
        });
        return unGroundProps
    }


    // Function to aggregate properties by state for the current landlord
    getPropertiesByState = async () => {
        try {
            // Group properties by state for the current landlord
            const groupedProperties = await prismaClient.properties.groupBy({
                by: ['stateId'], // Group by stateId instead of state name
                where: {
                    // landlordId: landlordId, 
                    isDeleted: false, // Exclude deleted properties
                },

            });

            // Object to store the grouped properties by state
            const propertiesByState: { [key: string]: any[] } = {};

            // Loop through each state group and fetch properties with apartments for that state
            for (const group of groupedProperties) {
                const stateId = group.stateId;

                if (!stateId) continue; // Skip if stateId is null or undefined

                // Fetch the state details
                const state = await prismaClient.state.findUnique({
                    where: { id: stateId },
                });

                if (!state) continue; // Skip if state is not found

                // Fetch properties belonging to the current state and landlord, including apartments
                const properties = await prismaClient.properties.findMany({
                    where: {
                        stateId: stateId,
                        // landlordId: landlordId,
                        isDeleted: false, // Exclude deleted properties
                    },
                    include: {
                        ...this.propsInclusion
                    },
                });

                // Store the properties in the result object under the respective state name
                propertiesByState[state.name.toLowerCase()] = properties;
            }

            return propertiesByState;
        } catch (error) {
            console.error('Error in getPropertiesByState:', error);
            throw error; // or handle it as per your application's needs
        }
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
            },
            include: {
                state: true
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
    getActiveOrInactivePropsListing = async (landlordId: string, isActive: boolean = true) => {
        return await prismaClient.propertyListingHistory.findMany({
            where: {
                isActive,
                property: {
                    landlordId
                }
            },
            include: {
                property: {
                    include:{
                        ...this.propsInclusion
                    }
                },
                apartment: true,
            }
        });
    }


    countListedProperties = async (filters: PropertyFilters = {}) => {
        const {
            landlordId,
            property,
            minSize,
            maxSize,
            isShortlet,
            dueDate,
            yearBuilt,
            zipcode,
            amenities,
            mustHaves
        } = filters;

        const {
            type,
            state,
            country,
            specificationType,
            isActive,
            rentalFee,
            maxBedRoom,
            minBedRoom,
            maxBathRoom,
            minBathRoom,
            maxRentalFee,
            minRentalFee,
            marketValue,
            noKitchen,
            minGarage,
            maxGarage
        } = property || {};

        return await prismaClient.propertyListingHistory.count({
            where: {
                ...(isActive !== undefined && { isActive }),
                ...(isActive !== undefined && { onListing: isActive }),
                property: {
                    ...(landlordId && { landlordId }),
                    // Modified type filter
                    ...(type && {
                        type: {
                            in: Array.isArray(type) ? type : [type]
                        }
                    }),
                    ...(specificationType && { specificationType }),
                    ...(state && {
                        state: {
                            is: {
                                name: {
                                    equals: state.toLowerCase().trim(),
                                    mode: 'insensitive'
                                }
                            }
                        }
                    }),
                    ...(country && { country }),
                    ...(marketValue && { marketValue: Number(marketValue) }),
                    ...(rentalFee && { rentalFee: Number(rentalFee) }),
                    ...(minRentalFee || maxRentalFee
                        ? {
                            rentalFee: {
                                gte: minRentalFee ?? undefined,
                                lte: maxRentalFee ?? undefined,
                            },
                        }
                        : {}),
                    ...(maxBedRoom || minBedRoom
                        ? {
                            noBedRoom: {
                                gte: minBedRoom ?? undefined,
                                lte: maxBedRoom ?? undefined,
                            },
                        }
                        : {}),
                    ...(maxBathRoom || minBathRoom
                        ? {
                            noBathRoom: {
                                gte: minBathRoom ?? undefined,
                                lte: maxBathRoom ?? undefined,
                            },
                        }
                        : {}),
                    ...(minGarage || maxGarage
                        ? {
                            noGarage: {
                                gte: minGarage ?? undefined,
                                lte: maxGarage ?? undefined,
                            },
                        }
                        : {}),
                    ...(noKitchen && { noKitchen: Number(noKitchen) }),
                    ...(zipcode && { zipcode }),
                    ...(isShortlet !== undefined && { isShortlet }),
                    // ...(shortletDuration && { shortletDuration: Number(shortletDuration) }),
                    ...(dueDate && { dueDate: new Date(dueDate.toString()) }),
                    ...(yearBuilt && { yearBuilt: new Date(yearBuilt.toString()) }),
                    ...(minSize || maxSize
                        ? {
                            propertysize: {
                                gte: minSize ?? undefined,
                                lte: maxSize ?? undefined,
                            },
                        }
                        : {}),
                    ...(amenities && amenities.length > 0 ? { amenities: { hasSome: amenities } } : {}),
                    ...(mustHaves && mustHaves.length > 0
                        ? {
                            OR: mustHaves.map(mh => ({
                                amenities: {
                                    has: mh
                                }
                            }))
                        }
                        : {}),
                } as any,
            },
        });
    };


    getAllListedProperties = async (filters: PropertyFilters = {}, skip: number = 0, take: number = 10) => {
        const {
            landlordId,
            property,
            minSize,
            maxSize,
            isShortlet,
            dueDate,
            yearBuilt,
            zipcode,
            amenities,
            mustHaves
        } = filters;

        const {
            type,
            state,
            country,
            specificationType,
            isActive,
            rentalFee,
            maxBedRoom,
            minBedRoom,
            maxBathRoom,
            minBathRoom,
            maxRentalFee,
            minRentalFee,
            marketValue,
            noKitchen,
            minGarage,
            maxGarage
        } = property || {};

        // console.log("=================")
        // console.log(property)
        // console.log(filters)
        // console.log("=================")

        return await prismaClient.propertyListingHistory.findMany({
            where: {
                ...(isActive !== undefined && { isActive }),
                ...(isActive !== undefined && { onListing: isActive }),
                property: {
                    ...(landlordId && { landlordId }),
                    // Modified type filter
                    ...(type && {
                        type: {
                            in: Array.isArray(type) ? type : [type]
                        }
                    }),
                    ...(specificationType && { specificationType }),
                    ...(state && {
                        state: {
                            is: {
                                name: state
                            }
                        }
                    }),
                    ...(country && { country }),
                    ...(marketValue && { marketValue: Number(marketValue) }),
                    ...(rentalFee && { rentalFee: Number(rentalFee) }),
                    ...(minRentalFee || maxRentalFee
                        ? {
                            rentalFee: {
                                gte: minRentalFee ?? undefined,
                                lte: maxRentalFee ?? undefined,
                            },
                        }
                        : {}),
                    ...(maxBedRoom || minBedRoom
                        ? {
                            noBedRoom: {
                                gte: minBedRoom ?? undefined,
                                lte: maxBedRoom ?? undefined,
                            },
                        }
                        : {}),
                    ...(maxBathRoom || minBathRoom
                        ? {
                            noBathRoom: {
                                gte: minBathRoom ?? undefined,
                                lte: maxBathRoom ?? undefined,
                            },
                        }
                        : {}),
                    ...(minGarage || maxGarage
                        ? {
                            noGarage: {
                                gte: minGarage ?? undefined,
                                lte: maxGarage ?? undefined,
                            },
                        }
                        : {}),
                    ...(noKitchen && { noKitchen: Number(noKitchen) }),
                    ...(zipcode && { zipcode }),
                    ...(isShortlet !== undefined && { isShortlet }),
                    // ...(shortletDuration && { shortletDuration: Number(shortletDuration) }),
                    ...(dueDate && { dueDate: new Date(dueDate.toString()) }),
                    ...(yearBuilt && { yearBuilt: new Date(yearBuilt.toString()) }),
                    ...(minSize || maxSize
                        ? {
                            propertysize: {
                                gte: minSize ?? undefined,
                                lte: maxSize ?? undefined,
                            },
                        }
                        : {}),
                    ...(amenities && amenities.length > 0 ? { amenities: { hasSome: amenities } } : {}),
                    ...(mustHaves && mustHaves.length > 0
                        ? {
                            OR: mustHaves.map(mh => ({
                                amenities: {
                                    has: mh
                                }
                            }))
                        }
                        : {}),




                } as any,
            },
            include: {
                property: {
                    include: {
                        apartments: true,
                        state: true,
                        applicant: true,
                        reviews: true,
                        UserLikedProperty: true,
                        landlord: this.landlordInclusion,
                    },
                },
                apartment: true,
            },
            skip,
            take,
        });
    };
    createPropertyListing = async (data: PropertyListingDTO) => {
        const propListed = await this.getPropsListedById(data.propertyId);
        if (propListed) throw new Error(`The props with ID ${data.propertyId} have been listed`);
        return await prismaClient.propertyListingHistory.create({
            data,
        });
    };
    deletePropertyListing = async (propertyId:string) => {
        const propListed = await this.getPropsListedById(propertyId);
        if (propListed) throw new Error(`The props with ID ${propertyId} have been listed`);
        return await prismaClient.propertyListingHistory.delete({
            where:{propertyId}
        });
    };

    getPropsListedById = async (propertyId: string) => {
        const propsListed = await prismaClient.propertyListingHistory.findFirst({
            where: {
                propertyId
            },
            include: {
                property: {
                    include:{
                        ...this.propsInclusion
                    }
                },
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
                ...this.propsInclusion
            }
        });
    }
    getPropertiesWithoutTenants = async (landlordId: string) => {
        // Fetch all properties where there are no tenants associated
        const properties = await prismaClient.properties.findMany({
            where: {
                landlordId,
                tenants: {
                    none: {}
                },
            },
            include: {
                tenants: true,
            },
        });

        return properties;
    }
    getPropertiesAttachedToTenants = async (tenantId: string) => {
        return await prismaClient.properties.findFirst({
            where: {
                tenants: {
                    some: { id: tenantId },
                },
            }
        });
    }

    getUniquePropertiesBaseLandlordNameState = async (landlordId: string, name: string, stateId: string, city: string) => {
        const properties = await prismaClient.properties.findMany({
            where: {
                landlordId,
                name: { mode: "insensitive", equals: name },
                stateId,
                city: { mode: "insensitive", equals: city }
            }
        });
        // Return true if at least one record exists, otherwise false
        return properties.length > 0;
    };

    // property liking 
    getLikeHistories = async (userId: string) => {
        return await prismaClient.userLikedProperty.findMany({
            where: {
                userId,
            },
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
                property: true
            },
        });
    }
    getLikeHistory = async (userId: string, propertyId: string) => {
        return await prismaClient.userLikedProperty.findUnique({
            where: {
                userId_propertyId: {
                    userId,
                    propertyId,
                },
            },
        });
    }
    createLikeHistory = async (userId: string, propertyId: string) => {
        return await prismaClient.userLikedProperty.create({
            data: {
                userId,
                propertyId,
            },
        });
    }
}

export default new PropertyService()