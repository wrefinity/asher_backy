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
import { prismaClient } from "../db/prismaClient";
import {
    buildListingBrowseCurrencyOptions,
} from "../utils/currencyContext";
import {
    buildListedPropertySearchFiltersFromQuery,
} from "../utils/buildListedPropertySearchFilters";
import {
    applyListingMarketGateToFilters,
    propertyCountryMatchesMarket,
    resolveViewerMarketFromRequest,
} from "../utils/listingMarketGate";
import ListingEngagementService from "../services/listingEngagement.service";
import { EngagementNormalizer } from "../utils/EngagementNormalizer";
import { isActivePipelineInvite } from "../utils/InviteStateMachine";
import { sanitizeListingLandlordsForPublicView } from "../utils/publicProfilePrivacy";
import { applyPublicComplianceHints } from "../utils/propertyOperationalPrivacy";

class PropertyController {
    constructor() { }

    /** Public SOT for AsherWebUser listing market (guest + logged-in tenant). */
    getListingViewerContext = async (req: CustomRequest, res: Response) => {
        try {
            const { viewerContext } = await resolveViewerMarketFromRequest(req);
            return res.status(200).json({ viewerContext });
        } catch (err) {
            ErrorService.handleError(err, res);
        }
    };

    // using filters base on property size, type and location
    getProperty = async (req: CustomRequest, res: Response) => {
        try {
            const { page = 1, limit = 10 } = req.query;

            const baseFilters = buildListedPropertySearchFiltersFromQuery(
                req.query as Record<string, unknown>
            );

            const { viewerContext, marketCountry } =
                await resolveViewerMarketFromRequest(req);

            const filters = applyListingMarketGateToFilters(baseFilters, marketCountry);

            const pageNumber = parseInt(page as string, 10) || 1;
            const pageSize = parseInt(limit as string, 10) || 10;
            const skip = (pageNumber - 1) * pageSize;

            const currencyOptions = buildListingBrowseCurrencyOptions();

            const [totalProperties, properties] = await Promise.all([
                PropertyServices.countListedProperties(filters),
                PropertyServices.getAllListedProperties(
                    filters,
                    skip,
                    pageSize,
                    true,
                    currencyOptions
                ),
            ]);

            return res.status(200).json({
                properties: properties ?? [],
                viewerContext,
                pagination: {
                    total: totalProperties,
                    page: pageNumber,
                    limit: pageSize,
                    totalPages: Math.ceil(totalProperties / pageSize) || 0,
                },
            });
        } catch (err) {
            ErrorService.handleError(err, res);
        }
    };

    getPropertyListedByLandlord = async (req: CustomRequest, res: Response) => {
        try {

            const landlordId = req.params.landlordId;
            const [{ marketCountry }, landlord, properties] = await Promise.all([
                resolveViewerMarketFromRequest(req),
                new LandlordService().getLandlordById(landlordId),
                PropertyServices.getActiveOrInactivePropsListing(String(landlordId), true, AvailabilityStatus.VACANT),
            ]);
            // check landlord existence
            if (!landlord) {
                return res.status(404).json({ message: "Landlord not found" });
            }

            // Fetch the filtered properties
            const gated = (properties || []).filter((item: { country?: string | null; property?: { country?: string | null } }) => {
                const country = item?.country || item?.property?.country;
                return propertyCountryMatchesMarket(country, marketCountry);
            });

            // Return the filtered properties
            return res.status(200).json({ properties: gated });
        } catch (err) {
            // Handle any errors
            ErrorService.handleError(err, res);
        }
    };

