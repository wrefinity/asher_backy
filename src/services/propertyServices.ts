import { ListingType, PropertyFeatureType, Prisma, PropertySpecificationType, PrismaClient } from "@prisma/client";
import { prismaClient } from "..";
import { PropertyType, MediaType, PropsSettingType } from "@prisma/client"
// PropertyL
import { AvailabilityStatus } from "@prisma/client";
import { AdditionalRule, Booking, ICommercialDTO, IResidentialDTO, PropertyFeature, SeasonalPricing, IShortletDTO, UnavailableDate, ICreateProperty, IPropertySpecificationDTO, IBasePropertyDTO } from "../validations/interfaces/properties.interface";
import { PropertyListingDTO } from "../landlord/validations/interfaces/propsSettings"

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
    specificationInclusion: any

    constructor() {

        this.specificationInclusion = {
            include: {
                residential: {
                    include: {
                        outdoorsSpacesFeatures: true,
                        buildingAmenityFeatures: true,
                        safetyFeatures: true,
                        unitConfigurations: true,
                        sharedFacilities: true,
                        bills: true,
                    }
                },
                commercial: {
                    include: {
                        floorAvailability: true,
                        safetyFeatures: true,
                        unitConfigurations: true,
                        suitableFor: true,
                        roomDetails: true,
                        sharedFacilities: true,
                    }
                },
                shortlet: {
                    include: {
                        outdoorsSpacesFeatures: true,
                        buildingAmenityFeatures: true,
                        safetyFeatures: true,
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
            application: true,
            reviews: true,
            UserLikedProperty: true,
            landlord: this.landlordInclusion,
            specification: this.specificationInclusion
        }
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
    getPropertyOnUserPreference = async (userPreferenceTypes: PropertyType[], landlordId:string) => {
        return await prismaClient.properties.findMany({
            where: {
                availability: AvailabilityStatus.VACANT,
                propertyListingHistory: {
                    some: {
                        isActive: true,
                        onListing: true,
                        propertySubType: {
                            in: userPreferenceTypes,
                        },
                        property:{
                            landlordId
                        }
                    },
                },
            },
            include: {
                propertyListingHistory: true,
                state: true,
                landlord: true,
                images: true,
            },
        });
    }
    
    getPropertiesById = async (id: string) => {
        return await prismaClient.properties.findUnique({
            where: { id },
            include: {

                state: true,
                specification: this.specificationInclusion,
                agency: true,
                application: true,
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
    updateAvailabiltyStatus = async (landlordId: string, id: string, availability: AvailabilityStatus) => {
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
        return await prismaClient.propertySettings.findFirst({
            where: {
                landlordId,
                settingType
            }
        })
    }
    // property listings
    getActiveOrInactivePropsListing = async (landlordId: string, isActive: boolean = true, availability: AvailabilityStatus = AvailabilityStatus.VACANT) => {
        return await prismaClient.propertyListingHistory.findMany({
            where: {
                isActive,
                onListing: isActive,
                property: {
                    landlordId,
                    availability
                }
            },
            include: {
                property: {
                    include: {
                        ...this.propsInclusion
                    }
                },
            }
        });
    }


    countListedProperties = async (filters: PropertyFilters = {}, availability: boolean = true) => {
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
                    ...(availability && { availability: AvailabilityStatus.VACANT }),
                    ...(country && { country }),
                    ...(marketValue && { marketValue: Number(marketValue) }),
                    ...(rentalFee && { price: Number(rentalFee) }),
                    ...(minRentalFee || maxRentalFee
                        ? {
                            price: {
                                gte: minRentalFee ?? undefined,
                                lte: maxRentalFee ?? undefined,
                            },
                        }
                        : {}),
                    // ...(maxBedRoom || minBedRoom
                    //     ? {
                    //         noBedRoom: {
                    //             gte: minBedRoom ?? undefined,
                    //             lte: maxBedRoom ?? undefined,
                    //         },
                    //     }
                    //     : {}),
                    // ...(maxBathRoom || minBathRoom
                    //     ? {
                    //         noBathRoom: {
                    //             gte: minBathRoom ?? undefined,
                    //             lte: maxBathRoom ?? undefined,
                    //         },
                    //     }
                    //     : {}),
                    // ...(minGarage || maxGarage
                    //     ? {
                    //         noGarage: {
                    //             gte: minGarage ?? undefined,
                    //             lte: maxGarage ?? undefined,
                    //         },
                    //     }
                    //     : {}),
                    // ...(noKitchen && { noKitchen: Number(noKitchen) }),
                    ...(zipcode && { zipcode }),
                    // ...(isShortlet !== undefined && { isShortlet }),
                    // ...(shortletDuration && { shortletDuration: Number(shortletDuration) }),
                    // ...(dueDate && { dueDate: new Date(dueDate.toString()) }),
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


    getAllListedProperties = async (filters: PropertyFilters = {}, skip: number = 0, take: number = 10, availability: boolean = true) => {
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
        return await prismaClient.propertyListingHistory.findMany({
            where: {
                ...(isActive !== undefined && { isActive }),
                ...(isActive !== undefined && { onListing: isActive }),
                property: {
                    ...(landlordId && { landlordId }),
                    // Modified type filter
                    // ...(type && {
                    //     type: {
                    //         in: Array.isArray(type) ? type : [type]
                    //     }
                    // }),
                    ...(availability && { availability: AvailabilityStatus.VACANT }),
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
                    ...(rentalFee && { price: Number(rentalFee) }),
                    ...(minRentalFee || maxRentalFee
                        ? {
                            price: {
                                gte: minRentalFee ?? undefined,
                                lte: maxRentalFee ?? undefined,
                            },
                        }
                        : {}),
                    // ...(maxBedRoom || minBedRoom
                    //     ? {
                    //         noBedRoom: {
                    //             gte: minBedRoom ?? undefined,
                    //             lte: maxBedRoom ?? undefined,
                    //         },
                    //     }
                    //     : {}),
                    // ...(maxBathRoom || minBathRoom
                    //     ? {
                    //         noBathRoom: {
                    //             gte: minBathRoom ?? undefined,
                    //             lte: maxBathRoom ?? undefined,
                    //         },
                    //     }
                    //     : {}),
                    // ...(minGarage || maxGarage
                    //     ? {
                    //         noGarage: {
                    //             gte: minGarage ?? undefined,
                    //             lte: maxGarage ?? undefined,
                    //         },
                    //     }
                    //     : {}),
                    // ...(noKitchen && { noKitchen: Number(noKitchen) }),
                    ...(zipcode && { zipcode }),
                    // ...(isShortlet !== undefined && { isShortlet }),
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
                        state: true,
                        application: true,
                        reviews: true,
                        UserLikedProperty: true,
                        landlord: this.landlordInclusion,
                        specification: this.specificationInclusion,
                    },
                },
            },
            skip,
            take,
        });
    };
    createPropertyListing = async (data: PropertyListingDTO | any) => {
        const propListed = await this.getPropsListedById(data.propertyId);
        if (propListed) throw new Error(`The props with ID ${data.propertyId} have been listed`);
        return await prismaClient.propertyListingHistory.create({
            data,
        });
    };

    deletePropertyListing = async (propertyId: string) => {
        const lastListed = await this.getPropsListedById(propertyId);
        if (!lastListed) {
            throw new Error(`No listing history found for property ID ${propertyId}`);
        }

        return await prismaClient.propertyListingHistory.update({
            where: { id: lastListed.id },
            data: {
                onListing: false,
                isActive: false,
            },
        });
    };

    delistPropertyListing = async (propertyId: string) => {
        const lastListed = await this.getPropsListedById(propertyId);
        if (!lastListed) {
            throw new Error(`No listing history found for property ID ${propertyId}`);
        }

        return await prismaClient.propertyListingHistory.update({
            where: { id: lastListed.id },
            data: {
                onListing: false,
            },
        });
    };


    getPropsListedById = async (propertyId: string) => {
        const propsListed = await prismaClient.propertyListingHistory.findFirst({
            where: {
                propertyId
            },
            include: {
                property: {
                    include: {
                        ...this.propsInclusion
                    }
                }
            },
            orderBy: { createdAt: "desc" }
        });

        return propsListed
    }
    // to update property listings
    updatePropertyListing = async (data: Partial<PropertyListingDTO | any>, propertyId: string, landlordId: string) => {
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
                property: this.propsInclusion
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

    async createPropertyFeature(data: PropertyFeature[] | any) {
        return await prismaClient.propertyFeatures.createMany({
            data,
            skipDuplicates: true
        });
    }
    async getPropertyFeature() {
        return await prismaClient.propertyFeatures.findMany();
    }
    async getPropertyFeaturesByIds(featureIds: string[]): Promise<string[]> {
        if (!featureIds || featureIds.length === 0) {
            return [];
        }

        const existingFeatures = await prismaClient.propertyFeatures.findMany({
            where: {
                id: { in: featureIds },
            },
            select: { id: true },
        });

        const existingFeatureIds = existingFeatures.map((f) => f.id);

        const missingFeatureIds = featureIds.filter((id) => !existingFeatureIds.includes(id));

        if (missingFeatureIds.length > 0) {
            throw new Error(`The following feature IDs do not exist: ${missingFeatureIds.join(", ")}`);
        }

        return existingFeatureIds;
    }


    // async ensurePropertyIsNotLinked(propertyId: string): Promise<void> {
    //     const [residential, commercial, shortlet] = await Promise.all([
    //         prismaClient.residentialProperty.findUnique({ where: { propertyId } }),
    //         prismaClient.commercialProperty.findUnique({ where: { propertyId } }),
    //         prismaClient.shortletProperty.findUnique({ where: { propertyId } }),
    //     ]);

    //     if (residential) {
    //         throw new Error(`Property with ID ${propertyId} is already linked to a residential property.`);
    //     }

    //     if (commercial) {
    //         throw new Error(`Property with ID ${propertyId} is already linked to a commercial property.`);
    //     }

    //     if (shortlet) {
    //         throw new Error(`Property with ID ${propertyId} is already linked to a shortlet property.`);
    //     }
    // }


    async createProperties(data: IBasePropertyDTO, specification: IPropertySpecificationDTO, uploadedFiles?: any[], userId?: string) {
        const { shortlet, specificationType, residential, commercial } = specification;

        return prismaClient.$transaction(async (tx) => {
            const { agencyId, landlordId, stateId, keyFeatures, ...rest } = data;

            if (!landlordId || !stateId) {
                throw new Error("Missing required fields: landlordId or stateId.");
            }
            if (!specificationType) {
                throw new Error("Specification type is required.");
            }

            // Check if the key features exist
            const keyFeatureIds = await this.getPropertyFeaturesByIds(keyFeatures);
            if (keyFeatureIds.length !== keyFeatures.length) {
                throw new Error(`Some key amentities features do not exist.`);
            }

            // Separate media by type
            const images = uploadedFiles?.filter(file => file?.identifier === 'MediaTable' && file?.type === MediaType.IMAGE);
            const videos = uploadedFiles?.filter(file => file?.identifier === 'MediaTable' && file?.type === MediaType.VIDEO);
            const virtualTours = uploadedFiles?.filter(file => file?.identifier === 'MediaTable' && file?.type === MediaType.VIRTUAL_TOUR);
            const documents = uploadedFiles?.filter(file => file?.identifier === 'DocTable');

            // Create the main property
            const property = await tx.properties.create({
                data: {
                    ...rest,
                    keyFeatures: {
                        connect: keyFeatureIds.map((id) => ({ id })),
                    },
                    specificationType,
                    landlord: { connect: { id: landlordId } },
                    agency: agencyId ? { connect: { id: agencyId } } : undefined,
                    state: { connect: { id: stateId } },
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
                    videos: {
                        create: videos?.map(vid => ({
                            type: vid.type,
                            size: vid.size,
                            fileType: vid.fileType,
                            url: vid.url,
                            isPrimary: vid.isPrimary,
                            caption: vid.caption,
                        }))
                    },
                    virtualTours: {
                        create: virtualTours?.map(vt => ({
                            type: vt.type,
                            size: vt.size,
                            fileType: vt.fileType,
                            url: vt.url,
                            isPrimary: vt.isPrimary,
                            caption: vt.caption,
                        }))
                    },
                    propertyDocument: {
                        create: documents?.map(doc => ({
                            documentName: doc?.documentName,
                            documentUrl: doc?.documentUrl,
                            size: doc?.size,
                            type: doc?.type,
                            idType: doc?.idType,
                            docType: doc?.docType,
                            users: {
                                connect: { id: userId }
                            }
                        }))
                    },
                }
            });

            if (!property) {
                throw new Error(`Failed to create property`);
            }

            // Step 2: Create associated specification
            switch (specificationType) {
                case PropertySpecificationType.RESIDENTIAL:
                    await this.createResidentialProperty(property.id, residential, tx, specification);
                    break;
                case PropertySpecificationType.COMMERCIAL:
                    await this.createCommercialProperty(property.id, commercial, tx, specification);
                    break;
                case PropertySpecificationType.SHORTLET:
                    await this.createShortletProperty(property.id, shortlet, tx, specification);
                    break;
                default:
                    throw new Error(`Unknown specification type: ${specificationType}`);
            }

            // Step 3: Create Listing History
            // await tx.propertyListingHistory.create({
            //     data: {
            //         propertyId: property.id,
            //         onListing: true,
            //         type: 'LISTING_WEBSITE'
            //     }
            // });



            // Step 4: Return full property with related entities
            return tx.properties.findUnique({
                where: { id: property.id },
                include: {
                    specification: this.specificationInclusion,
                    images: true,
                    videos: true,
                    virtualTours: true,
                    propertyDocument: true,
                }
            });
        }, {
            maxWait: 30000, // Maximum time to wait for transaction to start (10 seconds)
            timeout: 30000 // Maximum time for transaction to complete (10 seconds)
        });
    }


    async createResidentialProperty(propertyId: string, data: IResidentialDTO | any, tx: any, specification: IPropertySpecificationDTO) {
        const {
            outdoorsSpacesFeatures: outdoorFeatureIds,
            safetyFeatures: safetyFeatureIdx,
            bills,
            buildingAmenityFeatures: buildingAmenityFeaturesIds,
            roomDetails,
            sharedFacilities,
            unitConfiguration,
            ...rest } = data;


        // Step 1: Verify property exists
        const property = await tx.properties.findUnique({
            where: { id: propertyId }
        });
        if (!property) throw new Error(`Property ${propertyId} not found`);


        // Step 2: Check if the key features exist
        const outdoorsFeatures = await this.getPropertyFeaturesByIds(outdoorFeatureIds);
        if (outdoorsFeatures.length !== outdoorFeatureIds.length) {
            throw new Error(`Some outdoors features do not exist.`);
        }
        // Check if the building amenity features exist
        const BAFeaturesIds = await this.getPropertyFeaturesByIds(buildingAmenityFeaturesIds);
        if (BAFeaturesIds.length !== buildingAmenityFeaturesIds.length) {
            throw new Error(`Some building amentities features do not exist.`);
        }
        // Step 2: Check if the safety features exist
        const safetyFeatureIds = await this.getPropertyFeaturesByIds(safetyFeatureIdx);
        if (safetyFeatureIds.length !== safetyFeatureIdx.length) {
            throw new Error(`Some safety amentities features do not exist.`);
        }

        console.log("============shared============")
        console.log(outdoorsFeatures)
        console.log("============shared============")


        // Step 4: Proceed with creation
        const residential = await tx.residentialProperty.create({
            data: {
                ...rest,
                outdoorsSpacesFeatures: {
                    connect: outdoorsFeatures?.length ? outdoorsFeatures.map((id) => ({ id })) : undefined
                },
                buildingAmenityFeatures: {
                    connect: BAFeaturesIds?.length ? BAFeaturesIds?.map((id) => ({ id })) : undefined,
                },
                safetyFeatures: {
                    connect: safetyFeatureIds?.length ? safetyFeatureIds?.map((id) => ({ id })) : undefined,
                },
                bills: {
                    connect: bills?.length ? bills?.map((id) => ({ id })) : undefined,
                },
                roomDetails: {
                    create: roomDetails?.map((room: any) => ({
                        roomName: room.roomName,
                        roomSize: room.roomSize,
                        ensuite: room.ensuite,
                        price: room.price,
                    })) || [],
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
                    },
                },
                unitConfigurations: {
                    create: unitConfiguration?.map((unit: any) => ({
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
                    })) || [],
                },
            },
        });
        return await tx.propertySpecification.create({
            data: {
                property: {
                    connect: { id: property.id }
                },
                specificationType: PropertySpecificationType.RESIDENTIAL,
                residential: { connect: { id: residential.id } },
                propertySubType: specification.propertySubType,
                otherTypeSpecific: specification?.otherTypeSpecific
            }
        });
    }

    async createCommercialProperty(propertyId: string, data: ICommercialDTO | any, tx: any, specification: IPropertySpecificationDTO) {
        const { safetyFeatures: safFeatureIdx, securityFeatures: secFeatureIdx, floorAvailability, roomDetails, unitConfiguration, suitableFor, sharedFacilities, ...rest } = data;

        const property = await tx.properties.findUnique({
            where: { id: propertyId }
        });
        if (!property) throw new Error(`Property ${propertyId} not found`);

        const safFeatures = await this.getPropertyFeaturesByIds(safFeatureIdx);
        if (safFeatures.length !== safFeatureIdx.length) {
            throw new Error(`Some safety features do not exist.`);
        }
        const secFeatures = await this.getPropertyFeaturesByIds(secFeatureIdx);
        if (secFeatures.length !== secFeatureIdx.length) {
            throw new Error(`Some security features do not exist.`);
        }

        // Proceed with creation
        const commercial = await tx.commercialProperty.create({
            data: {
                ...rest,
                securityFeatures: {
                    connect: secFeatures?.length ? secFeatures.map((id) => ({ id })) : undefined,
                },
                safetyFeatures: {
                    connect: safFeatures?.length ? safFeatures.map((id) => ({ id })) : undefined,
                },
                floorAvailability: {
                    create: floorAvailability?.map((floor: any) => ({
                        floorNumber: floor.floorNumber,
                        area: floor.area,
                        price: floor.price,
                        available: floor.available,
                        partialFloor: floor.partialFloor,
                        description: floor.description,
                        amenities: {
                            connect: floor?.amenities?.length ? floor?.amenities.map((id) => ({ id })) : undefined,
                        }
                    })) || [],
                },
                roomDetails: {
                    create: roomDetails?.map((room: any) => ({
                        roomName: room.roomName,
                        roomSize: room.roomSize,
                        ensuite: room.ensuite,
                        price: room.price,
                    })) || [],
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
                    },
                },
                suitableFor: {
                    create: suitableFor?.map((name: any) => ({
                        name: name
                    })) || [],
                },
                unitConfigurations: {
                    create: unitConfiguration?.map((unit: any) => ({
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
                    })) || [],
                },

            },
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

    async createShortletProperty(propertyId: string, data: IShortletDTO | any, tx: any, specification: IPropertySpecificationDTO) {
        const {
            safetyFeatures: safetyfeatureIds,
            buildingAmenityFeatures: BAFeatureIds,
            outdoorsSpacesFeatures: ODFeaturesId,
            hostLanguages,
            additionalRules, unavailableDates,
            seasonalPricing,
            sharedFacilities, roomDetails, ...rest } = data;

        // Step 1: Verify property exists
        const property = await tx.properties.findUnique({
            where: { id: propertyId }
        });
        if (!property) throw new Error(`Property ${propertyId} not found`);

        // Step 2: Check if the key features exist
        const safkeyFeatures = await this.getPropertyFeaturesByIds(safetyfeatureIds);
        if (safkeyFeatures.length !== safetyfeatureIds.length) {
            throw new Error(`Some safety features do not exist.`);
        }
        const outDoorFeaturesIds = await this.getPropertyFeaturesByIds(ODFeaturesId);
        if (outDoorFeaturesIds.length !== ODFeaturesId.length) {
            throw new Error(`Some outdoor features do not exist.`);
        }
        const buildingAmenityFeatureIds = await this.getPropertyFeaturesByIds(BAFeatureIds);
        if (buildingAmenityFeatureIds.length !== BAFeatureIds.length) {
            throw new Error(`Some bulding features do not exist.`);
        }

        // Proceed with creation
        const shortlet = await tx.shortletProperty.create({
            data: {
                ...rest,
                safetyFeatures: {
                    connect: safkeyFeatures?.length ? safkeyFeatures?.map((id) => ({ id })) : undefined,
                },
                outdoorsSpacesFeatures: {
                    connect: outDoorFeaturesIds?.length ? outDoorFeaturesIds?.map((id) => ({ id })) : undefined,
                },
                buildingAmenityFeatures: {
                    connect: buildingAmenityFeatureIds?.length ? buildingAmenityFeatureIds?.map((id) => ({ id })) : undefined,
                },
                roomDetails: {
                    create: roomDetails?.map((room: any) => ({
                        roomName: room.roomName,
                        roomSize: room.roomSize,
                        ensuite: room.ensuite,
                        price: room.price,
                    })) || [],
                },
                seasonalPricing: {
                    create: seasonalPricing?.map((season: any) => ({
                        seasonName: season.seasonName,
                        startDate: season.startDate,
                        endDate: season.endDate,
                        price: season.price,
                    })) || [],
                },
                unavailableDates: {
                    create: unavailableDates?.map((dt: any) => ({
                        date: dt
                    })) || [],
                },
                additionalRules: {
                    create: additionalRules?.map((r: any) => ({
                        rule: r
                    })) || [],
                },
                hostLanguages: {
                    create: hostLanguages?.map((lang: any) => ({
                        language: lang
                    })) || [],
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
                    },
                },
            },
        });
        return await tx.propertySpecification.create({
            data: {
                property: {
                    connect: { id: property.id }
                },
                specificationType: PropertySpecificationType.SHORTLET,
                shortlet: { connect: { id: shortlet.id } },
                propertySubType: specification.propertySubType,
                otherTypeSpecific: specification?.otherTypeSpecific
            }
        });
    }

    async createBooking(data: Booking) {
        const { shortletId, ...rest } = data;
        return await prismaClient.booking.create({
            data: {
                ...rest,
                property: {
                    connect: { id: shortletId }
                }
            },
        });
    }

    async createSeasonalPricing(data: SeasonalPricing) {
        const { propertyId, ...rest } = data;
        return await prismaClient.seasonalPricing.create({
            data: {
                ...rest,
                property: {
                    connect: { id: propertyId }
                }
            },
        });
    }

    async createUnavailableDate(data: UnavailableDate) {
        const { shortletId, ...rest } = data;
        return await prismaClient.unavailableDate.create({
            data: {
                ...rest,
                shortlet: {
                    connect: { id: shortletId }
                },
            }
        });
    }

    async createAdditionalRule(data: AdditionalRule) {
        const { shortletId, ...rest } = data;
        return await prismaClient.additionalRule.create({
            data: {
                ...rest,
                shortlet: {
                    connect: { id: shortletId }
                },
            },
        });
    }

    async createHostLanguage(data: any) {
        const { shortletId, ...rest } = data;
        return await prismaClient.hostLanguage.create({
            data: {
                ...rest,
                shortlet: {
                    connect: { id: shortletId }
                },
            },
        });
    }
}

export default new PropertyService()