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
const maintenance_service_1 = __importDefault(require("../services/maintenance.service"));
const propertyServices_1 = __importDefault(require("../services/propertyServices"));
const maintenance_schema_1 = require("../validations/schemas/maintenance.schema");
const vendor_services_1 = __importDefault(require("../vendor/services/vendor.services"));
const error_service_1 = __importDefault(require("../services/error.service"));
const client_1 = require("@prisma/client");
class MaintenanceController {
    constructor() {
        this.getAllMaintenances = (req, res) => __awaiter(this, void 0, void 0, function* () {
            try {
                const maintenances = yield maintenance_service_1.default.getAllMaintenances();
                res.status(200).json({ maintenances });
            }
            catch (error) {
                error_service_1.default.handleError(error, res);
            }
        });
        this.getVendorRelatedJobs = (req, res) => __awaiter(this, void 0, void 0, function* () {
            try {
                const vendorId = req.user.id;
                const vendorService = yield vendor_services_1.default.getVendorService(vendorId);
                res.status(200).json({ services: vendorService });
            }
            catch (error) {
                error_service_1.default.handleError(error, res);
            }
        });
        this.getMaintenanceById = (req, res) => __awaiter(this, void 0, void 0, function* () {
            try {
                const id = req.params.id;
                const maintenance = yield maintenance_service_1.default.getMaintenanceById(id);
                if (maintenance) {
                    res.status(200).json(maintenance);
                }
                else {
                    res.status(404).json({ message: 'Maintenance not found' });
                }
            }
            catch (error) {
                error_service_1.default.handleError(error, res);
            }
        });
        this.scheduleMaintenanceDate = (req, res) => __awaiter(this, void 0, void 0, function* () {
            try {
                const maintenanceId = req.params.maintenanceId;
                const maintenance = yield maintenance_service_1.default.getMaintenanceById(maintenanceId);
                if (!maintenance) {
                    res.status(404).json({ message: 'Maintenance not found' });
                }
                const { error, value } = maintenance_schema_1.rescheduleMaintenanceSchema.validate(req.body);
                if (error)
                    return res.status(400).json({ error: error.details[0].message });
                const updatedMaintenance = yield maintenance_service_1.default.updateMaintenance(maintenanceId, value);
                return res.status(200).json({ message: 'Maintenance scheduled successfully', updatedMaintenance });
            }
            catch (error) {
                error_service_1.default.handleError(error, res);
            }
        });
        // tenancy function to check if a property maintenance is whitelisted
        this.checkIfMaintenanceWhitelisted = (req, res) => __awaiter(this, void 0, void 0, function* () {
            var _a, _b;
            try {
                const { error, value } = maintenance_schema_1.checkWhitelistedSchema.validate(req.body);
                if (error) {
                    return res.status(400).json({ message: error.details[0].message });
                }
                const tenantId = (_b = (_a = req.user) === null || _a === void 0 ? void 0 : _a.tenant) === null || _b === void 0 ? void 0 : _b.id;
                if (!tenantId) {
                    return res.status(400).json({ message: "Please log in as either a tenant or a landlord." });
                }
                const checkPropertyExist = yield propertyServices_1.default.getPropertiesById(value.propertyId);
                if (checkPropertyExist)
                    return res.status(400).json({ message: "propery doesnt exist" });
                const isWhitelisted = yield maintenance_service_1.default.checkWhitelist(checkPropertyExist === null || checkPropertyExist === void 0 ? void 0 : checkPropertyExist.landlordId, value.categoryId, value.subcategoryId, value.propertyId, value.apartmentId);
                return res.status(200).json({
                    isWhitelisted
                });
            }
            catch (error) {
                error_service_1.default.handleError(error, res);
            }
        });
        this.requestMaintenanceCancellation = (req, res) => __awaiter(this, void 0, void 0, function* () {
            var _a;
            const maintenanceId = req.params.maintenanceId;
            const maintenance = yield maintenance_service_1.default.getMaintenanceById(maintenanceId);
            const tenantId = (_a = req.user.tenant) === null || _a === void 0 ? void 0 : _a.id;
            const { error, value } = maintenance_schema_1.maintenanceCancelSchema.validate(req.body);
            if (error)
                return res.status(400).json({ error: error.details[0].message });
            // Only the assigned tenant can initiate the cancellation request
            if (maintenance.tenantId !== tenantId) {
                throw new Error("Unauthorized: Only the assigned tenant can request cancellation.");
            }
            // Update the maintenance record with cancellation flag and reason
            yield maintenance_service_1.default.updateMaintenance(maintenanceId, {
                flagCancellation: true,
                cancelReason: value.reason,
                status: client_1.maintenanceStatus.CANCELLATION_REQUEST
            });
        });
        this.confirmCancellationByVendor = (req, res) => __awaiter(this, void 0, void 0, function* () {
            var _a;
            const maintenanceId = req.params.maintenanceId;
            const maintenance = yield maintenance_service_1.default.getMaintenanceById(maintenanceId);
            ;
            const vendorId = (_a = req.user.vendors) === null || _a === void 0 ? void 0 : _a.id;
            // Ensure the vendor providing consent is the assigned vendor
            if (maintenance.vendorId !== vendorId) {
                throw new Error("Unauthorized: Only the assigned vendor can consent to cancellation.");
            }
            // Update the maintenance record to reflect vendor consent
            yield maintenance_service_1.default.updateMaintenance(maintenanceId, {
                vendorConsentCancellation: true,
                status: client_1.maintenanceStatus.CANCEL,
            });
        });
        this.rescheduleMaintenanceController = (req, res) => __awaiter(this, void 0, void 0, function* () {
            try {
                const maintenanceId = req.params.maintenanceId;
                const { error, value } = maintenance_schema_1.rescheduleMaintenanceSchema.validate(req.body);
                if (error)
                    return res.status(400).json({ error: error.details[0].message });
                const result = yield maintenance_service_1.default.rescheduleMaintenance(Object.assign(Object.assign({}, value), { maintenanceId }));
                return res.status(200).json({ message: 'Maintenance rescheduled successfully', result });
            }
            catch (err) {
                error_service_1.default.handleError(err, res);
            }
        });
        this.createMaintenance = (req, res) => __awaiter(this, void 0, void 0, function* () {
            var _a, _b;
            try {
                const { error, value } = maintenance_schema_1.maintenanceSchema.validate(req.body);
                if (error) {
                    return res.status(400).json({ message: error.details[0].message });
                }
                const tenantId = (_a = req.user.tenant) === null || _a === void 0 ? void 0 : _a.id;
                let landlordId = (_b = req.user.landlords) === null || _b === void 0 ? void 0 : _b.id;
                if (!tenantId && !landlordId) {
                    return res.status(400).json({ message: "Please log in as either a tenant or a landlord." });
                }
                // checking if the maitenance category is whitelisted by the landlord
                const isWhitelisted = yield maintenance_service_1.default.checkWhitelist(landlordId, value.categoryId, value.subcategoryId, value.propertyId, value.apartmentId);
                // Determine if maintenance should be handled by the landlord
                const handleByLandlord = landlordId || isWhitelisted;
                // const { cloudinaryUrls, cloudinaryDocumentUrls, cloudinaryVideoUrls, ...data } = value;
                const property = yield propertyServices_1.default.getPropertyById(value === null || value === void 0 ? void 0 : value.propertyId);
                if (!property) {
                    return res.status(404).json({ message: 'Property not found' });
                }
                const maintenance = yield maintenance_service_1.default.createMaintenance(Object.assign(Object.assign({}, value), { handleByLandlord: handleByLandlord || false, landlordDecision: handleByLandlord ? client_1.maintenanceDecisionStatus.PENDING : '', 
                    // attachments: cloudinaryUrls,
                    tenantId: tenantId || undefined, landlordId: landlordId || undefined }));
                if (isWhitelisted && !landlordId)
                    return res.status(200).json({
                        message: "request created and will be handled by landlord",
                        maintenance
                    });
                return res.status(201).json({ maintenance, message: " maintenance request created" });
            }
            catch (error) {
                error_service_1.default.handleError(error, res);
            }
        });
        this.createMaintenanceChat = (req, res) => __awaiter(this, void 0, void 0, function* () {
            const { maintenanceId } = req.params;
            // Fetch the maintenance request details
            const { error, value } = maintenance_schema_1.maintenanceChatSchema.validate(req.body);
            if (error) {
                return res.status(400).json({ message: error.details[0].message });
            }
            const maintenance = yield maintenance_service_1.default.getMaintenanceById(maintenanceId);
            const senderId = req.user.id;
            if (!maintenance) {
                return res.status(200).json({ message: "Maintenance request not found." });
            }
            const chats = yield maintenance_service_1.default.createMaintenanceChat(maintenanceId, senderId, value.receiverId, value.message);
            return res.status(201).json({ chats });
        });
        this.getMaintenanceChat = (req, res) => __awaiter(this, void 0, void 0, function* () {
            try {
                const { maintenanceId } = req.params;
                const maintenance = yield maintenance_service_1.default.getMaintenanceById(maintenanceId);
                if (!maintenance) {
                    return res.status(200).json({ message: "Maintenance request not found." });
                }
                const chats = yield maintenance_service_1.default.getMaintenanceChat(maintenanceId);
                return res.status(201).json({ chats });
            }
            catch (error) {
                error_service_1.default.handleError(error, res);
            }
        });
        this.updateMaintenance = (req, res) => __awaiter(this, void 0, void 0, function* () {
            try {
                const id = req.params.id;
                const { error } = maintenance_schema_1.maintenanceSchema.validate(req.body, { allowUnknown: true });
                if (error) {
                    return res.status(400).json({ message: error.details[0].message });
                }
                const maintenanceExits = yield maintenance_service_1.default.getMaintenanceById(id);
                if (!maintenanceExits) {
                    return res.status(404).json({ message: `maintenance with id: ${id} doesnt exist` });
                }
                const maintenance = yield maintenance_service_1.default.updateMaintenance(id, req.body);
                return res.status(200).json({ maintenance });
            }
            catch (error) {
                error_service_1.default.handleError(error, res);
            }
        });
        this.cancelMaintenance = (req, res) => __awaiter(this, void 0, void 0, function* () {
            try {
                const id = req.params.id;
                const { error } = maintenance_schema_1.maintenanceSchema.validate(req.body, { allowUnknown: true });
                if (error) {
                    return res.status(400).json({ message: error.details[0].message });
                }
                const maintenanceExits = yield maintenance_service_1.default.getMaintenanceById(id);
                if (!maintenanceExits) {
                    return res.status(404).json({ message: `maintenance with id: ${id} doesnt exist` });
                }
                const maintenance = yield maintenance_service_1.default.updateMaintenance(id, req.body);
                return res.status(200).json({ maintenance });
            }
            catch (error) {
                error_service_1.default.handleError(error, res);
            }
        });
        this.acceptMaintenanceOffer = (req, res) => __awaiter(this, void 0, void 0, function* () {
            try {
                const maintenanceId = req.params.maintenanceId;
                const vendorId = req.user.id;
                const maintenanceRequest = yield maintenance_service_1.default.getMaintenanceById(maintenanceId);
                if (!maintenanceRequest) {
                    res.status(404).json({ message: `maintenance with id: ${maintenanceId} doesnt exist` });
                }
                if ((maintenanceRequest === null || maintenanceRequest === void 0 ? void 0 : maintenanceRequest.vendorId) !== null) {
                    return res.status(400).json({ message: "job already assigned to a vendor" });
                }
                const vendorService = yield vendor_services_1.default.getSpecificVendorService(vendorId, maintenanceRequest.categoryId);
                if (vendorService && vendorService.currentJobs > 1) {
                    return res.status(400).json({ message: "job level exceeded" });
                }
                yield maintenance_service_1.default.updateMaintenance(maintenanceId, {
                    vendorId,
                    status: client_1.maintenanceStatus.ASSIGNED,
                    serviceId: vendorService.id,
                    availability: vendorService.currentJobs > 1 ? client_1.vendorAvailability.NO : client_1.vendorAvailability.YES
                });
                // increment job current count for vendor
                yield vendor_services_1.default.incrementJobCount(vendorService.id, vendorId);
                return res.status(201).json({ message: "maintenance offer accepted" });
            }
            catch (error) {
                error_service_1.default.handleError(error, res);
            }
        });
        // this function is for vendor to update payment to completed
        this.updateMaintenanceToCompleted = (req, res) => __awaiter(this, void 0, void 0, function* () {
            try {
                const maintenanceId = req.params.maintenanceId;
                const vendorId = req.user.id;
                const maintenanceExits = yield maintenance_service_1.default.getMaintenanceById(maintenanceId);
                if (!maintenanceExits) {
                    return res.status(404).json({ message: `maintenance with id: ${maintenanceId} doesnt exist` });
                }
                //check if payment has beeen completed
                if (maintenanceExits.paymentStatus !== client_1.TransactionStatus.COMPLETED) {
                    return res.status(400).json({ message: `Payment has not been completed yet` });
                }
                const maintenance = yield maintenance_service_1.default.updateMaintenance(maintenanceId, { status: client_1.maintenanceStatus.COMPLETED });
                // decrement job current count for vendor
                yield vendor_services_1.default.decrementJobCount(maintenance.serviceId, vendorId);
                yield vendor_services_1.default.updateService(maintenance.serviceId, { availability: client_1.vendorAvailability.YES });
                return res.status(201).json({ message: `maintenance status updated: ${client_1.maintenanceStatus.COMPLETED}`, maintenance });
            }
            catch (error) {
                error_service_1.default.handleError(error, res);
            }
        });
        this.deleteMaintenance = (req, res) => __awaiter(this, void 0, void 0, function* () {
            try {
                const id = req.params.id;
                const maintenanceExits = yield maintenance_service_1.default.getMaintenanceById(id);
                if (!maintenanceExits) {
                    res.status(404).json({ message: `maintenance with id: ${id} doesnt exist` });
                }
                yield maintenance_service_1.default.deleteMaintenance(id);
                return res.status(204).end();
            }
            catch (error) {
                error_service_1.default.handleError(error, res);
            }
        });
        this.payForMaintenance = (req, res) => __awaiter(this, void 0, void 0, function* () {
            try {
                const maintenanceId = req.params.id;
                const { amount, vendorId, currency } = req.body;
                const { landlords } = req.user;
                const userId = landlords.id;
                const maintenance = yield maintenance_service_1.default.getMaintenanceById(maintenanceId);
                if (!maintenance) {
                    return res.status(404).json({ message: `Maintenance with id: ${maintenanceId} does not exist` });
                }
                if (maintenance.paymentStatus !== client_1.TransactionStatus.PENDING) {
                    return res.status(400).json({ message: `Payment has already been processed` });
                }
                const updatedMaintenance = yield maintenance_service_1.default.processPayment(maintenanceId, amount, userId, vendorId, currency);
                return res.status(200).json({ message: `Payment processed successfully`, updatedMaintenance });
            }
            catch (error) {
                error_service_1.default.handleError(error, res);
            }
        });
    }
}
exports.default = new MaintenanceController();
