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
const propertyviewing_service_1 = __importDefault(require("../services/propertyviewing.service"));
const properties_schema_1 = require("../validations/schemas/properties.schema");
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
        this.createViewing = (req, res) => __awaiter(this, void 0, void 0, function* () {
            var _a;
            try {
                const { error, value } = properties_schema_1.createPropertyViewingSchema.validate(req.body);
                if (error)
                    return res.status(400).json({ error: error.details[0].message });
                const property = yield propertyServices_1.default.getPropertyById(value.propertyId);
                if (!property) {
                    return res.status(404).json({ message: 'Property not found' });
                }
                const viewing = yield propertyviewing_service_1.default.createViewing(Object.assign(Object.assign({}, value), { userId: (_a = req.user) === null || _a === void 0 ? void 0 : _a.id }));
                res.status(201).json({ viewing });
            }
            catch (error) {
                error_service_1.default.handleError(error, res);
            }
        });
        this.getAllPropsViewings = (req, res) => __awaiter(this, void 0, void 0, function* () {
            try {
                const { propertyId } = req.params;
                const property = yield propertyServices_1.default.getPropertyById(propertyId);
                if (!property) {
                    return res.status(404).json({ message: 'Property not found' });
                }
                const viewings = yield propertyviewing_service_1.default.getAllPropertyViewing(propertyId);
                res.json(viewings);
            }
            catch (error) {
                error_service_1.default.handleError(error, res);
            }
        });
        this.getViewingById = (req, res) => __awaiter(this, void 0, void 0, function* () {
            try {
                const { id } = req.params;
                const viewing = yield propertyviewing_service_1.default.getViewingById(id);
                if (!viewing)
                    return res.status(404).json({ error: "Property viewing not found" });
                res.json(viewing);
            }
            catch (error) {
                error_service_1.default.handleError(error, res);
            }
        });
        this.updateViewing = (req, res) => __awaiter(this, void 0, void 0, function* () {
            try {
                const { id } = req.params;
                const { error } = properties_schema_1.updatePropertyViewingSchema.validate(req.body);
                if (error)
                    return res.status(400).json({ error: error.details[0].message });
                const updatedViewing = yield propertyviewing_service_1.default.updateViewing(id, req.body);
                res.json({ updatedViewing });
            }
            catch (error) {
                error_service_1.default.handleError(error, res);
            }
        });
        this.deleteViewing = (req, res) => __awaiter(this, void 0, void 0, function* () {
            try {
                const { id } = req.params;
                yield propertyviewing_service_1.default.deleteViewing(id);
                res.json({ message: "Property viewing deleted successfully" });
            }
            catch (error) {
                error_service_1.default.handleError(error, res);
            }
        });
    }
}
exports.default = new PropertyController();
