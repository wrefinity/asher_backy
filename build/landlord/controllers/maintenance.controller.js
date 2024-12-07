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
const client_1 = require("@prisma/client");
const error_service_1 = __importDefault(require("../../services/error.service"));
const category_service_1 = __importDefault(require("../../services/category.service"));
const subcategory_service_1 = __importDefault(require("../../services/subcategory.service"));
const propertyServices_1 = __importDefault(require("../../services/propertyServices"));
const maintenance_1 = require("../validations/schema/maintenance");
class MaintenanceControls {
    constructor() {
        this.createWhitelist = (req, res) => __awaiter(this, void 0, void 0, function* () {
            var _a;
            try {
                const { error, value } = maintenance_1.maintenanceWhitelistSchema.validate(req.body);
                if (error)
                    return res.status(400).json({ error: error.details[0].message });
                const landlordId = (_a = req.user.landlords) === null || _a === void 0 ? void 0 : _a.id;
                if (!landlordId)
                    return res.status(403).json({ error: "Unauthorized" });
                const categoryExist = yield category_service_1.default.getCategoryById(value.categoryId);
                if (!categoryExist)
                    return res.status(400).json({ message: "category doesnt exist" });
                const subCategoryExist = yield subcategory_service_1.default.getSubCategoryById(value.subcategoryId);
                if (!subCategoryExist)
                    return res.status(400).json({ message: "sub category doesnt exist" });
                const propertyExist = yield propertyServices_1.default.getPropertiesById(value.propertyId);
                if (!propertyExist)
                    return res.status(400).json({ message: "property doesnt exist" });
                const newWhitelist = yield maintenance_service_1.default.createWhitelist(value, landlordId);
                return res.status(201).json({ message: "Whitelist created successfully", data: newWhitelist });
            }
            catch (err) {
                return res.status(500).json({ error: err.message });
            }
        });
        // Get maintenance whitelist for a landlord
        this.getWhitelistByLandlord = (req, res) => __awaiter(this, void 0, void 0, function* () {
            var _a;
            try {
                const landlordId = (_a = req.user.landlords) === null || _a === void 0 ? void 0 : _a.id;
                if (!landlordId)
                    return res.status(403).json({ error: "Unauthorized" });
                const whitelist = yield maintenance_service_1.default.getWhitelistByLandlord(landlordId);
                return res.status(200).json({ data: whitelist });
            }
            catch (err) {
                error_service_1.default.handleError(err, res);
            }
        });
        this.getPropertyMaintenance = (req, res) => __awaiter(this, void 0, void 0, function* () {
            try {
                const propertyId = req.params.propertyId;
                const maintenances = yield maintenance_service_1.default.getPropertyMaintenances(propertyId);
                if (!maintenances)
                    return res.status(200).json({ message: "No Property listed yet" });
                return res.status(200).json(maintenances);
            }
            catch (error) {
                error_service_1.default.handleError(error, res);
            }
        });
        // Update a maintenance whitelist entry
        this.updateWhitelist = (req, res) => __awaiter(this, void 0, void 0, function* () {
            try {
                const { error } = maintenance_1.updateWhitelistSchema.validate(req.body);
                if (error)
                    return res.status(400).json({ error: error.details[0].message });
                const whitelistId = req.params.whitelistId;
                const updatedWhitelist = yield maintenance_service_1.default.updateWhitelist(whitelistId, req.body);
                return res.status(200).json({ message: "Whitelist updated successfully", data: updatedWhitelist });
            }
            catch (err) {
                error_service_1.default.handleError(err, res);
            }
        });
        this.getTenantsMaintenances = (req, res) => __awaiter(this, void 0, void 0, function* () {
            var _a, _b;
            try {
                const landlordId = (_b = (_a = req.user) === null || _a === void 0 ? void 0 : _a.landlords) === null || _b === void 0 ? void 0 : _b.id;
                const tenantId = req.params.tenantId;
                const maintenances = yield maintenance_service_1.default.getTenantMaintenance(landlordId, tenantId);
                return res.status(200).json({ maintenances });
            }
            catch (error) {
                error_service_1.default.handleError(error, res);
            }
        });
        this.getCurrentLandlordMaintenances = (req, res) => __awaiter(this, void 0, void 0, function* () {
            var _a, _b;
            try {
                const landlordId = (_b = (_a = req.user) === null || _a === void 0 ? void 0 : _a.landlords) === null || _b === void 0 ? void 0 : _b.id;
                if (!landlordId)
                    return res.status(400).json({ message: "kindly log in as a landlord" });
                const pendingMaintenace = yield maintenance_service_1.default.getLandlordPropertiesMaintenance(landlordId, client_1.maintenanceStatus.PENDING);
                const assignedMaintenace = yield maintenance_service_1.default.getLandlordPropertiesMaintenance(landlordId, client_1.maintenanceStatus.ASSIGNED);
                const completedMaintenace = yield maintenance_service_1.default.getLandlordPropertiesMaintenance(landlordId, client_1.maintenanceStatus.COMPLETED);
                return res.status(200).json({ pendingMaintenace, assignedMaintenace, completedMaintenace });
            }
            catch (error) {
                error_service_1.default.handleError(error, res);
            }
        });
        this.declineMaintenaceRequest = (req, res) => __awaiter(this, void 0, void 0, function* () {
            var _a, _b;
            try {
                const landlordId = (_b = (_a = req.user) === null || _a === void 0 ? void 0 : _a.landlords) === null || _b === void 0 ? void 0 : _b.id;
                if (!landlordId)
                    return res.status(400).json({ message: "kindly log in as a landlord" });
                const maintenanceId = req.params.maintenanceId;
                const maintenance = yield maintenance_service_1.default.changeLandlordPropertiesMaintenanceDecisionState(landlordId, maintenanceId, client_1.maintenanceDecisionStatus.DECLINED);
                return res.status(200).json({ maintenance });
            }
            catch (error) {
                error_service_1.default.handleError(error, res);
            }
        });
        this.acceptMaintenaceRequest = (req, res) => __awaiter(this, void 0, void 0, function* () {
            var _a, _b;
            try {
                const landlordId = (_b = (_a = req.user) === null || _a === void 0 ? void 0 : _a.landlords) === null || _b === void 0 ? void 0 : _b.id;
                if (!landlordId)
                    return res.status(400).json({ message: "kindly log in as a landlord" });
                const maintenanceId = req.params.maintenanceId;
                const maintenance = yield maintenance_service_1.default.changeLandlordPropertiesMaintenanceDecisionState(landlordId, maintenanceId, client_1.maintenanceDecisionStatus.APPROVED);
                return res.status(200).json({ maintenance });
            }
            catch (error) {
                error_service_1.default.handleError(error, res);
            }
        });
        this.getMaintenances = (req, res) => __awaiter(this, void 0, void 0, function* () {
            var _a, _b;
            try {
                const landlordId = (_b = (_a = req.user) === null || _a === void 0 ? void 0 : _a.landlords) === null || _b === void 0 ? void 0 : _b.id;
                if (!landlordId)
                    return res.status(400).json({ message: "kindly log in as a landlord" });
                const maintenaceRequestedByLandlord = yield maintenance_service_1.default.getRequestedMaintenanceByLandlord(landlordId);
                const maintenaceRequestedByTenants = yield maintenance_service_1.default.getRequestedMaintenanceByTenants(landlordId);
                const maintenanceHistory = yield maintenance_service_1.default.getLandlordPropertiesMaintenance(landlordId);
                return res.status(200).json({ maintenaceRequestedByLandlord, maintenaceRequestedByTenants, maintenanceHistory });
            }
            catch (error) {
                error_service_1.default.handleError(error, res);
            }
        });
        this.deleteMaintenance = (req, res) => __awaiter(this, void 0, void 0, function* () {
            try {
                const { maintenanceId } = req.params;
                const maintenance = yield maintenance_service_1.default.deleteMaintenance(maintenanceId);
                if (!maintenance)
                    return res.status(500).json({ message: "Ooop try again, maintenance not deleted" });
                return res.status(500).json({ message: "maintenance  deleted", maintenance });
            }
            catch (error) {
                error_service_1.default.handleError(error, res);
            }
        });
    }
}
exports.default = new MaintenanceControls();
