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
const inspection_services_1 = __importDefault(require("../../services/inspection.services"));
const inspection_schema_1 = require("../../validations/schemas/inspection.schema");
const propertyServices_1 = __importDefault(require("../../services/propertyServices"));
class InspectionController {
    constructor() {
        this.createInspection = (req, res) => __awaiter(this, void 0, void 0, function* () {
            try {
                const { error } = inspection_schema_1.createInspectionSchema.validate(req.body);
                if (error) {
                    return res.status(400).json({ error: error.details[0].message });
                }
                // Verify landlord owns the property
                const property = yield propertyServices_1.default.getPropertyById(req.body.propertyId);
                if (!property || property.landlordId !== req.user.id) {
                    return res.status(403).json({ error: 'Unauthorized' });
                }
                const inspection = yield inspection_services_1.default.createInspection(req.body);
                res.status(201).json(inspection);
            }
            catch (error) {
                res.status(500).json({ error: 'Failed to create inspection' });
            }
        });
        this.getInspections = (req, res) => __awaiter(this, void 0, void 0, function* () {
            try {
                const propertyId = req.query.propertyId;
                if (!propertyId) {
                    return res.status(400).json({ error: 'Property ID is required' });
                }
                // Verify landlord owns the property
                const property = yield propertyServices_1.default.getPropertyById(propertyId);
                if (!property || property.landlordId !== req.user.id) {
                    return res.status(403).json({ error: 'Unauthorized' });
                }
                const inspections = yield inspection_services_1.default.getInspectionsByProperty(propertyId);
                res.json(inspections);
            }
            catch (error) {
                res.status(500).json({ error: 'Failed to fetch inspections' });
            }
        });
        this.updateInspection = (req, res) => __awaiter(this, void 0, void 0, function* () {
            try {
                const { error } = inspection_schema_1.updateInspectionSchema.validate(req.body);
                if (error) {
                    return res.status(400).json({ error: error.details[0].message });
                }
                const inspection = yield inspection_services_1.default.getInspectionById(req.params.id);
                if (!inspection) {
                    return res.status(404).json({ error: 'Inspection not found' });
                }
                // Verify landlord owns the property
                const property = yield propertyServices_1.default.getPropertyById(inspection.propertyId);
                if (!property || property.landlordId !== req.user.id) {
                    return res.status(403).json({ error: 'Unauthorized' });
                }
                const updatedInspection = yield inspection_services_1.default.updateInspection(req.params.id, req.body);
                res.json(updatedInspection);
            }
            catch (error) {
                res.status(500).json({ error: 'Failed to update inspection' });
            }
        });
        this.deleteInspection = (req, res) => __awaiter(this, void 0, void 0, function* () {
            try {
                const inspection = yield inspection_services_1.default.getInspectionById(req.params.id);
                if (!inspection) {
                    return res.status(404).json({ error: 'Inspection not found' });
                }
                // Verify landlord owns the property
                const property = yield propertyServices_1.default.getPropertyById(inspection.propertyId);
                if (!property || property.landlordId !== req.user.id) {
                    return res.status(403).json({ error: 'Unauthorized' });
                }
                yield inspection_services_1.default.deleteInspection(req.params.id);
                res.status(204).send();
            }
            catch (error) {
                res.status(500).json({ error: 'Failed to delete inspection' });
            }
        });
    }
}
exports.default = new InspectionController();
