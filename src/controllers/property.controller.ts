import { Response } from "express";
import ErrorService from "../services/error.service";
import PropertyServices from "../services/propertyServices";
import MaintenanceServices from "../services/maintenance.service";
import { CustomRequest } from "../utils/types";
import LogsServices from "../services/logs.services";
import { LogType, logTypeStatus, PropertySpecificationType, PropertyType, AvailabilityStatus } from "@prisma/client"
import { LandlordService } from "../landlord/services/landlord.service";
import propertyUnitService from "../services/property.unit.service";
import propertyRoomService from "../services/property.room.service";

class PropertyController {
    constructor() { }
    // using filters base on property size, type and location
    getProperty = async (req: CustomRequest, res: Response) => {
        try {
            // Extract filters from the query parameters
            const {
                state,
                country,
                propertySize,
                type,
                isActive,
                specificationType,
                marketValue,
                minBedRoom,
                maxBedRoom,
                maxRentalFee,
                minRentalFee,
                minBathRoom,
                maxBathRoom,
                noKitchen,
                minGarage,
                maxGarage,
                isShortlet,
                dueDate,
                yearBuilt,
                zipcode,
                amenities,
                mustHaves,
                page = 1,
                limit = 10
            } = req.query;


            // Prepare the filter object
            const filters: any = {

            };

            // Add filters to the query if they are provided
            if (state) filters.property = { ...filters.property, state: String(state) };
            if (country) filters.property = { ...filters.property, country: String(country) };
            if (propertySize) filters.property = { ...filters.property, propertysize: Number(propertySize) };
            if (marketValue) filters.property = { ...filters.property, marketValue: Number(marketValue) };
            if (minRentalFee) filters.property = { ...filters.property, minRentalFee: Number(minRentalFee) };
            if (maxRentalFee) filters.property = { ...filters.property, maxRentalFee: Number(maxRentalFee) };
            if (minBedRoom) filters.property = { ...filters.property, minBedRoom: Number(minBedRoom) };
            if (maxBedRoom) filters.property = { ...filters.property, maxBedRoom: Number(maxBedRoom) };
            if (minBathRoom) filters.property = { ...filters.property, minBathRoom: Number(minBathRoom) };
            if (maxBathRoom) filters.property = { ...filters.property, maxBathRoom: Number(maxBathRoom) };
            if (minGarage) filters.property = { ...filters.property, minGarage: Number(minGarage) };
            if (maxGarage) filters.property = { ...filters.property, maxGarage: Number(maxGarage) };
            // if (noBathRoom) filters.property = { ...filters.property, noBathRoom: Number(noBathRoom) };
            if (noKitchen) filters.property = { ...filters.property, noKitchen: Number(noKitchen) };
            if (zipcode) filters.property = { ...filters.property, zipcode: Number(zipcode) };

            if (isActive) {
                // Convert isActive to a number
                const isActiveNumber = parseInt(isActive.toString(), 10);

                if (!isNaN(isActiveNumber)) {
                    filters.property = {
                        ...filters.property,
                        isActive: isActiveNumber === 1
                    };
                } else {
                    throw new Error(`Invalid isActive: ${isActive}. Must be one of integer 1 or 0 for active and inactive`);
                }
            }

            // Validate specificationType against the enum
            if (specificationType) {
                const isValidSpecificationType = Object.values(PropertySpecificationType).includes(specificationType as PropertySpecificationType);
                if (isValidSpecificationType) {
                    filters.property = { ...filters.property, specificationType: String(specificationType) };
                } else {
                    throw new Error(`Invalid specificationType: ${specificationType}. Must be one of ${Object.values(PropertySpecificationType).join(', ')}`);
                }
            }
            // if (type) {
            //     const isValidType = Object.values(PropertyType).includes(type as PropertyType);
            //     if (isValidType) {
            //         filters.property = { ...filters.property, type: String(type) };
            //     } else {
            //         throw new Error(`Invalid type: ${type}. Must be one of ${Object.values(PropertyType).join(', ')}`);
            //     }
            // }

            // In your controller
            if (type) {
                const typesArray = Array.isArray(type) ? type : [type];
                const isValidTypes = typesArray.every(t =>
                    Object.values(PropertyType).includes(t as PropertyType)
                );

                if (!isValidTypes) {
                    throw new Error('Invalid property types');
                }

                filters.property = {
                    ...filters.property,
                    type: typesArray
                };
            }

            // Convert isShortlet to boolean
            if (isShortlet) {
                filters.isShortlet = isShortlet.toString() === "true";
            }

            // Convert dueDate and yearBuilt to Date objects
            if (dueDate) filters.dueDate = new Date(dueDate.toString());
            if (yearBuilt) filters.yearBuilt = new Date(yearBuilt.toString());

            // Filter by amenities (array search)
            if (amenities) {
                const amenitiesArray = Array.isArray(amenities) ? amenities : [amenities];
                filters.amenities = { hasSome: amenitiesArray };
            }
            // Handle mustHaves (Case Insensitive)
            if (mustHaves) {
                let mustHavesArray: string[];

                if (Array.isArray(mustHaves)) {
                    mustHavesArray = mustHaves.map(mh => String(mh));
                } else {
                    mustHavesArray = [String(mustHaves)];
                }

                filters.mustHaves = mustHavesArray;
            }

            const pageNumber = parseInt(page as string, 10) || 1;
            const pageSize = parseInt(limit as string, 10) || 10;
            const skip = (pageNumber - 1) * pageSize;

            const totalProperties = await PropertyServices.countListedProperties(filters);
            const properties = await PropertyServices.getAllListedProperties(filters, skip, pageSize);

            if (!properties || properties.length === 0) {
                return res.status(404).json({ message: "No properties found for the given filters" });
            }

            return res.status(200).json({
                properties,
                pagination: {
                    total: totalProperties,
                    page: pageNumber,
                    limit: pageSize,
                    totalPages: Math.ceil(totalProperties / pageSize)
                }
            });

        } catch (err) {
            // Handle any errors
            ErrorService.handleError(err, res);
        }
    };

