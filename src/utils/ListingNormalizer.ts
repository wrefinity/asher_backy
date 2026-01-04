import { extractLandlord as extractLandlordUtil } from './landlordExtractor';

/**
 * Normalized Listing Interface
 * This is the consistent structure all listing endpoints should return
 */
export interface NormalizedListing {
    // Core Listing Info
    listingId: string;
    listingType: 'ENTIRE_PROPERTY' | 'SINGLE_UNIT' | 'ROOM';
    isActive: boolean;
    onListing: boolean;
    createdAt: string | Date;

    // Pricing (from listing, fallback to room/unit/property)
    price: string;
    priceFrequency: string | null;
    securityDeposit: string;
    applicationFeeAmount: string | null;
    payApplicationFee: boolean;

    // Availability
    availableFrom: string | Date | null;
    availableTo: string | Date | null;

    // What's Being Listed (only one will be populated)
    listingEntity: {
        type: 'property' | 'unit' | 'room';
        id: string;
        name: string;
        // Room/Unit specific data
        roomName?: string;
        roomSize?: string;
        unitType?: string;
        unitNumber?: string;
        // Images for this specific entity
        images: Array<{ id: string; url: string; caption: string; isPrimary?: boolean }>;
        // Price override (if different from listing price)
        entityPrice?: string;
        entityPriceFrequency?: string;
        // Room/Unit specific fields
        ensuite?: boolean;
        furnished?: boolean;
        description?: string | null;
        availability?: string;
    };

    // Property Context (always included)
    property: {
        id: string;
        name: string;
        description: string | null;
        address: string;
        city: string;
        state: { id: string; name: string };
        country: string;
        zipcode: string;
        longitude: string | null;
        latitude: string | null;
        // Property-level images (for ENTIRE_PROPERTY or fallback)
        images: Array<{ id: string; url: string; caption: string; isPrimary?: boolean }>;
        videos: Array<{ id: string; url: string; caption: string }>;
        // Basic property info
        bedrooms?: number;
        bathrooms?: number;
        propertySubType?: string | null;
        specificationType: 'RESIDENTIAL' | 'COMMERCIAL' | 'SHORTLET';
        // Property-level amenities/features (for inheritance)
        keyFeatures: string[];
        customKeyFeatures: string[];
        landlord: {
            id: string;
            landlordCode: string;
            userId?: string;
            user: {
                id: string;
                email: string;
                profile: {
                    fullname: string;
                    firstName: string;
                    lastName: string;
                    profileUrl: string | null;
                };
            };
        };
    };

    // Specification Details (only essential fields)
    specification: {
        type: 'RESIDENTIAL' | 'COMMERCIAL' | 'SHORTLET';
        residential?: {
            bedrooms: number;
            bathrooms: number;
            status: string;
            furnished: boolean | null;
            tenure: string | null;
            totalArea: string | null;
            areaUnit: string | null;
            buildingAmenityFeatures: string[];
            safetyFeatures: string[];
            epcRating: string | null;
            heatingTypes: string[];
            coolingTypes: string[];
            glazingTypes: string | null;
            // Shared facilities
            sharedFacilities?: {
                kitchen: boolean;
                bathroom: boolean;
                livingRoom: boolean;
                garden: boolean;
                garage: boolean;
                laundry: boolean;
                parking: boolean;
            };
        };
        commercial?: {
            // Add essential commercial fields if needed
        };
    };

    // Hierarchy (for navigation)
    hierarchy: {
        level: 'property' | 'unit' | 'room';
        propertyId: string;
        unitId?: string | null;
        roomId?: string | null;
        breadcrumb: Array<{
            id: string;
            name: string;
            type: 'property' | 'unit' | 'room';
            url: string | null; // null if entity is not listed
        }>;
        context: string;
    };

    // Related Listings (other units/rooms in same property)
    relatedListings: {
        units: Array<{ id: string; name: string; price: string }>;
        rooms: Array<{ id: string; name: string; price: string }>;
        totalCount: number;
    };
}

/**
 * Listing Normalizer Class
 * Transforms raw listing data from database into consistent normalized structure
 */
