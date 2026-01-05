/**
 * Viewing Invite Normalizer
 * Normalizes viewing invite data by fetching and merging the actual listing
 * 
 * This ensures we work with the actual listed item (room/unit/property)
 * rather than manually extracting data from the property object
 */

import { ListingNormalizer, NormalizedListing } from './ListingNormalizer';
import propertyServices from '../services/propertyServices';

export interface NormalizedViewingInvite {
  // Original invite data
  id: string;
  isDeleted: boolean;
  applicationFee: string | null;
  createdAt: string | Date;
  updatedAt: string | Date;
  scheduleDate: string | Date | null;
  reScheduleDate: string | Date | null;
  response: string;
  responseStepsCompleted: string[];
  propertiesId: string;
  invitedByLandordId: string;
  tenantsId: string | null;
  userInvitedId: string;
  enquiryId: string;
  roomId: string | null;
  unitId: string | null;
  propertyListingId: string | null;
  
  // User who was invited
  userInvited: any;
  
  // Enquiry info
  enquires: any | null;
  
  // The actual listing (normalized) - this is what frontend should use
  listing: NormalizedListing | null;
  
  // Fallback property data (if listing fetch fails)
  properties: any | null;
  rooms: any | null;
  units: any | null;
  propertyListing: any | null;
}

export class ViewingInviteNormalizer {
  /**
   * Normalize a single viewing invite
   * Fetches the actual listing using propertyListingId from enquiry
   * 
   * @param invite - Raw invite data from API
   * @returns Normalized viewing invite with listing
   */
  static async normalize(invite: any): Promise<NormalizedViewingInvite> {
    // Get propertyListingId from enquiry (it's stored there)
    const propertyListingId = invite?.enquires?.propertyListingId || invite?.enquiry?.propertyListingId || invite?.propertyListingId;
    const propertyId = invite?.propertiesId || invite?.properties?.id;
    const roomId = invite?.roomId;
    const unitId = invite?.unitId;
    
    let listing: NormalizedListing | null = null;
    let property: any = invite?.properties || null;
    let rooms = invite?.rooms || null;
    let units = invite?.units || null;
    let propertyListing = invite?.propertyListing || null;
    
    // Try to fetch the actual listing if propertyListingId exists
    if (propertyListingId) {
      try {
        const normalizedListing = await propertyServices.getPropertyListingByListingIdNew(propertyListingId);
        if (normalizedListing) {
          listing = normalizedListing;
          // Use normalized property from listing if available
          if (normalizedListing?.property) {
            property = normalizedListing.property;
          }
        }
      } catch (error) {
        console.warn('Failed to fetch listing for viewing invite:', error);
        // Fallback: try to construct listing from rooms/units if available
        if (roomId && rooms) {
          // Construct a mock listing from room data
          listing = this.constructListingFromRoom(rooms, property, propertyListingId);
        } else if (unitId && units) {
          // Construct a mock listing from unit data
          listing = this.constructListingFromUnit(units, property, propertyListingId);
        }
      }
    } else if (roomId && rooms) {
      // If no propertyListingId but we have room data, construct listing
      listing = this.constructListingFromRoom(rooms, property, null);
    } else if (unitId && units) {
      // If no propertyListingId but we have unit data, construct listing
      listing = this.constructListingFromUnit(units, property, null);
    } else if (propertyId) {
      // Last resort: fetch property by ID to get full details
      try {
        const propertyData = await propertyServices.getPropertyById(propertyId);
        if (propertyData) {
          property = propertyData;
        }
      } catch (propError) {
        console.warn('Failed to fetch property details:', propError);
      }
    }
    
    return {
      // Original invite fields
      id: invite.id,
      isDeleted: invite.isDeleted,
      applicationFee: invite.applicationFee,
      createdAt: invite.createdAt,
      updatedAt: invite.updatedAt,
      scheduleDate: invite.scheduleDate,
      reScheduleDate: invite.reScheduleDate,
      response: invite.response,
      responseStepsCompleted: invite.responseStepsCompleted || [],
      propertiesId: invite.propertiesId,
      invitedByLandordId: invite.invitedByLandordId,
      tenantsId: invite.tenantsId,
      userInvitedId: invite.userInvitedId,
      enquiryId: invite.enquiryId,
      roomId: invite.roomId,
      unitId: invite.unitId,
      propertyListingId: propertyListingId || invite.propertyListingId,
      
      // Related data
      userInvited: invite.userInvited,
      enquires: invite.enquires,
      properties: property,
      rooms: rooms,
      units: units,
      propertyListing: propertyListing,
      
      // The normalized listing (this is what frontend should use)
      listing: listing,
    };
  }

