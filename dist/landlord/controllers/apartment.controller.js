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
const error_service_1 = __importDefault(require("../../services/error.service"));
const apartment_services_1 = __importDefault(require("../../services/apartment.services"));
const apartment_schema_1 = require("../../validations/schemas/apartment.schema");
class AppartmentController {
    constructor() {
        this.createApartment = (req, res) => __awaiter(this, void 0, void 0, function* () {
            try {
                const { error, value } = apartment_schema_1.apartmentSchema.validate(req.body);
                if (error)
                    return res.status(400).send(error.details[0].message);
                // const propertyId = req.params.propertyId;
                const videourl = value === null || value === void 0 ? void 0 : value.videourl;
                const images = value === null || value === void 0 ? void 0 : value.cloudinaryUrls;
                value === null || value === void 0 ? true : delete value.videourl;
                value === null || value === void 0 ? true : delete value.cloudinaryUrls;
                value === null || value === void 0 ? true : delete value.cloudinaryDocumentUrls;
                const property = yield apartment_services_1.default.createApartment(Object.assign(Object.assign({}, value), { sittingRoom: Number(value.sittingRoom), waitingRoom: Number(value.waitingRoom), bedrooms: Number(value.bedrooms), kitchen: Number(value.kitchen), bathrooms: Number(value.bathrooms), garages: Number(value.garages), offices: Number(value.offices), videourl,
                    images }));
                return res.status(201).json({ property });
            }
            catch (error) {
                error_service_1.default.handleError(error, res);
            }
        });
        this.getAppartmentById = (req, res) => __awaiter(this, void 0, void 0, function* () {
            try {
                const apartmentId = req.params.apartmentId;
                const apartment = yield apartment_services_1.default.getApartmentById(apartmentId);
                if (!apartment)
                    return res.status(200).json({ message: "No Appartment Found" });
                return res.status(200).json({ apartment });
            }
            catch (error) {
                error_service_1.default.handleError(error, res);
            }
        });
        this.getCurrentLandlordAppartments = (req, res) => __awaiter(this, void 0, void 0, function* () {
            var _a, _b;
            try {
                const landlordId = (_b = (_a = req.user) === null || _a === void 0 ? void 0 : _a.landlords) === null || _b === void 0 ? void 0 : _b.id;
                if (!landlordId)
                    return res.status(404).json({ message: "Landlord not found" });
                const appartments = yield apartment_services_1.default.getApartmentsByLandlord(landlordId);
                if (!appartments)
                    return res.status(200).json({ message: "No Property listed yet" });
                return res.status(200).json({ appartments });
            }
            catch (error) {
                error_service_1.default.handleError(error, res);
            }
        });
        this.updateApartment = (req, res) => __awaiter(this, void 0, void 0, function* () {
            try {
                const { error, value } = apartment_schema_1.apartmentSchema.validate(req.body);
                if (error)
                    return res.status(400).send(error.details[0].message);
                const appartmentId = req.params.appartmentId;
                const videourl = value === null || value === void 0 ? void 0 : value.videourl;
                const images = value === null || value === void 0 ? void 0 : value.cloudinaryUrls;
                value === null || value === void 0 ? true : delete value.videourl;
                value === null || value === void 0 ? true : delete value.cloudinaryUrls;
                const property = yield apartment_services_1.default.updateApartment(appartmentId, Object.assign(Object.assign({}, value), { sittingRoom: Number(value.sittingRoom), waitingRoom: Number(value.waitingRoom), bedrooms: Number(value.bedrooms), kitchen: Number(value.kitchen), bathrooms: Number(value.bathrooms), garages: Number(value.garages), offices: Number(value.offices), videourl,
                    images }));
                return res.status(201).json({ property });
            }
            catch (error) {
                error_service_1.default.handleError(error, res);
            }
        });
        this.deleteApartments = (req, res) => __awaiter(this, void 0, void 0, function* () {
            try {
                const apartmentId = req.params.apartmentId;
                const apartment = yield apartment_services_1.default.deleteApartment(apartmentId);
                if (!apartment)
                    return res.status(404).json({ error: 'apartment not found' });
                res.status(200).json({ message: 'appartment deleted successfully' });
            }
            catch (error) {
                error_service_1.default.handleError(error, res);
            }
        });
    }
}
exports.default = new AppartmentController();