export class ListingNormalizer {
    /**
     * Normalize a single listing
     * @param listing - The listing object
     * @param propertyListingId - Optional: If property itself is listed, pass its listing ID
     */
    static normalize(listing: any, propertyListingId?: string | null): NormalizedListing {
        const listingType = listing.type || listing.listingType;

        // Determine what's being listed
        const listingEntity = this.extractListingEntity(listing, listingType);

        // Extract property context
        const property = this.extractPropertyContext(listing);

        // Extract specification (essential fields only)
        const specification = this.extractSpecification(listing);

        // Build hierarchy (pass propertyListingId if available)
        const hierarchy = this.buildHierarchy(listing, listingType, propertyListingId);

        // Get correct price (listing price or fallback)
        const price = this.getCorrectPrice(listing, listingEntity);
        const priceFrequency = this.getCorrectPriceFrequency(listing, listingEntity);

        // Get images (entity images + property images as fallback)
        const entityImages = this.getEntityImages(listing, listingType, listingEntity);

        // Merge entity with images
        listingEntity.images = entityImages;

        return {
            listingId: listing.id,
            listingType: listingType as 'ENTIRE_PROPERTY' | 'SINGLE_UNIT' | 'ROOM',
            isActive: listing.isActive ?? true,
            onListing: listing.onListing ?? true,
            createdAt: listing.createdAt,
            price,
            priceFrequency,
            securityDeposit: this.convertDecimalToString(listing.securityDeposit) || '0',
            applicationFeeAmount: this.convertDecimalToString(listing.applicationFeeAmount),
            payApplicationFee: listing.payApplicationFee ?? false,
            availableFrom: listing.availableFrom,
            availableTo: listing.availableTo,
            listingEntity,
            property,
            specification,
            hierarchy,
            relatedListings: {
                units: [],
                rooms: [],
                totalCount: 0
            }
        };
    }

    /**
     * Normalize multiple listings
     */
    static normalizeMany(listings: any[]): NormalizedListing[] {
        return listings.map(listing => this.normalize(listing));
    }

    /**
     * Extract what's being listed (property/unit/room)
     */
    private static extractListingEntity(listing: any, listingType: string): NormalizedListing['listingEntity'] {
        const property = listing.property || listing;

        if (listingType === 'ROOM' && listing.room) {
            const room = listing.room;
            return {
                type: 'room',
                id: room.id,
                name: room.roomName || 'Unnamed Room',
                roomName: room.roomName,
                roomSize: room.roomSize,
                ensuite: room.ensuite ?? false,
                furnished: room.furnished ?? false,
                description: room.description || property.description || null, // Inherit from property if not available
                availability: room.availability || 'VACANT',
                entityPrice: room.price,
                entityPriceFrequency: room.priceFrequency || null,
                images: [] // Will be populated later
            };
        }

        if (listingType === 'SINGLE_UNIT' && listing.unit) {
            const unit = listing.unit;
            return {
                type: 'unit',
                id: unit.id,
                name: `${unit.unitType || 'Unit'} ${unit.unitNumber || ''}`.trim() || 'Unnamed Unit',
                unitType: unit.unitType,
                unitNumber: unit.unitNumber,
                furnished: unit.furnished ?? false,
                description: unit.description || property.description || null, // Inherit from property if not available
                availability: unit.availability || 'VACANT',
                entityPrice: unit.price,
                entityPriceFrequency: unit.priceFrequency || null,
                images: [] // Will be populated later
            };
        }

        // ENTIRE_PROPERTY
        return {
            type: 'property',
            id: property.id,
            name: property.name,
            description: property.description || null,
            images: [] // Will be populated later
        };
    }

    /**
     * Extract property context (always the same structure)
     */
    private static extractPropertyContext(listing: any): NormalizedListing['property'] {
        const property = listing.property || listing;
        const state = property.state || {};

        return {
            id: property.id,
            name: property.name,
            description: property.description || null,
            address: property.address || '',
            city: property.city || '',
            state: {
                id: state.id || property.stateId || '',
                name: state.name || ''
            },
            country: property.country || '',
            zipcode: property.zipcode || '',
            longitude: property.longitude ? String(property.longitude) : null,
            latitude: property.latitude ? String(property.latitude) : null,
            images: this.extractMediaFiles(property.images || []),
            videos: this.extractMediaFiles(property.videos || []),
            bedrooms: property.bedrooms || this.getBedroomsFromSpec(property),
            bathrooms: property.bathrooms || this.getBathroomsFromSpec(property),
            propertySubType: property.propertySubType || null,
            specificationType: property.specificationType || 'RESIDENTIAL',
            keyFeatures: property.keyFeatures || [],
            customKeyFeatures: property.customKeyFeatures || [],
            landlord: this.extractLandlord(property.landlord)
        };
    }

