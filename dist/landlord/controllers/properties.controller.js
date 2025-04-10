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
const fs_1 = __importDefault(require("fs"));
const error_service_1 = __importDefault(require("../../services/error.service"));
const propertyServices_1 = __importDefault(require("../../services/propertyServices"));
const properties_schema_1 = require("../../validations/schemas/properties.schema");
const settings_1 = require("../validations/schema/settings");
const property_performance_1 = __importDefault(require("../services/property-performance"));
const filereader_1 = require("../../utils/filereader");
const helpers_1 = require("../../utils/helpers");
const client_1 = require("@prisma/client");
const tenant_service_1 = __importDefault(require("../../services/tenant.service"));
const state_services_1 = __importDefault(require("../../services/state.services"));
class PropertyController {
    constructor() {
        this.createProperty = (req, res) => __awaiter(this, void 0, void 0, function* () {
            var _a, _b;
            const landlordId = (_b = (_a = req.user) === null || _a === void 0 ? void 0 : _a.landlords) === null || _b === void 0 ? void 0 : _b.id;
            try {
                if (!landlordId) {
                    return res.status(403).json({ error: 'kindly login' });
                }
                const { error, value } = properties_schema_1.createPropertySchema.validate(req.body);
                if (error) {
                    return res.status(400).json({ error: error.details[0].message });
                }
                const state = yield state_services_1.default.getStateByName(value === null || value === void 0 ? void 0 : value.state);
                const existance = yield propertyServices_1.default.getUniquePropertiesBaseLandlordNameState(landlordId, value === null || value === void 0 ? void 0 : value.name, state === null || state === void 0 ? void 0 : state.id, value.city);
                if (existance) {
                    return res.status(400).json({ error: 'property exist for the state and city' });
                }
                const images = value.cloudinaryUrls;
                const videourl = value.cloudinaryVideoUrls;
                delete value['state'];
                delete value['cloudinaryUrls'];
                delete value['cloudinaryVideoUrls'];
                delete value['cloudinaryAudioUrls'];
                delete value['cloudinaryDocumentUrls'];
                const rentalFee = value.rentalFee || 0;
                // const lateFee = rentalFee * 0.01;
                const property = yield propertyServices_1.default.createProperty(Object.assign(Object.assign({}, value), { stateId: state === null || state === void 0 ? void 0 : state.id, images, videourl, landlordId }));
                return res.status(201).json({ property });
            }
            catch (error) {
                error_service_1.default.handleError(error, res);
            }
        });
        this.showCaseRentals = (req, res) => __awaiter(this, void 0, void 0, function* () {
            var _a, _b;
            try {
                const landlordId = (_b = (_a = req.user) === null || _a === void 0 ? void 0 : _a.landlords) === null || _b === void 0 ? void 0 : _b.id;
                if (!landlordId)
                    return res.status(404).json({ message: "Landlord not found" });
                const propertyId = req.params.propertyId;
                const property = yield propertyServices_1.default.showCaseRentals(propertyId, landlordId);
                if (!property)
                    return res.status(200).json({ message: "No Property found" });
                return res.status(200).json({ property });
            }
            catch (error) {
                error_service_1.default.handleError(error, res);
            }
        });
        this.getShowCasedRentals = (req, res) => __awaiter(this, void 0, void 0, function* () {
            var _a, _b;
            try {
                const landlordId = (_b = (_a = req.user) === null || _a === void 0 ? void 0 : _a.landlords) === null || _b === void 0 ? void 0 : _b.id;
                if (!landlordId)
                    return res.status(404).json({ message: "Landlord not found" });
                const property = yield propertyServices_1.default.getShowCasedRentals(landlordId);
                if (!property)
                    return res.status(200).json({ message: "No Property found" });
                return res.status(200).json({ property });
            }
            catch (error) {
                error_service_1.default.handleError(error, res);
            }
        });
        this.getCurrentLandlordProperties = (req, res) => __awaiter(this, void 0, void 0, function* () {
            var _a, _b;
            try {
                const landlordId = (_b = (_a = req.user) === null || _a === void 0 ? void 0 : _a.landlords) === null || _b === void 0 ? void 0 : _b.id;
                if (!landlordId)
                    return res.status(404).json({ message: "Landlord not found" });
                const propertiesGrouped = yield propertyServices_1.default.aggregatePropertiesByState(landlordId);
                const propertiesUnGrouped = yield propertyServices_1.default.getPropertiesByLandlord(landlordId);
                return res.status(200).json({ propertiesGrouped, propertiesUnGrouped });
            }
            catch (error) {
                error_service_1.default.handleError(error, res);
            }
        });
        this.categorizedPropsInRentals = (req, res) => __awaiter(this, void 0, void 0, function* () {
            var _a, _b;
            try {
                const landlordId = (_b = (_a = req.user) === null || _a === void 0 ? void 0 : _a.landlords) === null || _b === void 0 ? void 0 : _b.id;
                if (!landlordId)
                    return res.status(404).json({ message: "Landlord not found" });
                const properties = yield propertyServices_1.default.getLandlordProperties(landlordId);
                // Group properties based on specificationType
                const categorizedProperties = {
                    COMMERCIAL: properties.filter((prop) => prop.specificationType === client_1.PropertySpecificationType.COMMERCIAL),
                    RESIDENTIAL: properties.filter((prop) => prop.specificationType === client_1.PropertySpecificationType.RESIDENTIAL),
                    SHORTLET: properties.filter((prop) => prop.specificationType === client_1.PropertySpecificationType.SHORTLET),
                };
                return res.status(200).json({ data: categorizedProperties });
            }
            catch (error) {
                error_service_1.default.handleError(error, res);
            }
        });
        this.deleteLandlordProperties = (req, res) => __awaiter(this, void 0, void 0, function* () {
            var _a, _b;
            try {
                const landlordId = (_b = (_a = req.user) === null || _a === void 0 ? void 0 : _a.landlords) === null || _b === void 0 ? void 0 : _b.id;
                const propertiesId = req.params.propertyId;
                const propertyExist = yield propertyServices_1.default.checkLandlordPropertyExist(landlordId, propertiesId);
                if (!propertyExist)
                    return res.status(404).json({ message: "property does not exists" });
                if (!landlordId)
                    return res.status(404).json({ message: "Landlord not found" });
                const properties = yield propertyServices_1.default.deleteProperty(landlordId, propertiesId);
                if (!properties)
                    return res.status(200).json({ message: "No Property listed yet" });
                return res.status(200).json(properties);
            }
            catch (error) {
                error_service_1.default.handleError(error, res);
            }
        });
        this.updatePropertyAvailability = (req, res) => __awaiter(this, void 0, void 0, function* () {
            var _a, _b;
            try {
                const { error, value } = settings_1.propAvailabiltySchema.validate(req.body);
                if (error) {
                    return res.status(400).json({ error: error.details[0].message });
                }
                const landlordId = (_b = (_a = req.user) === null || _a === void 0 ? void 0 : _a.landlords) === null || _b === void 0 ? void 0 : _b.id;
                const propertiesId = req.params.propertyId;
                const propertyExist = yield propertyServices_1.default.checkLandlordPropertyExist(landlordId, propertiesId);
                if (!propertyExist)
                    return res.status(404).json({ message: "property does not exists for this landlord" });
                if (!landlordId)
                    return res.status(404).json({ message: "Landlord not found" });
                const property = yield propertyServices_1.default.updateAvailabiltyStatus(landlordId, propertiesId, value.availability);
                if (!property)
                    return res.status(200).json({ message: "No Property listed yet" });
                return res.status(200).json({ property });
            }
            catch (error) {
                error_service_1.default.handleError(error, res);
            }
        });
        this.getPropertyPerformance = (req, res) => __awaiter(this, void 0, void 0, function* () {
            const { entityId } = req.params;
            const { isApartment } = req.body;
            if (!entityId)
                return res.status(400).json({ message: 'No propertyId provided' });
            try {
                const performance = yield property_performance_1.default.generateReport(entityId, isApartment);
                res.status(200).json(performance);
            }
            catch (error) {
                error_service_1.default.handleError(error, res);
            }
        });
        this.getPropertyExpenses = (req, res) => __awaiter(this, void 0, void 0, function* () {
            const { landlords } = req.user;
            const landlordId = landlords.id;
            const { propertyId } = req.params;
            if (!propertyId)
                return res.status(400).json({ message: 'No propertyId provided' });
            try {
                const expenses = yield propertyServices_1.default.getPropertyExpenses(landlordId, propertyId);
                res.status(200).json(expenses);
            }
            catch (error) {
                error_service_1.default.handleError(error, res);
            }
        });
        this.getRentVSExpense = (req, res) => __awaiter(this, void 0, void 0, function* () {
            const { entityId } = req.params;
            const { isApartment, startDate, endDate } = req.body;
            if (!entityId)
                return res.status(400).json({ message: 'No propertyId provided' });
            try {
                const rentVsExpense = yield property_performance_1.default.getRentVSExpenseMonthlyData(entityId, isApartment, startDate, endDate);
                res.status(200).json(rentVsExpense);
            }
            catch (error) {
                error_service_1.default.handleError(error, res);
            }
        });
        this.createPropertyListing = (req, res) => __awaiter(this, void 0, void 0, function* () {
            var _a, _b;
            const { error, value } = properties_schema_1.createPropertyListingSchema.validate(req.body);
            if (error)
                return res.status(400).json({ error: error.details[0].message });
            try {
                const data = value;
                // check if property is owned by landlord
                const landlordId = (_b = (_a = req.user) === null || _a === void 0 ? void 0 : _a.landlords) === null || _b === void 0 ? void 0 : _b.id;
                const checkOwnership = yield propertyServices_1.default.checkLandlordPropertyExist(landlordId, value.propertyId);
                // scenario where property doesnot belong to landlord
                if (!checkOwnership)
                    return res.status(400).json({ message: 'property does not exist under landlord' });
                if (checkOwnership.availability === client_1.PropsApartmentStatus.OCCUPIED) {
                    return res.status(400).json({ message: 'Property already occupied' });
                }
                const listing = yield propertyServices_1.default.createPropertyListing(data);
                return res.status(201).json({ message: 'Property listing created', listing });
            }
            catch (err) {
                error_service_1.default.handleError(err, res);
            }
        });
        this.unListPropertyListing = (req, res) => __awaiter(this, void 0, void 0, function* () {
            var _a, _b;
            const propertyId = req.params.propertyId;
            try {
                const landlordId = (_b = (_a = req.user) === null || _a === void 0 ? void 0 : _a.landlords) === null || _b === void 0 ? void 0 : _b.id;
                const checkOwnership = yield propertyServices_1.default.checkLandlordPropertyExist(landlordId, propertyId);
                // scenario where property doesnot belong to landlord
                if (!checkOwnership)
                    return res.status(404).json({ message: 'property does not exist under landlord' });
                const unlisted = yield propertyServices_1.default.deletePropertyListing(propertyId);
                return res.status(200).json({ message: 'Property unlisted', unlisted });
            }
            catch (err) {
                error_service_1.default.handleError(err, res);
            }
        });
        // this code get landlord listing of properties including 
        // using filters base on property size, type and location
        this.getLandlordPropertyListing = (req, res) => __awaiter(this, void 0, void 0, function* () {
            var _a, _b;
            try {
                // Extract landlordId from the authenticated user
                const landlordId = (_b = (_a = req.user) === null || _a === void 0 ? void 0 : _a.landlords) === null || _b === void 0 ? void 0 : _b.id;
                if (!landlordId) {
                    return res.status(400).json({ message: "Landlord not found" });
                }
                // Extract filters from the query parameters
                const { state, country, propertySize, type, isActive, specificationType } = req.query;
                // Prepare the filter object
                const filters = {
                    landlordId,
                };
                // Add filters to the query if they are provided
                if (state)
                    filters.property = Object.assign(Object.assign({}, filters.property), { state: String(state) });
                if (country)
                    filters.property = Object.assign(Object.assign({}, filters.property), { country: String(country) });
                if (propertySize)
                    filters.property = Object.assign(Object.assign({}, filters.property), { propertysize: Number(propertySize) });
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
                if (type) {
                    const isValidType = Object.values(client_1.PropertyType).includes(type);
                    if (isValidType) {
                        filters.property = Object.assign(Object.assign({}, filters.property), { type: String(type) });
                    }
                    else {
                        throw new Error(`Invalid type: ${type}. Must be one of ${Object.values(client_1.PropertyType).join(', ')}`);
                    }
                }
                // Fetch the filtered properties
                const properties = yield propertyServices_1.default.getAllListedProperties(filters);
                console.log(landlordId);
                // Check if properties are found
                if (!properties || properties.length === 0) {
                    return res.status(404).json({ message: "No properties found for this landlord with the given filters" });
                }
                // Return the filtered properties
                return res.status(200).json({ properties });
            }
            catch (err) {
                // Handle any errors
                error_service_1.default.handleError(err, res);
            }
        });
        this.getActiveOrInactivePropsListing = (req, res) => __awaiter(this, void 0, void 0, function* () {
            var _a, _b;
            try {
                // Extract landlordId from the authenticated user
                const landlordId = (_b = (_a = req.user) === null || _a === void 0 ? void 0 : _a.landlords) === null || _b === void 0 ? void 0 : _b.id;
                if (!landlordId) {
                    return res.status(400).json({ message: "Landlord not found" });
                }
                // get listing
                const activePropsListing = yield propertyServices_1.default.getActiveOrInactivePropsListing(landlordId);
                const inActivePropsListing = yield propertyServices_1.default.getActiveOrInactivePropsListing(landlordId, false);
                // Return the ative and inactive property listing
                return res.status(200).json({ activePropsListing, inActivePropsListing });
            }
            catch (err) {
                // Handle any errors
                error_service_1.default.handleError(err, res);
            }
        });
        this.updatePropsListing = (req, res) => __awaiter(this, void 0, void 0, function* () {
            var _a, _b;
            try {
                const { error, value } = properties_schema_1.updatePropertyListingSchema.validate(req.body);
                if (error)
                    return res.status(400).json({ error: error.details[0].message });
                const propertyId = req.params.propertyId;
                // Extract landlordId from the authenticated user
                const landlordId = (_b = (_a = req.user) === null || _a === void 0 ? void 0 : _a.landlords) === null || _b === void 0 ? void 0 : _b.id;
                if (!landlordId) {
                    return res.status(400).json({ message: "Landlord not found" });
                }
                // update listing
                const listing = yield propertyServices_1.default.updatePropertyListing(value, propertyId, landlordId);
                // Return the update property listing
                return res.status(200).json({ listing });
            }
            catch (err) {
                // Handle any errors
                error_service_1.default.handleError(err, res);
            }
        });
        this.bulkPropsUpload = (req, res) => __awaiter(this, void 0, void 0, function* () {
            var _a, _b, _c;
            try {
                const landlordId = (_b = (_a = req.user) === null || _a === void 0 ? void 0 : _a.landlords) === null || _b === void 0 ? void 0 : _b.id;
                if (!landlordId) {
                    return res.status(404).json({ error: 'Kindly login as landlord' });
                }
                if (!req.file)
                    return res.status(400).json({ error: 'No CSV file uploaded.' });
                const filePath = req.file.path;
                // Read and process the CSV file
                const dataFetched = yield (0, filereader_1.parseCSV)(filePath);
                let uploaded = [];
                let uploadErrors = [];
                for (const row of dataFetched) {
                    try {
                        let rowErrors = [];
                        // Convert semicolon-separated amenities string to an array
                        if (row.amenities && typeof row.amenities === 'string') {
                            row.amenities = row.amenities.split(';').map(item => item.trim());
                        }
                        // Parse date fields
                        // row.yearBuilt = parseDateField(row.yearBuilt);
                        // row.dueDate = parseDateField(row.dueDate);
                        // Convert date fields safely
                        const dateFields = [
                            { key: "dueDate", label: "Due Date" },
                            { key: "yearBuilt", label: "Year Built" },
                        ];
                        for (const field of dateFields) {
                            try {
                                if (row[field.key]) {
                                    row[field.key] = (0, helpers_1.parseDateFieldNew)((_c = row[field.key]) === null || _c === void 0 ? void 0 : _c.toString(), field.label);
                                }
                            }
                            catch (dateError) {
                                rowErrors.push(dateError.message);
                            }
                        }
                        // Validate the row using Joi validations
                        const { error, value } = properties_schema_1.createPropertySchema.validate(row, { abortEarly: false });
                        if (error) {
                            const existingError = uploadErrors.find(err => err.name === row.name);
                            if (existingError) {
                                existingError.errors.push(...error.details.map(detail => detail.message));
                            }
                            else {
                                uploadErrors.push({
                                    name: Array.isArray(row.name) ? row.name[0] : row.name,
                                    errors: [...error.details.map(detail => detail.message)],
                                });
                            }
                            continue;
                        }
                        if (rowErrors.length > 0) {
                            let existingError = uploadErrors.find(err => err.name === row.name);
                            if (existingError) {
                                existingError.errors.push(...rowErrors);
                            }
                            else {
                                uploadErrors.push({ name: Array.isArray(row.name) ? row.name[0] : row.name, errors: rowErrors });
                            }
                            continue;
                        }
                        const state = yield state_services_1.default.getStateByName(Array.isArray(row.state) ? row.state[0] : row.state);
                        const existance = yield propertyServices_1.default.getUniquePropertiesBaseLandlordNameState(landlordId, Array.isArray(row.name) ? row.name[0] : row.name, state === null || state === void 0 ? void 0 : state.id, Array.isArray(row.city) ? row.city[0] : row.city);
                        if (existance) {
                            const existingError = uploadErrors.find(err => err.name === row.name);
                            if (existingError) {
                                existingError.errors.push('Property already exists');
                            }
                            else {
                                uploadErrors.push({
                                    name: Array.isArray(row.name) ? row.name[0] : row.name,
                                    errors: ['Property already exists'],
                                });
                            }
                            continue;
                        }
                        delete value["state"];
                        const property = yield propertyServices_1.default.createProperty(Object.assign(Object.assign({}, value), { stateId: state === null || state === void 0 ? void 0 : state.id, landlordId }));
                        uploaded.push(property);
                    }
                    catch (err) {
                        const existingError = uploadErrors.find(error => error.name === row.name);
                        if (existingError) {
                            existingError.errors.push(`Unexpected error: ${err.message}`);
                        }
                        else {
                            uploadErrors.push({
                                name: Array.isArray(row.name) ? row.name[0] : row.name,
                                errors: [`Unexpected error: ${err.message}`],
                            });
                        }
                    }
                }
                // Delete the file after processing if needed
                fs_1.default.unlinkSync(filePath);
                // Determine response based on upload results
                if (uploaded.length > 0) {
                    return res.status(200).json({ uploaded, uploadErrors });
                }
                else {
                    return res.status(400).json({ error: 'No property was uploaded.', uploadErrors });
                }
            }
            catch (error) {
                error_service_1.default.handleError(error, res);
            }
        });
        // Get all tenants for a specific property
        this.getTenantsForProperty = (req, res) => __awaiter(this, void 0, void 0, function* () {
            try {
                const propertyId = req.params.propertyId; // Get propertyId from the request params
                // Step 1: Validate the property exists (optional)
                const property = yield propertyServices_1.default.getPropertyById(propertyId);
                if (!property) {
                    return res.status(404).json({ message: 'Property not found' });
                }
                // Step 2: Retrieve all tenants for the given property
                const tenant = yield tenant_service_1.default.getTenantsByLeaseStatus(propertyId);
                // Step 3: Return the list of tenants
                return res.status(200).json({
                    tenant
                });
            }
            catch (error) {
                error_service_1.default.handleError(error, res);
            }
        });
        this.getPropertiesWithoutTenants = (req, res) => __awaiter(this, void 0, void 0, function* () {
            var _a, _b;
            try {
                const landlordId = (_b = (_a = req.user) === null || _a === void 0 ? void 0 : _a.landlords) === null || _b === void 0 ? void 0 : _b.id;
                if (!landlordId) {
                    return res.status(404).json({ error: 'Kindly login as landlord' });
                }
                // Get the properties without tenants
                const properties = yield propertyServices_1.default.getPropertiesWithoutTenants(landlordId);
                // Return the properties
                return res.status(200).json(properties);
            }
            catch (error) {
                error_service_1.default.handleError(error, res);
            }
        });
    }
}
exports.default = new PropertyController();
