"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const error_service_1 = __importDefault(require("../services/error.service"));
const propertyServices_1 = __importDefault(require("../services/propertyServices"));
const maintenance_service_1 = __importDefault(require("../services/maintenance.service"));
const logs_services_1 = __importDefault(require("../services/logs.services"));
const client_1 = require("@prisma/client");
const landlord_service_1 = require("../landlord/services/landlord.service");
class PropertyController {
    constructor() {
        // using filters base on property size, type and location
        this.getProperty = (req, res) => __awaiter(this, void 0, void 0, function* () {
            try {
                // Extract filters from the query parameters
                const { state, country, propertySize, type, isActive, specificationType, marketValue, minBedRoom, maxBedRoom, maxRentalFee, minRentalFee, minBathRoom, maxBathRoom, noKitchen, minGarage, maxGarage, isShortlet, dueDate, yearBuilt, zipcode, amenities, mustHaves, page = 1, limit = 10 } = req.query;
                // Prepare the filter object
                const filters = {};
                // Add filters to the query if they are provided
                if (state)
                    filters.property = Object.assign(Object.assign({}, filters.property), { state: String(state) });
                if (country)
                    filters.property = Object.assign(Object.assign({}, filters.property), { country: String(country) });
                if (propertySize)
                    filters.property = Object.assign(Object.assign({}, filters.property), { propertysize: Number(propertySize) });
                if (marketValue)
                    filters.property = Object.assign(Object.assign({}, filters.property), { marketValue: Number(marketValue) });
                if (minRentalFee)
                    filters.property = Object.assign(Object.assign({}, filters.property), { minRentalFee: Number(minRentalFee) });
                if (maxRentalFee)
                    filters.property = Object.assign(Object.assign({}, filters.property), { maxRentalFee: Number(maxRentalFee) });
                if (minBedRoom)
                    filters.property = Object.assign(Object.assign({}, filters.property), { minBedRoom: Number(minBedRoom) });
                if (maxBedRoom)
                    filters.property = Object.assign(Object.assign({}, filters.property), { maxBedRoom: Number(maxBedRoom) });
                if (minBathRoom)
                    filters.property = Object.assign(Object.assign({}, filters.property), { minBathRoom: Number(minBathRoom) });
                if (maxBathRoom)
                    filters.property = Object.assign(Object.assign({}, filters.property), { maxBathRoom: Number(maxBathRoom) });
                if (minGarage)
                    filters.property = Object.assign(Object.assign({}, filters.property), { minGarage: Number(minGarage) });
                if (maxGarage)
                    filters.property = Object.assign(Object.assign({}, filters.property), { maxGarage: Number(maxGarage) });
                // if (noBathRoom) filters.property = { ...filters.property, noBathRoom: Number(noBathRoom) };
                if (noKitchen)
                    filters.property = Object.assign(Object.assign({}, filters.property), { noKitchen: Number(noKitchen) });
                if (zipcode)
                    filters.property = Object.assign(Object.assign({}, filters.property), { zipcode: Number(zipcode) });
                if (isActive) {
                    // Convert isActive to a number
                    const isActiveNumber = parseInt(isActive.toString(), 10);
                    if (!isNaN(isActiveNumber)) {
                        filters.property = Object.assign(Object.assign({}, filters.property), { isActive: isActiveNumber === 1 });
                    }
                    else {
                        throw new Error(`Invalid isActive: ${isActive}. Must be one of integer 1 or 0 for active and inactive`);
                    }
                }
                // Validate specificationType against the enum
                if (specificationType) {
                    const isValidSpecificationType = Object.values(client_1.PropertySpecificationType).includes(specificationType);
                    if (isValidSpecificationType) {
                        filters.property = Object.assign(Object.assign({}, filters.property), { specificationType: String(specificationType) });
                    }
                    else {
                        throw new Error(`Invalid specificationType: ${specificationType}. Must be one of ${Object.values(client_1.PropertySpecificationType).join(', ')}`);
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
                    const isValidTypes = typesArray.every(t => Object.values(client_1.PropertyType).includes(t));
                    if (!isValidTypes) {
                        throw new Error('Invalid property types');
                    }
                    filters.property = Object.assign(Object.assign({}, filters.property), { type: typesArray });
                }
                // Convert isShortlet to boolean
                if (isShortlet) {
                    filters.isShortlet = isShortlet.toString() === "true";
                }
                // Convert dueDate and yearBuilt to Date objects
                if (dueDate)
                    filters.dueDate = new Date(dueDate.toString());
                if (yearBuilt)
                    filters.yearBuilt = new Date(yearBuilt.toString());
                // Filter by amenities (array search)
                if (amenities) {
                    const amenitiesArray = Array.isArray(amenities) ? amenities : [amenities];
                    filters.amenities = { hasSome: amenitiesArray };
                }
                // Handle mustHaves (Case Insensitive)
                if (mustHaves) {
                    let mustHavesArray;
                    if (Array.isArray(mustHaves)) {
                        mustHavesArray = mustHaves.map(mh => String(mh));
                    }
                    else {
                        mustHavesArray = [String(mustHaves)];
                    }
                    filters.mustHaves = mustHavesArray;
                }
                const pageNumber = parseInt(page, 10) || 1;
                const pageSize = parseInt(limit, 10) || 10;
                const skip = (pageNumber - 1) * pageSize;
                const totalProperties = yield propertyServices_1.default.countListedProperties(filters);
                const properties = yield propertyServices_1.default.getAllListedProperties(filters, skip, pageSize);
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
            }
            catch (err) {
                // Handle any errors
                error_service_1.default.handleError(err, res);
            }
        });
        this.getPropertyListedByLandlord = (req, res) => __awaiter(this, void 0, void 0, function* () {
            try {
                const landlordId = req.params.landlordId;
                // check landlord existence
                const landlord = yield new landlord_service_1.LandlordService().getLandlordById(landlordId);
                if (!landlord) {
                    return res.status(404).json({ message: "Landlord not found" });
                }
                // Fetch the filtered prop  erties
                const properties = yield propertyServices_1.default.getActiveOrInactivePropsListing(String(landlordId), true, client_1.AvailabilityStatus.VACANT);
                // Return the filtered properties
                return res.status(200).json({ properties });
            }
            catch (err) {
                // Handle any errors
                error_service_1.default.handleError(err, res);
            }
        });
        this.createLikeProperty = (req, res) => __awaiter(this, void 0, void 0, function* () {
            var _a;
            try {
                const propertyId = req.params.propertyId;
                const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
                // Check if the property exists
                const propertyExists = yield propertyServices_1.default.getPropertyById(propertyId);
                if (!propertyExists) {
                    throw new Error(`Property with ID ${propertyId} does not exist.`);
                }
                // check if the user already liked the props 
                const liked = yield propertyServices_1.default.getLikeHistory(userId, propertyId);
                if (liked) {
                    return res.status(400).json({ message: "property alread liked by the current user" });
                }
                const likedProps = yield propertyServices_1.default.createLikeHistory(userId, propertyId);
                return res.status(200).json({ likedProps });
            }
            catch (error) {
                error_service_1.default.handleError(error, res);
            }
        });
        this.getLikePropertyHistories = (req, res) => __awaiter(this, void 0, void 0, function* () {
            var _a;
            try {
                const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
                const likedProps = yield propertyServices_1.default.getLikeHistories(userId);
                return res.status(200).json(likedProps);
            }
            catch (error) {
                error_service_1.default.handleError(error, res);
            }
        });
        this.viewProperty = (req, res) => __awaiter(this, void 0, void 0, function* () {
            var _a;
            try {
                const createdById = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
                const propertyId = req.params.propertyId;
                // check props existence
                const property = yield propertyServices_1.default.getPropertyById(propertyId);
                if (!property)
                    return res.status(400).json({ message: "property with the id given doesnt exist" });
                // check if propertyId have been viewed before by the user 
                const logcreated = yield logs_services_1.default.checkPropertyLogs(createdById, client_1.LogType.VIEW, propertyId);
                if (logcreated)
                    res.status(200).json({ message: "property viewed have been logged already" });
                const log = yield logs_services_1.default.createLog({
                    propertyId,
                    events: "Property Viewing",
                    createdById,
                    type: client_1.LogType.VIEW
                });
                return res.status(200).json(log);
            }
            catch (error) {
                error_service_1.default.handleError(error, res);
            }
        });
        this.enquireProperty = (req, res) => __awaiter(this, void 0, void 0, function* () {
            var _a;
            try {
                const createdById = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
                const { propertyId, message } = req.body;
                // Validate required fields
                if (!propertyId || !message) {
                    return res.status(400).json({ message: "Both propertyId and message are required" });
                }
                // check props existence
                const property = yield propertyServices_1.default.getPropertyById(propertyId);
                if (!property)
                    return res.status(400).json({ message: "property with the id given doesnt exist" });
                // check if propertyId have been viewed before by the user 
                // const logcreated = await LogsServices.checkPropertyLogs(
                //     createdById,
                //     LogType.VIEW,
                //     propertyId
                // )
                // if (logcreated) res.status(200).json({ message: "property viewed have been logged already" });
                const log = yield logs_services_1.default.createLog({
                    propertyId,
                    events: message,
                    createdById,
                    type: client_1.LogType.ENQUIRED,
                    status: client_1.logTypeStatus.PENDING
                });
                return res.status(200).json(log);
            }
            catch (error) {
                error_service_1.default.handleError(error, res);
            }
        });
        this.getPropertyById = (req, res) => __awaiter(this, void 0, void 0, function* () {
            try {
                const propertyId = req.params.id;
                const property = yield propertyServices_1.default.getPropertyById(propertyId);
                return res.status(200).json({ property });
            }
            catch (error) {
                error_service_1.default.handleError(error, res);
            }
        });
        this.getPropertyByState = (req, res) => __awaiter(this, void 0, void 0, function* () {
            try {
                const properties = yield propertyServices_1.default.getPropertiesByState();
                return res.status(200).json(properties);
            }
            catch (error) {
                error_service_1.default.handleError(error, res);
            }
        });
        this.getListedProperties = (req, res) => __awaiter(this, void 0, void 0, function* () {
            try {
                const properties = yield propertyServices_1.default.getAllListedProperties();
                return res.status(200).json(properties);
            }
            catch (error) {
                error_service_1.default.handleError(error, res);
            }
        });
        this.getPropsMaintenance = (req, res) => __awaiter(this, void 0, void 0, function* () {
            try {
                const propertyId = req.params.propertyId;
                const property = yield propertyServices_1.default.getPropertyById(propertyId);
                if (!property) {
                    return res.status(404).json({ message: 'Property not found' });
                }
                const properties = yield maintenance_service_1.default.getPropertyMaintenance(propertyId);
                return res.status(200).json({ properties });
            }
            catch (error) {
                error_service_1.default.handleError(error, res);
            }
        });
        this.getVendorsServicesOnProps = (req, res) => __awaiter(this, void 0, void 0, function* () {
            try {
                const propertyId = req.params.propertyId;
                const property = yield propertyServices_1.default.getPropertyById(propertyId);
                if (!property) {
                    return res.status(404).json({ message: 'Property not found' });
                }
                const vendors = yield maintenance_service_1.default.getVendorsForPropertyMaintenance(propertyId);
                return res.status(200).json({ vendors });
            }
            catch (error) {
                error_service_1.default.handleError(error, res);
            }
        });
    }
}
exports.default = new PropertyController();
