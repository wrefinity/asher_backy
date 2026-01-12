import { IdType, ListingType, PriceFrequency, Prisma, PrismaClient, PropertySpecificationType } from "@prisma/client";
import { prismaClient } from "..";
import { PropertyType, MediaType, PropsSettingType } from "@prisma/client"
import { AvailabilityStatus } from "@prisma/client";
import { AdditionalRule, Booking, ICommercialDTO, IResidentialDTO, SeasonalPricing, IShortletDTO, UnavailableDate, ICreateProperty, IPropertySpecificationDTO, IBasePropertyDTO, PropertySearchDto } from "../validations/interfaces/properties.interface";
import { PropertyListingDTO } from "../landlord/validations/interfaces/propsSettings"
import { ListingNormalizer, NormalizedListing } from "../utils/ListingNormalizer";

const decimalToNumber = (value?: Prisma.Decimal | null): number | undefined =>
    value ? value.toNumber() : undefined;

interface InactiveListingResult {
    property: any; // Replace 'any' with your Property type
    unit: any; // Replace 'any' with your UnitConfiguration type
    room: any | null; // Replace 'any' with your RoomDetail type
    specificationDetails: {
        residential: any | null; // Replace 'any' with your ResidentialProperty type
        commercial: any | null; // Replace 'any' with your CommercialProperty type
    };
    specificationType: PropertySpecificationType;
}

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

class PropertyService {

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
                        roomDetails: true,
                        billsSubCategory: true,
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

    getProperties = async () => {
        return await prismaClient.properties.findMany({
            where: { isDeleted: false },
            include: {
                ...this.propsInclusion
            }
        })
    }

    getLandlordProperties = async (landlordId: string) => {
        const rawProperties = await prismaClient.properties.findMany({
            where: { isDeleted: false, landlordId },
            include: {
                ...this.propsInclusion
            }
        })///
        return rawProperties.map(p =>
            this.flatten(p)
        );
    }