  /**
   * Normalize multiple viewing invites
   */
  static async normalizeMany(invites: any[]): Promise<NormalizedViewingInvite[]> {
    return Promise.all(invites.map(invite => this.normalize(invite)));
  }

  /**
   * Construct a normalized listing from room data when listing fetch fails
   */
  private static constructListingFromRoom(room: any, property: any, propertyListingId: string | null): NormalizedListing {
    const listingType: 'ENTIRE_PROPERTY' | 'SINGLE_UNIT' | 'ROOM' = 'ROOM';
    
    return {
      listingId: propertyListingId || `room-${room.id}`,
      listingType,
      isActive: room.isListed ?? true,
      onListing: room.isListed ?? true,
      createdAt: new Date().toISOString(),
      price: room.price || property?.price || '0',
      priceFrequency: room.priceFrequency || property?.priceFrequency || null,
      securityDeposit: property?.securityDeposit || '0',
      applicationFeeAmount: null,
      payApplicationFee: false,
      availableFrom: null,
      availableTo: null,
      listingEntity: {
        type: 'room',
        id: room.id,
        name: room.roomName || 'Unnamed Room',
        roomName: room.roomName,
        roomSize: room.roomSize,
        ensuite: room.ensuite ?? false,
        furnished: room.furnished ?? false,
        description: room.description || property?.description || null,
        availability: room.availability || 'VACANT',
        entityPrice: room.price,
        entityPriceFrequency: room.priceFrequency || null,
        images: (room.images || []).map((img: any) => ({
          id: img.id,
          url: img.url,
          caption: img.caption || '',
          isPrimary: img.isPrimary || false
        }))
      },
      property: {
        id: property?.id || '',
        name: property?.name || '',
        description: property?.description || null,
        address: property?.address || '',
        city: property?.city || '',
        state: property?.state || { id: '', name: '' },
        country: property?.country || '',
        zipcode: property?.zipcode || '',
        longitude: property?.longitude ? String(property.longitude) : null,
        latitude: property?.latitude ? String(property.latitude) : null,
        images: (property?.images || []).map((img: any) => ({
          id: img.id,
          url: img.url,
          caption: img.caption || '',
          isPrimary: img.isPrimary || false
        })),
        videos: [],
        // Extract bedrooms/bathrooms from specification if not directly on property
        bedrooms: property?.bedrooms ?? 
          (property?.specification?.residential?.bedrooms ?? null),
        bathrooms: property?.bathrooms ?? 
          (property?.specification?.residential?.bathrooms ?? null),
        propertySubType: property?.propertySubType || null,
        specificationType: property?.specificationType || 'RESIDENTIAL',
        keyFeatures: property?.keyFeatures || [],
        customKeyFeatures: property?.customKeyFeatures || [],
        landlord: property?.landlord ? {
          id: property.landlord.id,
          landlordCode: property.landlord.landlordCode || '',
          userId: property.landlord.userId || property.landlord.user?.id,
          user: {
            id: property.landlord.user?.id || property.landlord.userId || '',
            email: property.landlord.user?.email || '',
            profile: {
              fullname: property.landlord.user?.profile?.fullname || '',
              firstName: property.landlord.user?.profile?.firstName || '',
              lastName: property.landlord.user?.profile?.lastName || '',
              profileUrl: property.landlord.user?.profile?.profileUrl || null
            }
          }
        } : {
          id: '',
          landlordCode: '',
          user: {
            id: '',
            email: '',
            profile: {
              fullname: '',
              firstName: '',
              lastName: '',
              profileUrl: null
            }
          }
        }
      },
      specification: {
        type: property?.specificationType || 'RESIDENTIAL',
        residential: property?.specification?.[0]?.residential || null
      },
      hierarchy: {
        level: 'room' as const,
        propertyId: property?.id || '',
        unitId: null,
        roomId: room.id,
        breadcrumb: [
          {
            id: property?.id || '',
            name: property?.name || '',
            type: 'property' as const,
            url: null
          },
          {
            id: room.id,
            name: room.roomName || 'Unnamed Room',
            type: 'room' as const,
            url: propertyListingId ? `/property/${propertyListingId}` : null
          }
        ],
        context: `${room.roomName || 'Unnamed Room'} in ${property?.name || 'Property'}`
      },
      relatedListings: {
        units: [],
        rooms: [],
        totalCount: 0
      }
    };
  }

