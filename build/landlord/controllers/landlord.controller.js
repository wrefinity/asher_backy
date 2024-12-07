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
Object.defineProperty(exports, "__esModule", { value: true });
const landlord_service_1 = require("../services/landlord.service");
const auth_1 = require("../../validations/schemas/auth");
class LandlordController {
    constructor() {
        // Update an existing landlord
        this.updateLandlord = (req, res) => __awaiter(this, void 0, void 0, function* () {
            var _a, _b;
            try {
                const { error, value } = auth_1.updateLandlordSchema.validate(req.body);
                if (error) {
                    return res.status(400).json({ error: error.details[0].message });
                }
                const landlordId = (_b = (_a = req.user) === null || _a === void 0 ? void 0 : _a.landlords) === null || _b === void 0 ? void 0 : _b.id;
                const data = value;
                const landlord = yield this.landlordService.updateLandlord(landlordId, data);
                return res.status(200).json(landlord);
            }
            catch (err) {
                return res.status(500).json({ error: err.message });
            }
        });
        // Delete a landlord
        this.deleteLandlord = (req, res) => __awaiter(this, void 0, void 0, function* () {
            try {
                const landlordId = req.params.id;
                if (!landlordId) {
                    return res.status(404).json({ error: 'kindly supply the landlord id' });
                }
                yield this.landlordService.deleteLandlord(landlordId);
                return res.status(204).send();
            }
            catch (err) {
                return res.status(500).json({ error: err.message });
            }
        });
        // Get all landlords
        this.getAllLandlords = (req, res) => __awaiter(this, void 0, void 0, function* () {
            try {
                const landlords = yield this.landlordService.getAllLandlords();
                return res.status(200).json(landlords);
            }
            catch (err) {
                console.log(err);
                return res.status(500).json({ error: err.message });
            }
        });
        // Get a single landlord by ID
        this.getLandlordById = (req, res) => __awaiter(this, void 0, void 0, function* () {
            try {
                const landlordId = req.params.id;
                if (!landlordId) {
                    return res.status(404).json({ error: 'kindly supply the landlordId' });
                }
                const landlord = yield this.landlordService.getLandlordById(landlordId);
                if (!landlord) {
                    return res.status(404).json({ error: 'Landlord not found' });
                }
                return res.status(200).json(landlord);
            }
            catch (err) {
                return res.status(500).json({ error: err.message });
            }
        });
        // get jobs completed for a landlord properties
        this.getCompletedVendorsJobsForLandordProperties = (req, res) => __awaiter(this, void 0, void 0, function* () {
            var _a, _b;
            try {
                const landlordId = (_b = (_a = req.user) === null || _a === void 0 ? void 0 : _a.landlords) === null || _b === void 0 ? void 0 : _b.id;
                if (!landlordId) {
                    return res.status(404).json({ error: 'kindly login as landlord' });
                }
                const maintenances = yield this.landlordService.getCompletedJobsLandlord(landlordId);
                return res.status(200).json({ maintenances });
            }
            catch (err) {
                return res.status(500).json({ error: err.message });
            }
        });
        // get jobs completed for a landlord properties
        this.getCurrentJobsForLandordProperties = (req, res) => __awaiter(this, void 0, void 0, function* () {
            var _a, _b;
            try {
                const landlordId = (_b = (_a = req.user) === null || _a === void 0 ? void 0 : _a.landlords) === null || _b === void 0 ? void 0 : _b.id;
                if (!landlordId) {
                    return res.status(404).json({ error: 'kindly login' });
                }
                const maintenances = yield this.landlordService.getCurrentVendorsByLandlord(landlordId);
                return res.status(200).json({ maintenances });
            }
            catch (err) {
                return res.status(500).json({ error: err.message });
            }
        });
        this.landlordService = new landlord_service_1.LandlordService();
    }
}
exports.default = new LandlordController();
