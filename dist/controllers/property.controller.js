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
class PropertyController {
    constructor() {
        this.getProperty = (req, res) => __awaiter(this, void 0, void 0, function* () {
            try {
                const properties = yield propertyServices_1.default.getProperties();
                if (properties.length < 1)
                    return res.status(200).json({ message: "No Property listed yet" });
                return res.status(200).json(properties);
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