  /**
   * Construct a normalized listing from unit data when listing fetch fails
   */
  private static constructListingFromUnit(unit: any, property: any, propertyListingId: string | null): NormalizedListing {
    const listingType: 'ENTIRE_PROPERTY' | 'SINGLE_UNIT' | 'ROOM' = 'SINGLE_UNIT';
    
    return {
      listingId: propertyListingId || `unit-${unit.id}`,
      listingType,
      isActive: true,
      onListing: true,
      createdAt: new Date().toISOString(),
      price: unit.price || property?.price || '0',
      priceFrequency: unit.priceFrequency || property?.priceFrequency || null,
      securityDeposit: property?.securityDeposit || '0',
      applicationFeeAmount: null,
      payApplicationFee: false,
      availableFrom: null,
      availableTo: null,
      listingEntity: {
        type: 'unit',
        id: unit.id,
        name: `${unit.unitType || 'Unit'} ${unit.unitNumber || ''}`.trim() || 'Unnamed Unit',
        unitType: unit.unitType,
        unitNumber: unit.unitNumber,
        furnished: unit.furnished ?? false,
        description: unit.description || property?.description || null,
        availability: unit.availability || 'VACANT',
        entityPrice: unit.price,
        entityPriceFrequency: unit.priceFrequency || null,
        images: (unit.images || []).map((img: any) => ({
          id: img.id,
          url: img.url,
          caption: img.caption || '',
          isPrimary: img.isPrimary || false
        }))
      },
      property: {
        id: property?.id || '',
        name: property?.name || '',
        description: property?.description || null,
        address: property?.address || '',
        city: property?.city || '',
        state: property?.state || { id: '', name: '' },
        country: property?.country || '',
        zipcode: property?.zipcode || '',
        longitude: property?.longitude ? String(property.longitude) : null,
        latitude: property?.latitude ? String(property.latitude) : null,
        images: (property?.images || []).map((img: any) => ({
          id: img.id,
          url: img.url,
          caption: img.caption || '',
          isPrimary: img.isPrimary || false
        })),
        videos: [],
        // Extract bedrooms/bathrooms from specification if not directly on property
        bedrooms: property?.bedrooms ?? 
          (property?.specification?.residential?.bedrooms ?? null),
        bathrooms: property?.bathrooms ?? 
          (property?.specification?.residential?.bathrooms ?? null),
        propertySubType: property?.propertySubType || null,
        specificationType: property?.specificationType || 'RESIDENTIAL',
        keyFeatures: property?.keyFeatures || [],
        customKeyFeatures: property?.customKeyFeatures || [],
        landlord: property?.landlord ? {
          id: property.landlord.id,
          landlordCode: property.landlord.landlordCode || '',
          userId: property.landlord.userId || property.landlord.user?.id,
          user: {
            id: property.landlord.user?.id || property.landlord.userId || '',
            email: property.landlord.user?.email || '',
            profile: {
              fullname: property.landlord.user?.profile?.fullname || '',
              firstName: property.landlord.user?.profile?.firstName || '',
              lastName: property.landlord.user?.profile?.lastName || '',
              profileUrl: property.landlord.user?.profile?.profileUrl || null
            }
          }
        } : {
          id: '',
          landlordCode: '',
          user: {
            id: '',
            email: '',
            profile: {
              fullname: '',
              firstName: '',
              lastName: '',
              profileUrl: null
            }
          }
        }
      },
      specification: {
        type: property?.specificationType || 'RESIDENTIAL',
        residential: property?.specification?.[0]?.residential || null
      },
      hierarchy: {
        level: 'unit' as const,
        propertyId: property?.id || '',
        unitId: unit.id,
        roomId: null,
        breadcrumb: [
          {
            id: property?.id || '',
            name: property?.name || '',
            type: 'property' as const,
            url: null
          },
          {
            id: unit.id,
            name: `${unit.unitType || 'Unit'} ${unit.unitNumber || ''}`.trim() || 'Unnamed Unit',
            type: 'unit' as const,
            url: propertyListingId ? `/property/${propertyListingId}` : null
          }
        ],
        context: `${((unit.unitType || 'Unit') + ' ' + (unit.unitNumber || '')).trim() || 'Unnamed Unit'} in ${property?.name || 'Property'}`
      },
      relatedListings: {
        units: [],
        rooms: [],
        totalCount: 0
      }
    };
  }
}