    createLikeProperty = async (req: CustomRequest, res: Response) => {
        try {
            const propertyId = req.params.propertyId
            const userId = req.user?.id;

            const [propertyExists, liked] = await Promise.all([
                PropertyServices.getPropertyById(propertyId),
                PropertyServices.getLikeHistory(userId, propertyId),
            ]);

            if (!propertyExists) {
                throw new Error(`Property with ID ${propertyId} does not exist.`);
            }

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
            const [{ marketCountry }, likedRecords] = await Promise.all([
                resolveViewerMarketFromRequest(req),
                PropertyServices.getLikeHistories(userId),
            ]);
            const properties = likedRecords
                .map((record: { property?: { country?: string | null } & Record<string, unknown> }) => record.property)
                .filter((property) => {
                    if (!property) return false;
                    return propertyCountryMatchesMarket(property.country as string, marketCountry);
                })
                .map((property) => {
                    const listingHistory = (
                        property as { propertyListingHistory?: Array<{ id?: string }> }
                    ).propertyListingHistory;
                    const propertyListingId = listingHistory?.[0]?.id;
                    return propertyListingId
                        ? { ...property, propertyListingId }
                        : property;
                });
            return res.status(200).json({ properties: properties })
        } catch (error) {
            ErrorService.handleError(error, res)
        }
    }
    viewProperty = async (req: CustomRequest, res: Response) => {
        try {
            const createdById = req.user?.id;
            const propertyId = req.params.propertyId;
            const [property, logcreated] = await Promise.all([
                PropertyServices.getPropertyById(propertyId),
                LogsServices.checkPropertyLogs(
                    createdById,
                    LogType.VIEW,
                    propertyId
                ),
            ]);

            if (!property) return res.status(400).json({ message: "property with the id given doesnt exist" });
            if (logcreated) return res.status(200).json({ message: "property viewed have been logged already" });

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

            const [propertyListing, { marketCountry }] = await Promise.all([
                PropertyServices.getPropertyListingByListingId(propertyListingId),
                resolveViewerMarketFromRequest(req, req.query as Record<string, unknown>, {
                    preferUserPreferences: true,
                }),
            ]);
            if(!propertyListing) return res.status(400).json({ message: "propertylisting is not found" });

            const listingCountry = propertyListing.property?.country;
            if (!propertyCountryMatchesMarket(listingCountry, marketCountry)) {
                return res.status(404).json({ message: "This property is not available in your region." });
            }

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

            try {
                const landlordId = propertyListing.property?.landlordId;
                if (landlordId) {
                    const landlord = await prismaClient.landlords.findUnique({
                        where: { id: landlordId },
                        select: { userId: true },
                    });
                    if (landlord?.userId) {
                        const NotificationService = (await import('../services/notification.service')).default;
                        await NotificationService.createNotification(
                            {
                                sourceId: createdById,
                                destId: landlord.userId,
                                title: 'New Website Enquiry',
                                message: String(message).slice(0, 240),
                                notificationType: 'website_inquiry',
                                route: '/leasing',
                                type: 'info',
                                emitRealtime: true,
                            },
                            'WEBSITE_INQUIRY'
                        );
                    }
                }
            } catch (notifyError) {
                console.error('Failed to notify landlord of website enquiry:', notifyError);
            }

            return res.status(200).json({log})
        } catch (error) {
            ErrorService.handleError(error, res)
        }
    }
    getListingEngagement = async (req: CustomRequest, res: Response) => {
        try {
            const userId = req.user?.id;
            const listingId = req.params.id;

            if (!userId) {
                return res.status(401).json({ message: "Authentication required" });
            }
            if (!listingId) {
                return res.status(400).json({ message: "Listing id is required" });
            }

            const engagement = await ListingEngagementService.getForUserAndListing(
                userId,
                listingId
            );
            return res.status(200).json({ engagement });
        } catch (error) {
            ErrorService.handleError(error, res);
        }
    };
    getUserEnquiries = async (req: CustomRequest, res: Response) => {
        try {
            const userId = req.user?.id;
            if (!userId) {
                return res.status(401).json({ message: "Authentication required" });
            }
            const rawEnquiries = await LogsServices.getUserEnquiries(userId);
            const engagements =
                await EngagementNormalizer.fromEnquiriesMany(rawEnquiries);

            const openEnquiries = engagements.filter(
                (row) =>
                    !row.invite &&
                    row.enquiry?.status === logTypeStatus.PENDING
            );
            const pipeline = engagements.filter(
                (row) =>
                    !!row.invite &&
                    isActivePipelineInvite(row.invite.response)
            );
            const closed = engagements.filter(
                (row) =>
                    !!row.invite &&
                    !isActivePipelineInvite(row.invite.response)
            );

            return res.status(200).json({
                enquiries: openEnquiries,
                pipeline,
                closed,
                engagements,
            });
        } catch (error) {
            ErrorService.handleError(error, res);
        }
    };
    getPropertyById = async (req: CustomRequest, res: Response) => {
        try {
            const propertyId = req.params.id;
            if(!propertyId){
                return res.status(400).json({ message: "propertyId is required" });
            }
            const property = await PropertyServices.getPropertyById(propertyId)
            const canonicalId = property.propertyId ?? property.id;
            const normalized = {
                ...property,
                id: canonicalId,
                propertyId: canonicalId,
            };
            const withHints = applyPublicComplianceHints(normalized as Record<string, unknown>);
            return res.status(200).json({ property: withHints })
        } catch (error) {
            ErrorService.handleError(error, res)
        }
    }
    getPropertyListingById = async (req: CustomRequest, res: Response) => {
        try {
            const listingId = req.params.id;
            const userId = req.user?.id;
            const [{ marketCountry, viewerContext }, property] = await Promise.all([
                resolveViewerMarketFromRequest(req),
                PropertyServices.getPropertyListingByListingIdNew(listingId),
            ]);
            if (!property) {
                return res.status(404).json({ message: "Property listing not found" });
            }

            const listingCountry =
                (property as { property?: { country?: string | null } }).property?.country ||
                (property as { country?: string | null }).country;

            const inViewerMarket = propertyCountryMatchesMarket(listingCountry, marketCountry);

            if (!inViewerMarket) {
                const hasEngagement =
                    userId != null &&
                    (await ListingEngagementService.userCanAccessListing(userId, listingId));

                if (!hasEngagement) {
                    return res.status(404).json({
                        message: "This property is not available in your region.",
                    });
                }
            }

            const [sanitizedProperty] = await sanitizeListingLandlordsForPublicView([property]);

            const nested = (sanitizedProperty as { property?: Record<string, unknown> }).property;
            if (nested?.complianceRecords) {
              (sanitizedProperty as { property: Record<string, unknown> }).property =
                applyPublicComplianceHints(nested);
            }

            return res.status(200).json({ property: sanitizedProperty, viewerContext })
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
            const { viewerContext, marketCountry } =
                await resolveViewerMarketFromRequest(req);
            const filters = applyListingMarketGateToFilters({}, marketCountry);
            const currencyOptions = buildListingBrowseCurrencyOptions();
            const properties = await PropertyServices.getAllListedProperties(
                filters,
                0,
                1000,
                true,
                currencyOptions
            );
            const sanitizedProperties = await sanitizeListingLandlordsForPublicView(
                Array.isArray(properties) ? properties : []
            );
            return res.status(200).json({
                properties: sanitizedProperties,
                viewerContext,
            });
        } catch (error) {
            ErrorService.handleError(error, res)
        }
    }
    getPropsMaintenance = async (req: CustomRequest, res: Response) => {
        try {
            const propertyId = req.params.propertyId;
            const [property, properties] = await Promise.all([
                PropertyServices.getPropertyById(propertyId),
                MaintenanceServices.getPropertyMaintenance(propertyId),
            ]);
            if (!property) {
                return res.status(404).json({ message: 'Property not found' });
            }
            return res.status(200).json({ properties })
        } catch (error) {
            ErrorService.handleError(error, res)
        }
    }
    getVendorsServicesOnProps = async (req: CustomRequest, res: Response) => {
        try {
            const propertyId = req.params.propertyId;
            const [property, vendors] = await Promise.all([
                PropertyServices.getPropertyById(propertyId),
                MaintenanceServices.getVendorsForPropertyMaintenance(propertyId),
            ]);
            if (!property) {
                return res.status(404).json({ message: 'Property not found' });
            }
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

    getPropsRoomsByUnitId = async (req: CustomRequest, res: Response) => {
        try {
            const unitId = req.params.unitId;
            const specification = req.query.specification as PropertySpecificationType;

            // Validate specification type if provided
            if (specification && !Object.values(PropertySpecificationType).includes(specification)) {
                return res.status(400).json({
                    success: false,
                    message: `Invalid property specification type. Must be one of: ${Object.values(PropertySpecificationType).join(', ')}`
                });
            }

            const rooms = await propertyRoomService.getRoomsByUnitId(unitId, specification);
            if (!rooms || rooms.length === 0) {
                return res.status(404).json({
                    success: false,
                    message: 'No rooms found for this unit'
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
            const { marketCountry } = await resolveViewerMarketFromRequest(req);

            const [relatedListings, parentProperty] = await Promise.all([
                PropertyServices.getRelatedListings(propertyId, excludeListingId),
                PropertyServices.getPropertyById(propertyId),
            ]);
            if (!propertyCountryMatchesMarket(parentProperty?.country, marketCountry)) {
                return res.status(404).json({
                    success: false,
                    message: "This property is not available in your region.",
                });
            }
            
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