    getPropertyListedByLandlord = async (req: CustomRequest, res: Response) => {
        try {

            const landlordId = req.params.landlordId;
            // check landlord existence
            const landlord = await new LandlordService().getLandlordById(landlordId);
            if (!landlord) {
                return res.status(404).json({ message: "Landlord not found" });
            }

            // Fetch the filtered prop  erties
            const properties = await PropertyServices.getActiveOrInactivePropsListing(String(landlordId), true, AvailabilityStatus.VACANT);

            // Return the filtered properties
            return res.status(200).json({ properties });
        } catch (err) {
            // Handle any errors
            ErrorService.handleError(err, res);
        }
    };

    createLikeProperty = async (req: CustomRequest, res: Response) => {
        try {
            const propertyId = req.params.propertyId
            const userId = req.user?.id;

            // Check if the property exists
            const propertyExists = await PropertyServices.getPropertyById(propertyId);

            if (!propertyExists) {
                throw new Error(`Property with ID ${propertyId} does not exist.`);
            }

            // check if the user already liked the props 
            const liked = await PropertyServices.getLikeHistory(userId, propertyId)

            if (liked) {
                return res.status(400).json({ message: "property alread liked by the current user" })
            }

            const likedProps = await PropertyServices.createLikeHistory(userId, propertyId)
            return res.status(200).json({ likedProps })
        } catch (error) {
            ErrorService.handleError(error, res)
        }
    }
    getLikePropertyHistories = async (req: CustomRequest, res: Response) => {
        try {

            const userId = req.user?.id;
            const likedProps = await PropertyServices.getLikeHistories(userId)
            return res.status(200).json(likedProps)
        } catch (error) {
            ErrorService.handleError(error, res)
        }
    }
    viewProperty = async (req: CustomRequest, res: Response) => {
        try {
            const createdById = req.user?.id;
            const propertyId = req.params.propertyId;
            // check props existence
            const property = await PropertyServices.getPropertyById(propertyId)

            if (!property) return res.status(400).json({ message: "property with the id given doesnt exist" });
            // check if propertyId have been viewed before by the user 
            const logcreated = await LogsServices.checkPropertyLogs(
                createdById,
                LogType.VIEW,
                propertyId
            )
            if (logcreated) res.status(200).json({ message: "property viewed have been logged already" });

            const log = await LogsServices.createLog({
                propertyId,
                events: "Property Viewing",
                createdById,
                type: LogType.VIEW
            })
            return res.status(200).json(log)
        } catch (error) {
            ErrorService.handleError(error, res)
        }
    }
    enquireProperty = async (req: CustomRequest, res: Response) => {
        try {
            const createdById = req.user?.id;
            const {message, propertyListingId } = req.body;
            // Validate required fields
            if ( !message || !propertyListingId) {
                return res.status(400).json({ message: "Both propertyId (ex unitId, propertyId, roomId), listingId, and message are required" });
            }

            const propertyListing = await PropertyServices.getPropertyListingByListingId(propertyListingId);
            if(!propertyListing) return res.status(400).json({ message: "propertylisting is not found" });

            const propsId = propertyListing.propertyId || undefined;
            const unitId = propertyListing.unitId || undefined;
            const roomId = propertyListing.roomId  || undefined;
            const log = await LogsServices.createLog({
                propertyId:propsId,
                events: message,
                createdById,
                type: LogType.ENQUIRED,
                unitId,
                roomId,
                propertyListingId,
                status: logTypeStatus.PENDING
            })
            return res.status(200).json({log})
        } catch (error) {
            ErrorService.handleError(error, res)
        }
    }
    getPropertyById = async (req: CustomRequest, res: Response) => {
        try {
            const propertyId = req.params.id;
            const property = await PropertyServices.getPropertyById(propertyId)
            return res.status(200).json({ property })
        } catch (error) {
            ErrorService.handleError(error, res)
        }
    }
    getPropertyListingById = async (req: CustomRequest, res: Response) => {
        try {
            const listingId = req.params.id;
            const property = await PropertyServices.getPropertyListingByListingIdNew(listingId)
            return res.status(200).json({ property })
        } catch (error) {
            ErrorService.handleError(error, res)
        }
    }
    getPropertyByState = async (req: CustomRequest, res: Response) => {
        try {
            const properties = await PropertyServices.getPropertiesByState()
            return res.status(200).json(properties)
        } catch (error) {
            ErrorService.handleError(error, res)
        }
    }
    getListedProperties = async (req: CustomRequest, res: Response) => {
        try {
            const properties = await PropertyServices.getAllListedProperties()
            return res.status(200).json(properties)
        } catch (error) {
            ErrorService.handleError(error, res)
        }
    }
    getPropsMaintenance = async (req: CustomRequest, res: Response) => {
        try {
            const propertyId = req.params.propertyId;
            const property = await PropertyServices.getPropertyById(propertyId);
            if (!property) {
                return res.status(404).json({ message: 'Property not found' });
            }
            const properties = await MaintenanceServices.getPropertyMaintenance(propertyId)
            return res.status(200).json({ properties })
        } catch (error) {
            ErrorService.handleError(error, res)
        }
    }
    getVendorsServicesOnProps = async (req: CustomRequest, res: Response) => {
        try {
            const propertyId = req.params.propertyId;
            const property = await PropertyServices.getPropertyById(propertyId);
            if (!property) {
                return res.status(404).json({ message: 'Property not found' });
            }
            const vendors = await MaintenanceServices.getVendorsForPropertyMaintenance(propertyId)
            return res.status(200).json({ vendors })
        } catch (error) {
            ErrorService.handleError(error, res)
        }
    }