    /**
     * Extract specification (essential fields only)
     */
    private static extractSpecification(listing: any): NormalizedListing['specification'] {
        const property = listing.property || listing;
        const specType = listing.listAs || property.specificationType || 'RESIDENTIAL';

        // Find the specification
        let spec = null;
        if (property.specification && Array.isArray(property.specification)) {
            spec = property.specification.find((s: any) => s.specificationType === specType);
        } else if (property.specification) {
            spec = property.specification;
        } else if (listing.specificationDetails) {
            spec = listing.specificationDetails;
        }

        const residential = spec?.residential || property.residential || null;

        return {
            type: specType as 'RESIDENTIAL' | 'COMMERCIAL' | 'SHORTLET',
            residential: residential ? {
                bedrooms: residential.bedrooms || 0,
                bathrooms: residential.bathrooms || 0,
                status: residential.status || 'FOR_RENT',
                furnished: residential.furnished ?? null,
                tenure: residential.tenure || null,
                totalArea: residential.totalArea || null,
                areaUnit: residential.areaUnit || null,
                buildingAmenityFeatures: residential.buildingAmenityFeatures || [],
                safetyFeatures: residential.safetyFeatures || [],
                epcRating: residential.epcRating || null,
                heatingTypes: residential.heatingTypes || [],
                coolingTypes: residential.coolingTypes || [],
                glazingTypes: residential.glazingTypes || null,
                sharedFacilities: residential.sharedFacilities || null
            } : undefined,
            commercial: spec?.commercial || property.commercial || undefined
        };
    }

    /**
     * Build hierarchy breadcrumb
     * @param listing - The listing object
     * @param listingType - The type of listing (ENTIRE_PROPERTY, SINGLE_UNIT, ROOM)
     * @param propertyListingId - Optional: If property itself is listed, pass its listing ID
     */
    private static buildHierarchy(listing: any, listingType: string, propertyListingId?: string | null): NormalizedListing['hierarchy'] {
        const property = listing.property || listing;
        const breadcrumb: NormalizedListing['hierarchy']['breadcrumb'] = [];
        let level: 'property' | 'unit' | 'room' = 'property';
        let context = property.name;

        // Determine property URL:
        // - If this listing is for the ENTIRE_PROPERTY, use this listing's ID
        // - If propertyListingId is provided, use it
        // - Otherwise, property is not listed, so URL will be null
        let propertyUrl: string | null = null;
        if (listingType === 'ENTIRE_PROPERTY') {
            // Property itself is listed, use this listing ID
            propertyUrl = `/property/${listing.id}`;
        } else if (propertyListingId) {
            // Property has a separate listing, use that listing ID
            propertyUrl = `/property/${propertyListingId}`;
        }
        // Note: If property is not listed, URL will be null and frontend should render as plain text

        // Always start with property
        breadcrumb.push({
            id: property.id,
            name: property.name,
            type: 'property',
            url: propertyUrl // null if property not listed (frontend will handle)
        });

        if (listingType === 'SINGLE_UNIT' && listing.unit) {
            level = 'unit';
            const unit = listing.unit;
            const unitName = `${unit.unitType || 'Unit'} ${unit.unitNumber || ''}`.trim();
            breadcrumb.push({
                id: unit.id,
                name: unitName,
                type: 'unit',
                url: `/property/${listing.id}` // Listing ID for unit listing
            });
            context = `${unitName} in ${property.name}`;
        }

        if (listingType === 'ROOM' && listing.room) {
            level = 'room';
            const room = listing.room;

            // Add unit if it exists
            if (listing.unit) {
                const unit = listing.unit;
                const unitName = `${unit.unitType || 'Unit'} ${unit.unitNumber || ''}`.trim();
                breadcrumb.push({
                    id: unit.id,
                    name: unitName,
                    type: 'unit',
                    url: `/property/${unit.id}`
                });
                // Room is in a unit
                context = `${room.roomName || 'Unnamed Room'} in ${unitName} in ${property.name}`;
            } else {
                // Room is directly in property (no unit)
                context = `${room.roomName || 'Unnamed Room'} in ${property.name}`;
            }

            breadcrumb.push({
                id: room.id,
                name: room.roomName || 'Unnamed Room',
                type: 'room',
                url: `/property/${listing.id}` // Listing ID for room listing
            });
        }

        return {
            level,
            propertyId: property.id,
            unitId: listing.unit?.id || null,
            roomId: listing.room?.id || null,
            breadcrumb,
            context
        };
    }

    /**
     * Get correct price (listing price or fallback to entity/property price)
     */
    private static getCorrectPrice(listing: any, listingEntity: NormalizedListing['listingEntity']): string {
        // If listing has a price > 0, use it
        const listingPrice = this.convertDecimalToString(listing.price);
        if (listingPrice && parseFloat(listingPrice) > 0) {
            return listingPrice;
        }

        // Fallback to entity price
        if (listingEntity.entityPrice) {
            return listingEntity.entityPrice;
        }

        // Fallback to property price
        const property = listing.property || listing;
        const propertyPrice = this.convertDecimalToString(property.price);
        if (propertyPrice && parseFloat(propertyPrice) > 0) {
            return propertyPrice;
        }

        return '0';
    }