    getPropertyOnUserPreference = async (userPreferenceTypes: PropertyType[], landlordId: string) => {
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
                        property: {
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

    flatten = (property: PropertyWithSpecification): FlattenedProperty => {
        const specifications = property.specification as Array<
            Prisma.PropertySpecificationGetPayload<{
                include: typeof this.specificationInclusion.include;
            }>
        >;

        const activeSpec = specifications.find(spec => spec.isActive);

        const specificDetails =
            (activeSpec?.residential ??
                activeSpec?.commercial ??
                activeSpec?.shortlet ??
                {}) as Record<string, any>;

        return {
            ...property,
            ...activeSpec,
            ...specificDetails,
        };
    }

    // Function to aggregate properties by state for the current landlord
    aggregatePropertiesByState = async (landlordId: string) => {
        const groupedProperties = await prismaClient.properties.groupBy({
            by: ['stateId'],
            where: {
                landlordId,
                isDeleted: false,
            },
        });

        const propertiesByState: { [key: string]: any[] } = {};

        for (const group of groupedProperties) {
            const stateId = group.stateId;
            if (!stateId) continue;

            const state = await prismaClient.state.findUnique({ where: { id: stateId } });
            if (!state) continue;

            const rawProperties = await prismaClient.properties.findMany({
                where: { stateId, landlordId, isDeleted: false },
                include: this.propsInclusion,
            });

            const flattened = rawProperties.map(p =>
                this.flatten(p)
            );

            propertiesByState[state.name.toLowerCase()] = flattened;
        }

        return propertiesByState;
    };



    // Function to aggregate properties by state for the current landlord
    getPropertiesByLandlord = async (landlordId: string) => {
        const unGroundProps: Prisma.propertiesGetPayload<{
            include: typeof this.propsInclusion;
        }>[] = await prismaClient.properties.findMany({
            where: {
                landlordId,
            },
            include: this.propsInclusion,
        });

        return unGroundProps.map(p =>
            this.flatten(p)
        );

        // const fullDetailsList = unGroundProps.map(property => {
        //     // Narrow the type of specification
        //     const specifications = property.specification as Array<
        //         Prisma.PropertySpecificationGetPayload<{
        //             include: typeof this.specificationInclusion.include;
        //         }>
        //     >;

        //     const activeSpec = specifications.find(spec => spec.isActive);

        //     const specificDetails =
        //         (activeSpec?.residential ?? activeSpec?.commercial ?? activeSpec?.shortlet ?? {}) as Record<string, any>;

        //     return {
        //         ...property,
        //         ...activeSpec,
        //         ...specificDetails,
        //     };
        // });

        // return fullDetailsList;
    };


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

        const props = await prismaClient.properties.findFirst({
            where: {
                landlordId,
                id: propertyId
            },
            include: {
                ...this.propsInclusion
            },
        })
        return this.flatten(props)
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
        const listings = await prismaClient.propertyListingHistory.findMany({
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
                        ...this.propsInclusion,
                        state: true,
                        images: true,
                        videos: true,
                        landlord: this.landlordInclusion,
                        specification: {
                            include: {
                                residential: {
                                    include: {
                                        sharedFacilities: true
                                    }
                                },
                                commercial: true,
                                shortlet: true
                            }
                        }
                    }
                },
                unit: {
                    include: {
                        images: true,
                        RoomDetail: true
                    }
                },
                room: {
                    include: {
                        images: true
                    }
                }
            }
        });

        // Normalize all listings
        return ListingNormalizer.normalizeMany(listings);
    }

    getInactiveListings = async (landlordId: string) => {
        // Get all properties with their specifications and units/rooms
        const properties = await prismaClient.properties.findMany({
            where: {
                landlordId,
                isDeleted: false,
                specification: {
                    some: {
                        isActive: true
                    }
                }
            },
            include: {
                specification: {
                    include: {
                        residential: {
                            include: {
                                unitConfigurations: {
                                    where: { isListed: false, isDeleted: false },
                                    include: {
                                        RoomDetail: {
                                            where: { isListed: false, isDeleted: false }
                                        }
                                    }
                                }
                            }
                        },
                        commercial: {
                            include: {
                                unitConfigurations: {
                                    where: { isListed: false, isDeleted: false },
                                    include: {
                                        RoomDetail: {
                                            where: { isListed: false, isDeleted: false }
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }
        });

        // Transform the data into the desired format
        const result = properties.flatMap(property => {
            return property.specification.flatMap(spec => {
                // Create a base object that will be common to all listings
                const baseListing = {
                    property,
                    specificationType: spec.specificationType,
                    specificationDetails: {
                        residential: spec.residential,
                        commercial: spec.commercial
                    }
                };

                // Handle unit configurations based on specification type
                if (spec.specificationType === 'RESIDENTIAL' && spec.residential) {
                    return spec.residential.unitConfigurations.map(unit => (
                        {
                            ...baseListing,
                            unit,
                            room: unit.RoomDetail.length > 0 ? unit.RoomDetail[0] : null,
                            listingType: unit.RoomDetail.length > 0 ? 'SINGLE_ROOM' : 'SINGLE_UNIT'
                        }));
                }

                if (spec.specificationType === 'COMMERCIAL' && spec.commercial) {
                    return spec.commercial.unitConfigurations.map(unit => ({
                        ...baseListing,
                        unit,
                        room: unit.RoomDetail.length > 0 ? unit.RoomDetail[0] : null,
                        listingType: unit.RoomDetail.length > 0 ? 'SINGLE_ROOM' : 'SINGLE_UNIT'
                    }));
                }

                return [];
            });
        });

        return result;
    };


    getPropertyListingDetails = async (landlordId: string) => {
        try {
            // Get all active listings for the landlord
            const listings = await prismaClient.propertyListingHistory.findMany({
                where: {
                    property: {
                        landlordId,
                        availability: AvailabilityStatus.VACANT
                    },
                    onListing: true,
                },
                include: {
                    property: {
                        include: {
                            specification: {
                                include: {
                                    residential: {
                                        include: {
                                            unitConfigurations: {
                                                include: {
                                                    RoomDetail: true
                                                }
                                            },
                                            sharedFacilities: true
                                        }
                                    },
                                    commercial: {
                                        include: {
                                            unitConfigurations: {
                                                include: {
                                                    RoomDetail: true
                                                }
                                            }
                                        }
                                    }
                                }
                            },
                            state: true,
                            images: true,
                            videos: true,
                            landlord: {
                                include: {
                                    user: {
                                        select: {
                                            email: true,
                                            profile: {
                                                select: {
                                                    fullname: true,
                                                    firstName: true,
                                                    lastName: true,
                                                    profileUrl: true
                                                }
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    },
                    unit: {
                        include: {
                            RoomDetail: {
                                where: { isDeleted: false }
                            },
                            images: true
                        }
                    },
                    room: {
                        include: {
                            images: true
                        }
                    }
                }
            });

            if (!listings || listings.length === 0) {
                return []; // Return empty array instead of throwing error
            }

            // Normalize all listings
            // Process related listings sequentially to prevent connection pool exhaustion
            // Sequential processing ensures we don't open too many concurrent connections
            const normalizedListings: NormalizedListing[] = [];

            for (const listing of listings) {
                const normalized = ListingNormalizer.normalize(listing);

                // Get related listings sequentially (one at a time) to prevent connection exhaustion
                try {
                    normalized.relatedListings = await ListingNormalizer.getRelatedListings(
                        listing.propertyId!,
                        listing.id,
                        prismaClient
                    );
                } catch (error: any) {
                    // If connection pool is exhausted, skip related listings for this item
                    // The error is already handled in getRelatedListings, but add extra safety
                    console.warn(`Skipping related listings for listing ${listing.id} due to connection issue`);
                    normalized.relatedListings = {
                        units: [],
                        rooms: [],
                        totalCount: 0
                    };
                }

                normalizedListings.push(normalized);
            }

            return normalizedListings;
        } catch (error) {
            console.error('Error fetching property listings:', error);
            throw error;
        }
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
                                    equals: String(state).trim(),
                                    mode: 'insensitive'
                                }
                            }
                        }
                    }),
                    ...(availability && { availability: AvailabilityStatus.VACANT }),
                    ...(country && {
                        country: {
                            equals: String(country).trim(),
                            mode: 'insensitive'
                        }
                    }),
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
        const properties = await prismaClient.propertyListingHistory.findMany({
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
                                name: {
                                    equals: String(state).trim(),
                                    mode: 'insensitive'
                                }
                            }
                        }
                    }),
                    ...(country && {
                        country: {
                            equals: String(country).trim(),
                            mode: 'insensitive'
                        }
                    }),
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
                        images: true,
                        videos: true,
                        virtualTours: true,
                        propertyDocument: true,
                        propertyListingHistory: true,
                        reviews: true,
                        UserLikedProperty: true,
                        landlord: this.landlordInclusion,
                        specification: {
                            include: {
                                residential: {
                                    include: {
                                        sharedFacilities: true
                                    }
                                },
                                commercial: true,
                                shortlet: true
                            }
                        },
                    },
                },
                unit: {
                    include: {
                        images: true,
                        RoomDetail: true
                    }
                },
                room: {
                    include: {
                        images: true
                    }
                },
            },
            skip,
            take,
        });
        // Normalize all properties using the ListingNormalizer
        // Process related listings sequentially to prevent connection pool exhaustion
        // Sequential processing ensures we don't open too many concurrent connections
        const normalizedProperties: NormalizedListing[] = [];

        for (const property of properties) {
            const normalized = ListingNormalizer.normalize(property);

            // Get related listings sequentially (one at a time) to prevent connection exhaustion
            try {
                normalized.relatedListings = await ListingNormalizer.getRelatedListings(
                    property.propertyId!,
                    property.id,
                    prismaClient
                );
            } catch (error: any) {
                // If connection pool is exhausted, skip related listings for this item
                // The error is already handled in getRelatedListings, but add extra safety
                console.warn(`Skipping related listings for property ${property.id} due to connection issue`);
                normalized.relatedListings = {
                    units: [],
                    rooms: [],
                    totalCount: 0
                };
            }

            normalizedProperties.push(normalized);
        }

        return normalizedProperties;
    };

    // Build hierarchy information for a listing
    private buildHierarchy(property: any) {
        const breadcrumb = [];
        let context = '';
        let level: 'property' | 'unit' | 'room' = 'property';

        // Always start with property
        breadcrumb.push({
            id: property.property.id,
            name: property.property.name,
            type: 'property',
            url: `/property/${property.property.id}`
        });

        if (property.type === 'SINGLE_UNIT' && property.unit) {
            level = 'unit';
            breadcrumb.push({
                id: property.unit.id,
                name: `${property.unit.unitType} ${property.unit.unitNumber || ''}`.trim(),
                type: 'unit',
                url: `/property/${property.id}` // Current listing URL
            });
            context = `${property.unit.unitType} ${property.unit.unitNumber || ''} in ${property.property.name}`.trim();
        }

        if (property.type === 'ROOM' && property.room) {
            level = 'room';
            if (property.unit) {
                breadcrumb.push({
                    id: property.unit.id,
                    name: `${property.unit.unitType} ${property.unit.unitNumber || ''}`.trim(),
                    type: 'unit',
                    url: `/property/${property.unit.id}` // Would need unit listing URL
                });
            }
            breadcrumb.push({
                id: property.room.id,
                name: property.room.roomName,
                type: 'room',
                url: `/property/${property.id}` // Current listing URL
            });
            context = `${property.room.roomName} in ${property.unit ? `${property.unit.unitType} ${property.unit.unitNumber || ''}` : 'Unit'} in ${property.property.name}`.trim();
        }

        if (property.type === 'ENTIRE_PROPERTY') {
            context = property.property.name;
        }

        return {
            level,
            propertyId: property.property.id,
            unitId: property.unit?.id,
            roomId: property.room?.id,
            breadcrumb,
            context
        };
    }

    // Get related listings in the same property
    getRelatedListings = async (propertyId: string, excludeListingId: string) => {
        const related = await prismaClient.propertyListingHistory.findMany({
            where: {
                propertyId,
                id: { not: excludeListingId },
                onListing: true,
                isActive: true
            },
            include: {
                property: true,
                unit: true,
                room: true
            }
        });

        const units = related.filter(r => r.type === 'SINGLE_UNIT');
        const rooms = related.filter(r => r.type === 'ROOM');

        return {
            units: units.map(u => ({
                id: u.id,
                name: `${u.unit?.unitType} ${u.unit?.unitNumber || ''}`.trim(),
                price: Number(u.price) || 0,
                currency: u.property.currency || 'USD',
                url: `/property/${u.id}`
            })),
            rooms: rooms.map(r => ({
                id: r.id,
                name: r.room?.roomName || 'Room',
                price: Number(r.price) || 0,
                currency: r.property.currency || 'USD',
                url: `/property/${r.id}`
            })),
            totalCount: related.length
        };
    }

    getInactiveLandlordProperties = async (landlordId: string) => {

        // TODO: a single unit and room should have the whole information 
        /*
        {
         unit: {......},
         room: {...},
         property info,

        }
        */
        try {
            // First get properties that exist in listing history but are inactive
            const inactiveListings = await prismaClient.propertyListingHistory.findMany({
                where: {
                    property: { landlordId, isDeleted: false },
                    isActive: false,
                    onListing: false
                },
                include: {
                    property: true
                }
            });

            // Then get all properties that have NEVER been listed
            const neverListedProperties = await prismaClient.properties.findMany({
                where: {
                    landlordId,
                    isDeleted: false,
                    propertyListingHistory: { none: {} }
                }
            });

            // Combine both sets of properties
            const allInactiveProperties = [
                ...inactiveListings.map(listing => ({
                    ...listing,
                    isInListingHistory: true
                })),
                ...neverListedProperties.map(property => ({
                    property,
                    isInListingHistory: false,
                    isActive: false,
                    onListing: false,
                    type: null,
                    price: null,
                    priceFrequency: null
                }))
            ];

            if (!allInactiveProperties.length) {
                return [];
            }

            // Fetch complete data for all properties in a single query
            const enrichedProperties: Prisma.propertiesGetPayload<{
                include: typeof this.propsInclusion;
            }>[] = await prismaClient.properties.findMany({
                where: {
                    id: { in: allInactiveProperties.map(p => p.property.id) }
                },
                include: this.propsInclusion,
                // include: {

                //   images: true,
                //   specification: {
                //     include: {
                //       residential: true,
                //       commercial: true,
                //       shortlet: true
                //     }
                //   },
                //   propertyListingHistory: {
                //     where: {
                //       isActive: false,
                //       onListing: false
                //     },
                //     include: {
                //       unit: {
                //         include: {
                //           images: true
                //         }
                //       },
                //       room: {
                //         include: {
                //           images: true,
                //         }
                //       }
                //     }
                //   }
                // }
            });





            return enrichedProperties.map(p =>
                this.flatten(p)
            );
            // Transform the data for response
            //   return enrichedProperties.map(property => {
            //     // Find the most recent inactive listing (if exists)
            //     const listing = property.propertyListingHistory[0] || null;

            //     return {
            //       id: property.id,
            //       name: property.name,
            //       address: property.address,
            //       primaryImage: property.images[0] || null,
            //       status: listing ? 'PREVIOUSLY_LISTED' : 'NEVER_LISTED',
            //       lastListedDate: listing?.createdAt || null,
            //       specifications: property.specification.map(spec => ({
            //         type: spec.specificationType,
            //         details: {
            //           residential: spec.residential,
            //           commercial: spec.commercial,
            //           shortlet: spec.shortlet
            //         }
            //       })),
            //       listingDetails: listing ? {
            //         type: listing.type,
            //         price: listing.price,
            //         priceFrequency: listing.priceFrequency,
            //         unit: listing.unit ? {
            //           id: listing.unit.id,
            //           unitType: listing.unit.unitType,
            //           primaryImage: listing.unit.images[0] || null
            //         } : null,
            //         room: listing.room ? {
            //           id: listing.room.id,
            //           roomName: listing.room.roomName,
            //           primaryImage: listing.room.images[0] || null
            //         } : null
            //       } : null
            //     };
            //   });

        } catch (error) {
            console.error('Error fetching inactive properties:', error);
            throw new Error('Failed to fetch inactive properties');
        }
    }


    async createPropertyListing(data: PropertyListingDTO | any) {

        const { propertyId, unitId: unitIds = [], roomId: roomIds = [], type, ...baseData } = data;
        const response: {
            success: boolean;
            message: string;
            listings: any[];
            alreadyListed: {
                units: string[];
                rooms: string[];
                property?: boolean;
            };
            newlyListed: {
                units: string[];
                rooms: string[];
                property?: boolean;
            };
        } = {
            success: true,
            message: '',
            listings: [],
            alreadyListed: { units: [], rooms: [] },
            newlyListed: { units: [], rooms: [] }
        };

        return await prismaClient.$transaction(async (tx) => {
            // Check for existing ENTIRE_PROPERTY listing
            if (type === ListingType.ENTIRE_PROPERTY && unitIds.length === 0 && roomIds.length === 0) {

                const existing = await tx.propertyListingHistory.findFirst({
                    where: {
                        propertyId,
                        type: ListingType.ENTIRE_PROPERTY,
                        onListing: true
                    },
                    orderBy: { createdAt: 'desc' },
                });

                if (existing) {
                    response.alreadyListed.property = true;
                    response.message = 'Property is already listed as entire property';
                    response.success = false;
                    return response;
                }
            }

            // Check unit listings
            for (const unitId of unitIds) {
                if (!unitId) continue;

                const existing = await tx.propertyListingHistory.findFirst({
                    where: {
                        unitId,
                        onListing: true
                    },
                    orderBy: { createdAt: "desc" }
                });

                if (existing) {
                    response.alreadyListed.units.push(unitId);
                } else {
                    response.newlyListed.units.push(unitId);
                }
            }

            // Check room listings
            for (const roomId of roomIds) {
                if (!roomId) continue;

                const existing = await tx.propertyListingHistory.findFirst({
                    where: {
                        roomId,
                        onListing: true
                    }
                });

                if (existing) {
                    response.alreadyListed.rooms.push(roomId);
                } else {
                    response.newlyListed.rooms.push(roomId);
                }
            }

            // Create listings for new units
            for (const unitId of response.newlyListed.units) {
                const created = await tx.propertyListingHistory.create({
                    data: {
                        ...baseData,
                        propertyId: propertyId,
                        unitId: unitId,
                        roomId: null,
                        type: ListingType.SINGLE_UNIT
                    }
                });
                response.listings.push(created);
                await tx.unitConfiguration.update({
                    where: { id: unitId },
                    data: { isListed: true }
                });
                // Mark property as listed when any unit is listed
                await tx.properties.update({
                    where: { id: propertyId },
                    data: { isListed: true }
                });
            }

            // Create listings for new rooms
            for (const roomId of response.newlyListed.rooms) {
                const created = await tx.propertyListingHistory.create({
                    data: {
                        ...baseData,
                        propertyId: propertyId,
                        roomId: roomId,
                        unitId: null,
                        type: ListingType.ROOM
                    }
                });
                response.listings.push(created);
                await tx.roomDetail.update({
                    where: { id: roomId },
                    data: { isListed: true }
                });
                // Mark property as listed when any room is listed
                await tx.properties.update({
                    where: { id: propertyId },
                    data: { isListed: true }
                });
            }

            // Create ENTIRE_PROPERTY listing if applicable
            if (type === ListingType.ENTIRE_PROPERTY && unitIds.length === 0 && roomIds.length === 0) {
                const created = await tx.propertyListingHistory.create({
                    data: {
                        ...baseData,
                        propertyId: propertyId,
                        unitId: null,
                        roomId: null,
                        type: ListingType.ENTIRE_PROPERTY
                    }
                });
                response.listings.push(created);
                response.newlyListed.property = true;
                await tx.properties.update({
                    where: { id: propertyId },
                    data: { isListed: true }
                });
            }

            // Set appropriate message
            if (response.listings.length > 0) {
                response.message = 'Successfully created listings for new items';
                if (response.alreadyListed.units.length > 0 || response.alreadyListed.rooms.length > 0) {
                    response.message += ', some items were already listed';
                }
            } else {
                response.message = 'No new listings created - all specified items were already listed';
                response.success = false;
            }

            return response;
        }, {
            maxWait: 30000,
            timeout: 30000
        });
    }


    deletePropertyListing = async (resourceId: string) => {
        try {
            let updatedResource: any = null;
            let resourceType: 'property' | 'unit' | 'room' | null = null;
            let lastListedHistory: any = null;

            await prismaClient.$transaction(async (tx) => {
                // 1. Attempt to update `properties` model
                const propertyUpdate = await tx.properties.update({
                    where: { id: resourceId },
                    data: { isListed: false },
                    include: {
                        propertyListingHistory: {
                            where: { onListing: true, isActive: true },
                            orderBy: { createdAt: 'desc' },
                            take: 1,
                        },
                        specification: {
                            include: {
                                residential: {
                                    include: {
                                        unitConfigurations: {
                                            include: {
                                                RoomDetail: true
                                            }
                                        }
                                    }
                                },
                                commercial: {
                                    include: {
                                        unitConfigurations: {
                                            include: {
                                                RoomDetail: true
                                            }
                                        }
                                    }
                                },
                                shortlet: {
                                    include: {
                                        roomDetails: true
                                    }
                                }
                            }
                        }
                    },
                }).catch(() => null);

                if (propertyUpdate) {
                    updatedResource = propertyUpdate;
                    resourceType = 'property';
                    if (propertyUpdate.propertyListingHistory.length > 0) {
                        lastListedHistory = propertyUpdate.propertyListingHistory[0];
                    }

                    // Unlist all units and rooms for this property
                    const specification = propertyUpdate.specification;
                    if (specification) {
                        // Handle residential property units and rooms
                        if (specification.residential) {
                            const residential = specification.residential;
                            if (residential.unitConfigurations && residential.unitConfigurations.length > 0) {
                                // Unlist all units
                                await tx.unitConfiguration.updateMany({
                                    where: {
                                        id: {
                                            in: residential.unitConfigurations.map(unit => unit.id)
                                        }
                                    },
                                    data: { isListed: false }
                                });

                                // Unlist all rooms in these units
                                const allRoomIds = residential.unitConfigurations
                                    .flatMap(unit => unit.RoomDetail)
                                    .map(room => room.id);

                                if (allRoomIds.length > 0) {
                                    await tx.roomDetail.updateMany({
                                        where: {
                                            id: {
                                                in: allRoomIds
                                            }
                                        },
                                        data: { isListed: false }
                                    });
                                }
                            }
                        }

                        // Handle commercial property units and rooms
                        if (specification.commercial) {
                            const commercial = specification.commercial;
                            if (commercial.unitConfigurations && commercial.unitConfigurations.length > 0) {
                                // Unlist all units
                                await tx.unitConfiguration.updateMany({
                                    where: {
                                        id: {
                                            in: commercial.unitConfigurations.map(unit => unit.id)
                                        }
                                    },
                                    data: { isListed: false }
                                });

                                // Unlist all rooms in these units
                                const allRoomIds = commercial.unitConfigurations
                                    .flatMap(unit => unit.RoomDetail)
                                    .map(room => room.id);

                                if (allRoomIds.length > 0) {
                                    await tx.roomDetail.updateMany({
                                        where: {
                                            id: {
                                                in: allRoomIds
                                            }
                                        },
                                        data: { isListed: false }
                                    });
                                }
                            }
                        }

                        // Handle shortlet property rooms
                        if (specification.shortlet) {
                            const shortlet = specification.shortlet;
                            if (shortlet.roomDetails && shortlet.roomDetails.length > 0) {
                                // Unlist all rooms
                                await tx.roomDetail.updateMany({
                                    where: {
                                        id: {
                                            in: shortlet.roomDetails.map(room => room.id)
                                        }
                                    },
                                    data: { isListed: false }
                                });
                            }
                        }
                    }
                }

                // 2. If not a property, check and update `UnitConfiguration`
                if (!updatedResource) {
                    const unitUpdate = await tx.unitConfiguration.update({
                        where: { id: resourceId },
                        data: { isListed: false },
                        include: {
                            propertyListingHistory: {
                                where: { onListing: true, isActive: true },
                                orderBy: { createdAt: 'desc' },
                                take: 1,
                            },
                            RoomDetail: true
                        },
                    }).catch(() => null);

                    if (unitUpdate) {
                        updatedResource = unitUpdate;
                        resourceType = 'unit';
                        if (unitUpdate.propertyListingHistory.length > 0) {
                            lastListedHistory = unitUpdate.propertyListingHistory[0];
                        }

                        // Unlist all rooms in this unit
                        if (unitUpdate.RoomDetail && unitUpdate.RoomDetail.length > 0) {
                            await tx.roomDetail.updateMany({
                                where: {
                                    id: {
                                        in: unitUpdate.RoomDetail.map(room => room.id)
                                    }
                                },
                                data: { isListed: false }
                            });
                        }
                    }
                }

                // 3. If not a unit, check and update `RoomDetail`
                if (!updatedResource) {
                    const roomUpdate = await tx.roomDetail.update({
                        where: { id: resourceId },
                        data: { isListed: false },
                        include: {
                            propertyListingHistory: {
                                where: { onListing: true, isActive: true },
                                orderBy: { createdAt: 'desc' },
                                take: 1,
                            },
                        },
                    }).catch(() => null);

                    if (roomUpdate) {
                        updatedResource = roomUpdate;
                        resourceType = 'room';
                        if (roomUpdate.propertyListingHistory.length > 0) {
                            lastListedHistory = roomUpdate.propertyListingHistory[0];
                        }
                    }
                }

                // If no resource was found after all attempts, throw an error to rollback.
                if (!updatedResource) {
                    throw new Error('Resource not found');
                }

                // 4. Update the corresponding propertyListingHistory record if one was found.
                if (lastListedHistory) {
                    await tx.propertyListingHistory.update({
                        where: { id: lastListedHistory.id },
                        data: {
                            onListing: false,
                            isActive: false,
                            availableTo: new Date(),
                        },
                    });
                } else {
                    console.warn(`Resource with ID ${resourceId} was unlisted but no active listing history was found.`);
                }

                // 5. Check if property still has any active listings after unlisting this resource
                if (resourceType === 'property') {
                    const remainingActiveListings = await tx.propertyListingHistory.count({
                        where: {
                            propertyId: resourceId,
                            onListing: true,
                            isActive: true
                        }
                    });

                    // Only set isListed to false if no active listings remain
                    if (remainingActiveListings === 0) {
                        await tx.properties.update({
                            where: { id: resourceId },
                            data: { isListed: false }
                        });
                    }
                } else if (resourceType === 'unit' || resourceType === 'room') {
                    // For units/rooms, check if the property still has any active listings
                    const propertyId = updatedResource?.residentialPropertyId || updatedResource?.commercialPropertyId;
                    if (propertyId) {
                        const remainingActiveListings = await tx.propertyListingHistory.count({
                            where: {
                                propertyId: propertyId,
                                onListing: true,
                                isActive: true
                            }
                        });

                        // Only set isListed to false if no active listings remain
                        if (remainingActiveListings === 0) {
                            await tx.properties.update({
                                where: { id: propertyId },
                                data: { isListed: false }
                            });
                        }
                    }
                }
            });

            return updatedResource;

        } catch (error: any) {
            console.error('Database error in deletePropertyListing:', error);
            if (error.message === 'Resource not found') {
                return null;
            }
            throw error;
        }
    };

    // Method to sync isListed field based on propertyListingHistory
    syncPropertyListingStatus = async (propertyId: string) => {
        try {
            const activeListingsCount = await prismaClient.propertyListingHistory.count({
                where: {
                    propertyId: propertyId,
                    onListing: true,
                    isActive: true
                }
            });

            const isListed = activeListingsCount > 0;

            await prismaClient.properties.update({
                where: { id: propertyId },
                data: { isListed: isListed }
            });

            return { propertyId, isListed, activeListingsCount };
        } catch (error) {
            console.error('Error syncing property listing status:', error);
            throw error;
        }
    }

    // Method to sync all properties' isListed status
    syncAllPropertiesListingStatus = async () => {
        try {
            const properties = await prismaClient.properties.findMany({
                select: { id: true }
            });

            const results = [];
            for (const property of properties) {
                const result = await this.syncPropertyListingStatus(property.id);
                results.push(result);
            }

            return results;
        } catch (error) {
            console.error('Error syncing all properties listing status:', error);
            throw error;
        }
    }

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
                propertyId,
                onListing: true,
                isActive: true,
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
    getPropertyListingByListingId = async (listedId: string) => {
        try {
            return await prismaClient.propertyListingHistory.findUnique({
                where: {
                    id: listedId
                },
                include: {
                    property: {

                    },
                    unit: {
                        include: {
                            RoomDetail: true,
                            images: true
                        }
                    },
                    room: {
                        include: {
                            images: true
                        }
                    }
                }
            });


        } catch (error) {
            console.error('Error fetching property listing:', error);
            throw error;
        }
    }
    getPropertyListingByListingIdNew = async (listedId: string) => {
        try {
            const listing = await prismaClient.propertyListingHistory.findUnique({
                where: {
                    id: listedId
                },
                include: {
                    property: {
                        include: {
                            specification: {
                                where: {
                                    isActive: true
                                },
                                include: {
                                    residential: {
                                        include: {
                                            sharedFacilities: true
                                        }
                                    },
                                    commercial: true,
                                    shortlet: true
                                },
                                take: 1 // Only get one specification
                            },
                            state: true,
                            images: true,
                            videos: true,
                            landlord: {
                                select: {
                                    id: true,
                                    userId: true, // Include userId field
                                    landlordCode: true,
                                    user: {
                                        select: {
                                            id: true,
                                            email: true,
                                            profile: {
                                                select: {
                                                    id: true,
                                                    fullname: true,
                                                    firstName: true,
                                                    lastName: true,
                                                    middleName: true,
                                                    profileUrl: true
                                                }
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    },
                    unit: {
                        include: {
                            RoomDetail: true,
                            images: true
                        }
                    },
                    room: {
                        include: {
                            images: true
                        }
                    }
                }
            });

            if (!listing) {
                throw new Error('Listing not found');
            }

            // Check if property itself has an active listing (for breadcrumb navigation)
            let propertyListingId: string | null = null;
            if (listing.type !== 'ENTIRE_PROPERTY' && listing.propertyId) {
                const propertyListing = await prismaClient.propertyListingHistory.findFirst({
                    where: {
                        propertyId: listing.propertyId,
                        type: 'ENTIRE_PROPERTY',
                        onListing: true,
                        isActive: true
                    },
                    select: { id: true },
                    orderBy: { createdAt: 'desc' }
                });
                propertyListingId = propertyListing?.id || null;
            }

            // Normalize the listing (pass propertyListingId if available)
            const normalized = ListingNormalizer.normalize(listing, propertyListingId);

            // Get related listings
            normalized.relatedListings = await ListingNormalizer.getRelatedListings(
                listing.propertyId!,
                listing.id,
                prismaClient
            );

            return normalized;
        } catch (error) {
            console.error('Error fetching property listing:', error);
            throw error;
        }
    }
    updatePropertyListing = async (data: Partial<PropertyListingDTO | any>, listedId: string, landlordId: string) => {
        const propsListed = await this.getPropertyListingByListingId(listedId);
        if (!propsListed) throw new Error(`The props listing with the listing id: ${listedId} have not been listed`);
        if (propsListed?.property?.landlordId !== landlordId) {
            throw new Error("only landlord that created this props listing can update props listing");
        }

        return await prismaClient.propertyListingHistory.update({
            where: { id: listedId },
            data,
        });
    }
    // to update property to listing and not listing 
    updateListingStatus = async (listedId: string) => {
        const propsListed = await this.getPropertyListingByListingId(listedId);
        if (!propsListed) throw new Error(`The props listing with the listing id: ${listedId} have not been listed`);
        return await prismaClient.propertyListingHistory.update({
            where: { id: listedId },
            data: { onListing: false },
        });
    }
    // to update property to listing and not listing
    getPropertyById = async (propertyId: string) => {
        const props = await prismaClient.properties.findFirst({
            where: { id: propertyId },
            include: {
                ...this.propsInclusion
            }
        });

        if (!props) throw new Error("Property not found")
        return this.flatten(props);
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

    // getPropertiesAttachedToTenants = async (tenantId: string) => {
    //     return await prismaClient.properties.findFirst({
    //         where: {
    //             tenants: {
    //                 some: { id: tenantId },
    //             },
    //         }
    //     });
    // 

    getPropertiesAttachedToTenants = async (tenantId: string) => {
        return await prismaClient.tenants.findUnique({
            where: { id: tenantId },
            select: {
                property: true,
                unit: true,
                room: true,
                propertyId: true,
                unitId: true,
                roomId: true
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

    async createProperties(data: IBasePropertyDTO, specification: IPropertySpecificationDTO, uploadedFiles?: any[], userId?: string) {
        const { shortlet, specificationType, residential, commercial } = specification;

        return prismaClient.$transaction(async (tx) => {
            const { agencyId, landlordId, stateId, keyFeatures, price, marketValue, propertyValue, ...rest } = data;

            if (!landlordId || !stateId) {
                throw new Error("Missing required fields: landlordId or stateId.");
            }
            if (!specificationType) {
                throw new Error("Specification type is required.");
            }

            // Separate media by type
            const images = uploadedFiles?.filter(file => file?.identifier === 'MediaTable' && file?.type === MediaType.IMAGE);
            const videos = uploadedFiles?.filter(file => file?.identifier === 'MediaTable' && file?.type === MediaType.VIDEO);
            const virtualTours = uploadedFiles?.filter(file => file?.identifier === 'MediaTable' && file?.type === MediaType.VIRTUAL_TOUR);
            const documents = uploadedFiles?.filter(file => file?.identifier === 'DocTable');

            // Create the main property - REMOVE documentName from here
            const property = await tx.properties.create({
                data: {
                    ...rest,
                    price: price ? new Prisma.Decimal(price) : null, // Convert to Decimal
                    marketValue: marketValue ? new Prisma.Decimal(marketValue) : null, // Convert if exist
                    propertyValue: propertyValue ? new Prisma.Decimal(propertyValue) : null, // Convert if exist
                    keyFeatures: { set: keyFeatures },
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
                            documentUrl: doc?.url || doc?.documentUrl,
                            size: doc?.size,
                            type: doc?.type,
                            ...(doc?.docType && { docType: doc?.docType }),
                            ...(doc?.idType && { idType: doc?.idType }),
                            users: { connect: { id: userId } }
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

            // Return full property with related entities
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
            outdoorsSpacesFeature,
            safetyFeatures,
            bills,
            buildingAmenityFeatures,
            roomDetails,
            PropertySpecification,
            sharedFacilities,
            unitConfigurations,
            ...rest } = data;

        // Verify property exists
        const property = await tx.properties.findUnique({
            where: { id: propertyId }
        });
        if (!property) throw new Error(`Property ${propertyId} not found`);

        // Proceed with creation
        const residential = await tx.residentialProperty.create({
            data: {
                ...rest,
                outdoorsSpacesFeatures: outdoorsSpacesFeature ? { set: outdoorsSpacesFeature } : undefined,
                buildingAmenityFeatures: buildingAmenityFeatures ? { set: buildingAmenityFeatures } : undefined,
                safetyFeatures: safetyFeatures ? { set: safetyFeatures } : undefined,
                billsSubCategory: {
                    connect: bills?.length ? bills?.map((id) => ({ id })) : undefined,
                },
                // roomDetails: {
                //     create: roomDetails?.map((room: any) => ({
                //         roomName: room.roomName,
                //         roomSize: room.roomSize,
                //         ensuite: room.ensuite,
                //         price: room.price,
                //     })) || [],
                // },
                roomDetails: {
                    create: roomDetails?.flatMap((room: any) =>
                        Array.from({ length: room.count || 1 }, () => ({
                            roomName: room.roomName,
                            roomSize: room.roomSize,
                            count: room.count,
                            ensuite: room.ensuite,
                            furnished: room.furnished,
                            price: room.price,
                            description: room?.description,
                            priceFrequency: room.priceFrequency,
                        }))
                    ) || [],
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
                    create: unitConfigurations?.flatMap((unit: any) =>
                        Array.from({ length: unit.count || 1 }, (_, i) => ({
                            unitType: unit.unitType,
                            unitNumber: `${unit.unitNumber}${i + 1}`,
                            floorNumber: unit.floorNumber,
                            bedrooms: unit.bedrooms,
                            bathrooms: unit.bathrooms,
                            kitchens: unit.kitchens,
                            furnished: unit.furnished,
                            ensuite: unit.ensuite,
                            count: unit.count,
                            price: unit.price,
                            priceFrequency: unit.priceFrequency,
                            area: unit.area,
                            description: unit?.description,
                            availability: unit.availability,
                        }))
                    ) || [],
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
                        description: room?.description,
                        furnished: room.furnished
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
                        kitchens: unit.kitchens,
                        furnished: unit.furnished,
                        ensuite: unit.ensuite,
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

    async createShortletProperty(propertyId: string, data: IShortletDTO | any, tx: any, specification: IPropertySpecificationDTO) {
        const {
            safetyFeatures,
            buildingAmenityFeatures,
            outdoorsSpacesFeatures,
            hostLanguages,
            additionalRules, unavailableDates,
            seasonalPricing,
            PropertySpecification,
            sharedFacilities, roomDetails, ...rest } = data;

        // Step 1: Verify property exists
        const property = await tx.properties.findUnique({
            where: { id: propertyId }
        });
        if (!property) throw new Error(`Property ${propertyId} not found`);


        // Proceed with creation
        const shortlet = await tx.shortletProperty.create({
            data: {
                ...rest,
                safetyFeatures: safetyFeatures ? { set: safetyFeatures } : undefined,
                outdoorsSpacesFeatures: outdoorsSpacesFeatures ? { set: outdoorsSpacesFeatures } : undefined,
                buildingAmenityFeatures: buildingAmenityFeatures ? { set: buildingAmenityFeatures } : undefined,
                roomDetails: {
                    create: roomDetails?.map((room: any) => ({
                        roomName: room.roomName,
                        roomSize: room.roomSize,
                        description: room?.description,
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

    async switchPropertyType(data: IBasePropertyDTO, specification: IPropertySpecificationDTO, propertyId?: string) {
        return prismaClient.$transaction(async (tx) => {
            // Verify property exists and get current active specification
            const property = await tx.properties.findUnique({
                where: { id: propertyId },
                include: {
                    specification: {
                        // where: { isActive: true },
                        include: {
                            commercial: true,
                            residential: true,
                            shortlet: true
                        }
                    }
                }
            });

            if (!property) {
                throw new Error("Property not found");
            }

            // Deactivate current active specification if exists
            if (property.specification?.length) {
                await tx.propertySpecification.updateMany({
                    where: { propertyId: property?.id },
                    //   where: { id: property.specification[0].id },
                    data: { isActive: false }
                });
            }

            // Create a helper function to convert Decimal to number
            const decimalToNumber = (decimal: any): number => {
                if (decimal === null || decimal === undefined) return 0;
                return typeof decimal === 'number' ? decimal : Number(decimal.toString());
            };


            // Create or reuse specification based on target type
            switch (data.specificationType) {
                case PropertySpecificationType.COMMERCIAL:
                    return this.handleCommercialSwitch(tx, specification.commercial, propertyId, property.specification?.[0],);
                case PropertySpecificationType.RESIDENTIAL:
                    // return this.handleResidentialSwitch(tx, specification.residential, propertyId, property.specification?.[0]);
                    // Convert Decimal fields to numbers before passing
                    const residentialDTO = {
                        ...specification.residential,
                        groundRent: decimalToNumber(specification.residential?.groundRent),
                        serviceCharge: decimalToNumber(specification.residential?.serviceCharge),
                        propertyTax: decimalToNumber(specification.residential?.propertyTax),
                        hoaFees: decimalToNumber(specification.residential?.hoaFees),
                    };
                    return this.handleResidentialSwitch(
                        tx,
                        residentialDTO,
                        propertyId,
                        property.specification?.[0]
                    );
                case PropertySpecificationType.SHORTLET:
                    return this.handleShortletSwitch(tx, specification.shortlet, propertyId, property.specification?.[0]);
                default:
                    throw new Error("Invalid property type");
            }
        });
    }

    private async handleCommercialSwitch(tx: any, request: ICommercialDTO | any, propertyId: string, currentSpec?: any) {
        const { ...commercialData } = request;

        // Reuse existing commercial spec if available, otherwise create new
        const commercial = currentSpec?.commercial
            ? await tx.commercialProperty.create({
                data: {
                    ...currentSpec.commercial,
                    id: undefined, // Let Prisma generate new ID
                    ...commercialData,
                    securityFeatures: { set: currentSpec.commercial.securityFeatures || commercialData.securityFeatures },
                }
            })
            : await tx.commercialProperty.create({
                data: {
                    ...commercialData,
                    securityFeatures: { set: commercialData.securityFeatures || [] },
                }
            });

        return this.updatePropertySpecification(tx, propertyId, "COMMERCIAL", commercial.id);
    }

    private async handleResidentialSwitch(tx: any, request: IResidentialDTO, propertyId: string, currentSpec?: any) {
        const { ...residentialData } = request;
        const residential = currentSpec?.residential
            ? await tx.residentialProperty.create({
                data: {
                    ...currentSpec.residential,
                    id: undefined,
                    ...residentialData,
                    safetyFeatures: { set: residentialData.safetyFeatures || currentSpec.residential.safetyFeatures },
                }
            })
            : await tx.residentialProperty.create({
                data: {
                    ...residentialData,
                    safetyFeatures: { set: residentialData.safetyFeatures || [] },
                }
            });

        return this.updatePropertySpecification(tx, propertyId, PropertySpecificationType.RESIDENTIAL, residential.id);
    }

    private async handleShortletSwitch(tx: any, request: IShortletDTO | any, propertyId: string, currentSpec?: any) {
        const { ...shortletData } = request;

        const shortlet = currentSpec?.shortlet
            ? await tx.shortletProperty.create({
                data: {
                    ...currentSpec.shortlet,
                    id: undefined,
                    ...shortletData,
                    safetyFeatures: { set: shortletData.safetyFeatures || currentSpec.shortlet.safetyFeatures },
                }
            })
            : await tx.shortletProperty.create({
                data: {
                    ...shortletData,
                    safetyFeatures: { set: shortletData.safetyFeatures || [] },
                }
            });

        return this.updatePropertySpecification(tx, propertyId, PropertySpecificationType.SHORTLET, shortlet.id);
    }

    updatePropertySpecification = async (
        tx: any,
        propertyId: string,
        specType: PropertySpecificationType,
        specId: string
    ) => {
        return tx.properties.update({
            where: { id: propertyId },
            data: {
                specificationType: specType,
                specification: {
                    create: {
                        specificationType: specType,
                        isActive: true,
                        ...(specType === PropertySpecificationType.COMMERCIAL && { commercial: { connect: { id: specId } } }),
                        ...(specType === PropertySpecificationType.RESIDENTIAL && { residential: { connect: { id: specId } } }),
                        ...(specType === PropertySpecificationType.SHORTLET && { shortlet: { connect: { id: specId } } }),
                    }
                }
            },
            include: {
                specification: {
                    where: { isActive: true },
                    include: {
                        commercial: specType === PropertySpecificationType.COMMERCIAL,
                        residential: specType === PropertySpecificationType.RESIDENTIAL,
                        shortlet: specType === PropertySpecificationType.SHORTLET
                    }
                }
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

    getPropertySpecificationHistory = async (propertyId: string) => {
        return prismaClient.propertySpecification.findMany({
            where: { propertyId },
            orderBy: { createdAt: 'desc' },
            include: {
                commercial: true,
                residential: true,
                shortlet: true
            }
        });
    }

    getActiveSpecification = async (propertyId: string) => {
        return prismaClient.propertySpecification.findFirst({
            where: {
                propertyId,
                isActive: true
            },
            include: {
                commercial: true,
                residential: true,
                shortlet: true
            }
        });
    }

    searchPropertyUnitRoom = async (id: string) => {
        // First search the property without strict filters
        const property = await prismaClient.properties.findFirst({
            where: { id, isDeleted: false },
            include: {
                propertyListingHistory: true
            }
        });

        const unit = await prismaClient.unitConfiguration.findFirst({
            where: { id, isDeleted: false }
        });

        const room = await prismaClient.roomDetail.findFirst({
            where: { id, isDeleted: false }
        });

        if (property) {
            // Determine if property is actually active on listing
            const isListed = property.propertyListingHistory?.some(h => h.isActive && h.onListing);

            return {
                type: 'property',
                data: property,
                isListed
            };
        }

        if (unit) {
            return { type: 'unit', data: unit };
        }

        if (room) {
            return { type: 'room', data: room };
        }

        console.log("=========== No match found for id:", id);
        console.log(property)

        throw new Error("No matching property, unit, or room found");
    };


    async updateShortletSettings(propertyId: string, data: Partial<IShortletDTO>) {
        return await prismaClient.$transaction(async (tx) => {
            // Verify property exists and get current active specification
            const property = await tx.properties.findUnique({
                where: { id: propertyId },
                include: {
                    specification: {
                        where: { isActive: true },
                        include: {
                            shortlet: true
                        }
                    }
                }
            });

            if (!property) {
                throw new Error(`Property ${propertyId} not found`);
            }

            const activeSpec = property.specification?.find(spec => spec.isActive);
            if (!activeSpec || !activeSpec.shortlet) {
                throw new Error(`Property ${propertyId} is not configured as a shortlet`);
            }

            const shortletId = activeSpec.shortlet.id;

            // Prepare update data - exclude nested relations
            const {
                safetyFeatures,
                buildingAmenityFeatures,
                outdoorsSpacesFeatures,
                roomDetails,
                seasonalPricing,
                unavailableDates,
                additionalRules,
                hostLanguages,
                sharedFacilities,
                bookings,
                ...updateData
            } = data;

            // // Update shortlet property
            // const updatedShortlet = await tx.shortletProperty.update({
            //     where: { id: shortletId },
            //     data: {
            //         ...updateData,
            //         ...(safetyFeatures !== undefined && { safetyFeatures: { set: safetyFeatures } }),
            //         ...(buildingAmenityFeatures !== undefined && { buildingAmenityFeatures: { set: buildingAmenityFeatures } }),
            //         ...(outdoorsSpacesFeatures !== undefined && { outdoorsSpacesFeatures: { set: outdoorsSpacesFeatures } }),
            //     },
            //     include: {
            //         bookings: true,
            //         seasonalPricing: true,
            //         unavailableDates: true,
            //         additionalRules: true,
            //         hostLanguages: true,
            //         roomDetails: true,
            //         sharedFacilities: true,
            //     }
            // });

            // Return updated property with flattened structure
            const updatedProperty = await tx.properties.findUnique({
                where: { id: propertyId },
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

            if (!updatedProperty) {
                throw new Error(`Property ${propertyId} not found after update`);
            }

            // return this.flatten(updatedProperty);
            return this.flatten(updatedProperty as any);
        });
    }

    async searchPropertiesForRecommendation(filters: PropertySearchDto) {
        const {
            propertyCategory,
            propertyType,
            location,
            bedrooms,
            bathrooms,
            minRent,
            maxRent,
            leaseDuration,
            moveInDate,
            minSize,
            maxSize,
        } = filters;

        const listings = await prismaClient.propertyListingHistory.findMany({
            where: {
                isActive: true,
                onListing: true,
                ...(propertyCategory && { listAs: propertyCategory }),
                ...(propertyType && { propertySubType: propertyType }),
                ...(minRent || maxRent
                    ? {
                        price: {
                            gte: minRent ?? 0,
                            lte: maxRent ?? undefined,
                        },
                    }
                    : {}),
                ...(moveInDate && {
                    availableFrom: {
                        lte: moveInDate,
                    },
                    availableTo: {
                        gte: moveInDate,
                    },
                }),
                property: {
                    isDeleted: false,
                    isListed: true,
                    ...(location && {
                        OR: [
                            { city: { contains: location, mode: 'insensitive' } },
                            { address: { contains: location, mode: 'insensitive' } },
                            { state: { name: { contains: location, mode: 'insensitive' } } },
                        ],
                    }),
                    ...(bedrooms || bathrooms
                        ? {
                            specification: {
                                some: {
                                    residential: {
                                        ...(bedrooms && { bedrooms: { gte: bedrooms } }),
                                        ...(bathrooms && { bathrooms: { gte: bathrooms } }),
                                    },
                                },
                            },
                        }
                        : {}),
                },
            },
            include: {
                property: {
                    include: {
                        specification: true,
                        images: true,
                        landlord: true,
                    },
                },
                unit: true,
                room: true,
            },
            orderBy: { createdAt: 'desc' },
        });

        return listings;
    }

    createEnquiry = async (data: {
        tenantId: string;
        landlordId: string;
        subject: string;
        message: string;
        propertyId?: string;
        unitId?: string;
        roomId?: string;
    }) => {
        return await prismaClient.propertyEnquiry.create({ data });
    }


    getLandlordEnquiries = async (landlordId: string) => {
        return prismaClient.propertyEnquiry.findMany({
            where: { landlordId },
            include: {
                tenant: {
                    select: {
                        id: true,
                        tenantWebUserEmail: true,
                        user: {
                            select: { id: true, email: true }
                        }
                    },
                },
                property: true,
                unit: true,
                room: true,
            },
            orderBy: { createdAt: "desc" },
        });
    }
    getEnquiryById = async (id: string) => {
        return prismaClient.propertyEnquiry.findUnique({
            where: { id },
            include: { tenant: true, landlord: true, property: true, unit: true, room: true },
        });
    }

}

export default new PropertyService()