    // unit sess
    getPropsUnit = async (req: CustomRequest, res: Response) => {
        try {
            const unitId = req.params.id;
            const unit = await propertyUnitService.getUnitById(unitId)
            if (!unit) {
                return res.status(404).json({ message: 'Property unit not found' });
            }
            return res.status(200).json({ property:unit })
        } catch (error) {
            ErrorService.handleError(error, res)
        }
    }
    getPropsUnitsByPropertyId = async (req: CustomRequest, res: Response) => {
        try {
            const propertyId = req.params.propertyId;
            const specification = req.query.specification as PropertySpecificationType;

            // Validate specification type
            if (!Object.values(PropertySpecificationType).includes(specification)) {
                return res.status(400).json({
                    success: false,
                    message: `Invalid property specification type. Must be one of: ${Object.values(PropertySpecificationType).join(', ')}`
                });
            }

            const units = await propertyUnitService.getUnitByProperty(specification, propertyId);

            if (!units || units.length === 0) {
                return res.status(404).json({
                    success: false,
                    message: 'No property units found'
                });
            }

            return res.status(200).json({
                success: true,
                property: units
            });
        } catch (error) {
            ErrorService.handleError(error, res);
        }
    }

    getPropsRoom = async (req: CustomRequest, res: Response) => {
        try {
            const roomId = req.params.id;
            const room = await propertyRoomService.getRoomById(roomId)
            if (!room) {
                return res.status(404).json({ message: 'Property room not found' });
            }
            return res.status(200).json({ property:room })
        } catch (error) {
            ErrorService.handleError(error, res)
        }
    }

    getPropsRoomByPropertyId = async (req: CustomRequest, res: Response) => {
        try {
            const propertyId = req.params.propertyId;
            const specification = req.query.specification as PropertySpecificationType;

            // Validate specification type
            if (!Object.values(PropertySpecificationType).includes(specification)) {
                return res.status(400).json({
                    success: false,
                    message: `Invalid property specification type. Must be one of: ${Object.values(PropertySpecificationType).join(', ')}`
                });
            }

            const rooms = await propertyRoomService.getRoomsByProperty(specification, propertyId);
            if (!rooms || rooms.length === 0) {
                return res.status(404).json({
                    success: false,
                    message: 'No property room found'
                });
            }
            return res.status(200).json({
                success: true,
                property: rooms
            });
        } catch (error) {
            ErrorService.handleError(error, res);
        }
    }
        getRelatedListings = async (req: CustomRequest, res: Response) => {
        try {
            const propertyId = req.params.propertyId;
            const excludeListingId = req.query.excludeListingId as string;
            
            const relatedListings = await PropertyServices.getRelatedListings(propertyId, excludeListingId);
            
            return res.status(200).json({
                success: true,
                data: relatedListings
            });
        } catch (error) {
            ErrorService.handleError(error, res);
        }
    }

}

export default new PropertyController()