    /**
     * Get correct price frequency
     */
    private static getCorrectPriceFrequency(listing: any, listingEntity: NormalizedListing['listingEntity']): string | null {
        if (listing.priceFrequency) {
            return listing.priceFrequency;
        }

        if (listingEntity.entityPriceFrequency) {
            return listingEntity.entityPriceFrequency;
        }

        const property = listing.property || listing;
        return property.priceFrequency || null;
    }

    /**
     * Get entity images (room/unit images + property images as fallback)
     */
    private static getEntityImages(listing: any, listingType: string, listingEntity: NormalizedListing['listingEntity']): Array<{ id: string; url: string; caption: string; isPrimary: boolean }> {
        const property = listing.property || listing;
        let images: any[] = [];

        // For ROOM: room images first, then property images
        if (listingType === 'ROOM' && listing.room) {
            images = listing.room.images || [];
            // Add property images as fallback if room has no images
            if (images.length === 0 && property.images) {
                images = property.images;
            }
        }
        // For SINGLE_UNIT: unit images first, then property images
        else if (listingType === 'SINGLE_UNIT' && listing.unit) {
            images = listing.unit.images || [];
            // Add property images as fallback if unit has no images
            if (images.length === 0 && property.images) {
                images = property.images;
            }
        }
        // For ENTIRE_PROPERTY: property images only
        else {
            images = property.images || [];
        }

        return this.extractMediaFiles(images);
    }

    /**
     * Extract media files (images/videos) in consistent format
     */
    private static extractMediaFiles(media: any[]): Array<{ id: string; url: string; caption: string; isPrimary: boolean }> {
        if (!Array.isArray(media)) return [];

        return media.map((item: any) => ({
            id: item.id,
            url: item.url,
            caption: item.caption || '',
            isPrimary: item.isPrimary ?? false
        }));
    }

    /**
     * Extract landlord info
     * Uses shared extractor utility for consistency
     */
    private static extractLandlord(landlord: any): NormalizedListing['property']['landlord'] {
        return extractLandlordUtil(landlord);
    }

    /**
     * Get bedrooms from specification
     */
    private static getBedroomsFromSpec(property: any): number | undefined {
        if (property.bedrooms) return property.bedrooms;

        const spec = property.specification;
        if (Array.isArray(spec)) {
            const residential = spec.find((s: any) => s.residential)?.residential;
            return residential?.bedrooms;
        }

        return property.residential?.bedrooms;
    }

    /**
     * Get bathrooms from specification
     */
    private static getBathroomsFromSpec(property: any): number | undefined {
        if (property.bathrooms) return property.bathrooms;

        const spec = property.specification;
        if (Array.isArray(spec)) {
            const residential = spec.find((s: any) => s.residential)?.residential;
            return residential?.bathrooms;
        }

        return property.residential?.bathrooms;
    }

    /**
     * Convert Prisma Decimal to string
     */
    private static convertDecimalToString(value: any): string | null {
        if (value === null || value === undefined) return null;
        if (typeof value === 'string') return value;
        if (typeof value === 'number') return String(value);
        // Prisma Decimal
        if (value.toString) return value.toString();
        return null;
    }

    /**
     * Get related listings for a property
     * This should be called separately and merged into the normalized listing
     */
    static async getRelatedListings(propertyId: string, excludeListingId: string, prismaClient: any): Promise<NormalizedListing['relatedListings']> {
        try {
            const related = await prismaClient.propertyListingHistory.findMany({
                where: {
                    propertyId,
                    id: { not: excludeListingId },
                    onListing: true,
                    isActive: true
                },
                include: {
                    unit: true,
                    room: true
                }
            });

            const units = related.filter((r: any) => r.type === 'SINGLE_UNIT');
            const rooms = related.filter((r: any) => r.type === 'ROOM');

            return {
                units: units.map((u: any) => ({
                    id: u.id,
                    name: `${u.unit?.unitType || 'Unit'} ${u.unit?.unitNumber || ''}`.trim() || 'Unnamed Unit',
                    price: this.convertDecimalToString(u.price) || this.convertDecimalToString(u.unit?.price) || '0'
                })),
                rooms: rooms.map((r: any) => ({
                    id: r.id,
                    name: r.room?.roomName || 'Unnamed Room',
                    price: this.convertDecimalToString(r.price) || this.convertDecimalToString(r.room?.price) || '0'
                })),
                totalCount: units.length + rooms.length
            };
        } catch (error: any) {
            // Handle connection pool exhaustion gracefully
            if (error?.code === 'P2037' || error?.message?.includes('connection') || error?.message?.includes('too many clients')) {
                console.warn(`Database connection pool exhausted while fetching related listings for property ${propertyId}. Returning empty related listings.`);
                // Return empty related listings instead of failing
                return {
                    units: [],
                    rooms: [],
                    totalCount: 0
                };
            }
            // Re-throw other errors
            throw error;
        }
    }
}
