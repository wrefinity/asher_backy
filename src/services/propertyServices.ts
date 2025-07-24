import { ListingType, PriceFrequency, Prisma, PrismaClient, PropertySpecificationType } from "@prisma/client";
import { prismaClient } from "..";
import { PropertyType, MediaType, PropsSettingType } from "@prisma/client"
import { AvailabilityStatus } from "@prisma/client";
import { AdditionalRule, Booking, ICommercialDTO, IResidentialDTO, SeasonalPricing, IShortletDTO, UnavailableDate, ICreateProperty, IPropertySpecificationDTO, IBasePropertyDTO } from "../validations/interfaces/properties.interface";
import { PropertyListingDTO } from "../landlord/validations/interfaces/propsSettings"
import property from "../routes/property";

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
                                    // shortlet: {
                                    //     include: {
                                    //         unitConfigurations: {
                                    //             include: {
                                    //                 RoomDetail: true
                                    //             }
                                    //         }
                                    //     }
                                    // }
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
                throw new Error('No listings found for this landlord');
            }

            // Process each listing
            return await Promise.all(listings.map(async (listing) => {
                switch (listing.type) {
                    case ListingType.ENTIRE_PROPERTY:
                        // Get the property specification
                        const spec = listing.property.specification.find(
                            spec => spec.specificationType === listing.listAs
                        );

                        if (!spec) {
                            throw new Error(`Specification not found for property ${listing.property.id}`);
                        }

                        // Get units and rooms based on specification type
                        let units = [];
                        let rooms = [];

                        if (listing.listAs === PropertySpecificationType.RESIDENTIAL && spec.residential) {
                            units = spec.residential.unitConfigurations || [];
                            rooms = units.flatMap(unit => unit.RoomDetail || []);
                        }
                        else if (listing.listAs === PropertySpecificationType.COMMERCIAL && spec.commercial) {
                            units = spec.commercial.unitConfigurations || [];
                            rooms = units.flatMap(unit => unit.RoomDetail || []);
                        }
                        // else if (listing.listAs === PropertySpecificationType.SHORTLET && specification.shortlet) {
                        //     units = specification.shortlet.unitConfigurations || [];
                        //     rooms = units.flatMap(unit => unit.RoomDetail || []);
                        // }

                        const { specification: propertySpec, ...restx } = listing.property;
                        return {
                            listingType: ListingType.ENTIRE_PROPERTY,
                            priceFrequency: listing.priceFrequency,
                            property: restx,
                            specificationType: listing.listAs,
                            specificationDetails: {
                                residential: spec.residential,
                                commercial: spec.commercial,
                                // shortlet: specification.shortlet
                            },
                            units,
                            rooms,
                            price: listing.price,
                            availability: {
                                from: listing.availableFrom,
                                to: listing.availableTo
                            }
                        };

                    case ListingType.SINGLE_UNIT:
                        if (!listing.unit) {
                            throw new Error('Unit details not found for this listing');
                        }
                        const specification = listing.property.specification.find(
                            spec => spec.specificationType === listing.listAs
                        );

                        const { specification: specx, ...rest } = listing.property


                        return {
                            listingType: ListingType.SINGLE_UNIT,
                            property: rest,
                            unit: listing.unit,
                            specificationDetails: {
                                residential: specification.residential,
                                commercial: specification.commercial,
                            },
                            specificationType: listing.listAs,
                            price: listing.price,
                            priceFrequency: listing.priceFrequency,
                            availability: {
                                from: listing.availableFrom,
                                to: listing.availableTo
                            }
                        };

                    case ListingType.ROOM:
                        if (!listing.room) {
                            throw new Error('Room details not found for this listing');
                        }
                        const speck = listing.property.specification.find(
                            spec => spec.specificationType === listing.listAs
                        );

                        const { specification: specxx, ...resty } = listing.property

                        return {
                            listingType: ListingType.ROOM,
                            property: resty,
                            specificationDetails: {
                                residential: speck.residential,
                                commercial: speck.commercial,
                            },
                            room: listing.room,
                            unit: listing.unit,
                            specificationType: listing.listAs,
                            price: listing.price,
                            priceFrequency: listing.priceFrequency,
                            availability: {
                                from: listing.availableFrom,
                                to: listing.availableTo
                            }
                        };

                    default:
                        throw new Error(`Unknown listing type: ${listing.type}`);
                }
            }));
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
                        images: true,
                        videos: true,
                        virtualTours: true,
                        propertyDocument: true,
                        propertyListingHistory: true,
                        reviews: true,
                        UserLikedProperty: true,
                        landlord: this.landlordInclusion,
                        specification: this.specificationInclusion,
                    },
                },
                unit: true,
                room: true,
            },
            skip,
            take,
        });
        // Transform the properties to spread specifications based on listAs type
        return properties.map(property => {
            // Type assertion for the specification array
            const specification = property.property.specification as {
                residential?: any;
                commercial?: any;
                shortlet?: any;
            } | undefined;

            const { specification: _, ...propertyWithoutSpec } = property.property;
            const primarySpec = specification?.[0];

            let specData = null;
            let specificationType = primarySpec?.specificationType;
            let propertySubType = primarySpec?.propertySubType;

            // Type-safe specification extraction
            if (primarySpec) {
                switch (property.listAs) {
                    case PropertySpecificationType.COMMERCIAL:
                        if (primarySpec.commercial) {
                            const { id, ...restCommercial } = primarySpec.commercial
                            specData = { ...restCommercial, commercialPropertyId: id };
                        }
                        break;
                    case PropertySpecificationType.RESIDENTIAL:
                        if (primarySpec.residential) {
                            specData = primarySpec.residential;

                            const { id, ...restResidential } = primarySpec.residential
                            specData = { ...restResidential, residentialPropertyId: id };
                        }
                        break;
                    case PropertySpecificationType.SHORTLET:
                        if (primarySpec.shortlet) {


                            specData = primarySpec.shortlet;

                            const { id, ...restShortlet } = primarySpec.shortlet
                            specData = { ...restShortlet, shortletPropertyId: id };
                        }
                        break;
                }
            }

            return {
                ...property,
                property: {
                    ...propertyWithoutSpec,
                    // Only include spec data if it exists
                    ...(specData ? specData : {}),
                    specificationType,
                    propertySubType,
                    // Include all specifications for reference if needed
                    allSpecifications: specification
                }
            };
        });
    };

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

    // async createPropertyListing(data: PropertyListingDTO | any) {
    //     const { propertyId, unitId: unitIds, roomId: roomIds, ...baseData } = data;

    //     // const propListed = await this.getPropsListedById(propertyId);
    //     // if (propListed) {
    //     //     throw new Error(`The property with ID ${propertyId} has already been listed`);
    //     // }
    //     const listings = [];
    //     // If unitIds exist, iterate and create listing for each unit
    //     if (Array.isArray(unitIds)) {
    //         for (const unitId of unitIds) {
    //             if (unitId) { // Ensure unitId is not null/undefined
    //                 const created = await prismaClient.propertyListingHistory.create({
    //                     data: {
    //                         ...baseData,
    //                         propertyId,
    //                         unitId,
    //                         roomId: null
    //                     },
    //                 });
    //                 listings.push(created);
    //                 await prismaClient.unitConfiguration.update({
    //                     where: { id: unitId },
    //                     data: { isListed: true }
    //                 });
    //             }
    //         }
    //     }

    //     // If roomIds exist, iterate and create listing for each room
    //     if (Array.isArray(roomIds)) {
    //         for (const roomId of roomIds) {
    //             if (roomId) { // Ensure roomId is not null/undefined
    //                 const created = await prismaClient.propertyListingHistory.create({
    //                     data: {
    //                         ...baseData,
    //                         propertyId,
    //                         roomId,
    //                         unitId: null
    //                     },
    //                 });
    //                 listings.push(created);
    //             }
    //         }
    //     }

    //     // If neither roomIds nor unitIds were provided, create one general listing
    //     // Handle ENTIRE_PROPERTY listing (no specific units/rooms)
    //     if ( data.type === ListingType.ENTIRE_PROPERTY &&
    //         (!unitIds || unitIds.length === 0 || unitIds.every(id => !id)) &&
    //         (!roomIds || roomIds.length === 0 || roomIds.every(id => !id))
    //     ) {
    //         const created = await prismaClient.propertyListingHistory.create({
    //             data: {
    //                 ...baseData,
    //                 propertyId,
    //                 type: ListingType.ENTIRE_PROPERTY,
    //                 unitId: null,
    //                 roomId: null
    //             },
    //         });
    //         listings.push(created);

    //          // property's isListed status
    //          await prismaClient.properties.update({
    //             where: { id: propertyId },
    //             data: { isListed: true }
    //         });
    //     }

   

    //     if (listings.length === 0) {
    //         throw new Error('No valid listings were created - check your unitIds and roomIds');
    //     }

    //     return listings;
    // }

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
    
        // Check for existing ENTIRE_PROPERTY listing
        if (type === ListingType.ENTIRE_PROPERTY && unitIds.length === 0 && roomIds.length === 0) {
            const existing = await prismaClient.propertyListingHistory.findFirst({
                where: {
                    propertyId,
                    type: ListingType.ENTIRE_PROPERTY,
                    onListing: true
                }
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
    
            const existing = await prismaClient.propertyListingHistory.findFirst({
                where: {
                    unitId,
                    onListing: true
                }
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
    
            const existing = await prismaClient.propertyListingHistory.findFirst({
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
            const created = await prismaClient.propertyListingHistory.create({
                data: {
                    ...baseData,
                    propertyId: propertyId,
                    unitId:unitId,
                    roomId: null,
                    type: ListingType.SINGLE_UNIT
                }
                
            });
            response.listings.push(created);
            await prismaClient.unitConfiguration.update({
                where: { id: unitId },
                data: { isListed: true }
            });
        }
    
        // Create listings for new rooms
        for (const roomId of response.newlyListed.rooms) {
            const created = await prismaClient.propertyListingHistory.create({
                data: {
                    ...baseData,
                    propertyId:propertyId,
                    roomId:roomId,
                    unitId: null,
                    type: ListingType.ROOM
                }
            });
            response.listings.push(created);
            await prismaClient.roomDetail.update({
                where: { id: roomId },
                data: { isListed: true }
            });
        }
    
        // Create ENTIRE_PROPERTY listing if applicable
        if (type === ListingType.ENTIRE_PROPERTY && unitIds.length === 0 && roomIds.length === 0) {
            const created = await prismaClient.propertyListingHistory.create({
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
            await prismaClient.properties.update({
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
    }


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
                                    residential: true,
                                    commercial: true,
                                    shortlet: true
                                },
                                take: 1 // Only get one specification
                            },
                            state: true,
                            images: true,
                            landlord: {
                                include: {
                                    user: {
                                        select: {
                                            email: true,
                                            profile: {
                                                select: {
                                                    fullname: true,
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

            // Get the first active specification or null
            const activeSpecification = listing.property?.specification[0] || null;

            // Transform the specification to include IDs
            const transformedSpecification = activeSpecification ? {
                ...activeSpecification,
                residentialId: activeSpecification.residential?.id ?? null,
                commercialId: activeSpecification.commercial?.id ?? null,
                shortletId: activeSpecification.shortlet?.id ?? null
            } : null;

            return {
                property: {
                    ...listing.property,
                    specification: transformedSpecification
                },
                id: listing.id,
                applicationFeeAmount: listing.applicationFeeAmount,
                payApplicationFee: listing.payApplicationFee,
                isActive: listing.isActive,
                onListing: listing.onListing,
                listAs: listing.listAs,
                propertySubType: listing.propertySubType,
                price: listing.price,
                priceFrequency: listing.priceFrequency,
                securityDeposit: listing.securityDeposit,
                minStayDays: listing.minStayDays,
                maxStayDays: listing.maxStayDays,
                availableFrom: listing.availableFrom,
                availableTo: listing.availableTo,
                type: listing.type,
                specification: transformedSpecification,
                room: listing.room,
                unit: listing.unit
            };
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


            // Separate media by type
            const images = uploadedFiles?.filter(file => file?.identifier === 'MediaTable' && file?.type === MediaType.IMAGE);
            const videos = uploadedFiles?.filter(file => file?.identifier === 'MediaTable' && file?.type === MediaType.VIDEO);
            const virtualTours = uploadedFiles?.filter(file => file?.identifier === 'MediaTable' && file?.type === MediaType.VIRTUAL_TOUR);
            const documents = uploadedFiles?.filter(file => file?.identifier === 'DocTable');

            // Create the main property
            const property = await tx.properties.create({
                data: {
                    ...rest,
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
                bills: {
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
                            price: room.price,
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
                            count: unit.count,
                            price: unit.price,
                            priceFrequency: unit.priceFrequency,
                            area: unit.area,
                            description: unit.description,
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

            // Create or reuse specification based on target type
            switch (data.specificationType) {
                case PropertySpecificationType.COMMERCIAL:
                    return this.handleCommercialSwitch(tx, specification.commercial, propertyId, property.specification?.[0],);
                case PropertySpecificationType.RESIDENTIAL:
                    return this.handleResidentialSwitch(tx, specification.residential, propertyId, property.specification?.[0]);
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
        // Search all three entities in parallel
        const [property, unit, room] = await Promise.all([
            prismaClient.properties.findFirst({
                where: {
                    id, isDeleted: false,
                    propertyListingHistory: {
                        some: {
                            isActive: true,
                            onListing: true
                        }
                    }
                }
            }),
            prismaClient.unitConfiguration.findFirst({
                where: { id, isDeleted: false }
            }),
            prismaClient.roomDetail.findFirst({
                where: { id, isDeleted: false }
            })
        ]);
        // Determine which entity was found
        let result;
        if (property) {
            result = { type: 'property', data: property };
        } else if (unit) {
            result = { type: 'unit', data: unit };
        } else if (room) {
            result = { type: 'room', data: room };
        } else {
            throw new Error('No matching property, unit, or room found');
        }
        return result;
    }
}

export default new PropertyService()