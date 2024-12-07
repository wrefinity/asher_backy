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
const apartment_services_1 = __importDefault(require("../services/apartment.services"));
const apartment_schema_1 = require("../validations/schemas/apartment.schema");
class AppartmentController {
    constructor() {
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
    createApartment(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const { error } = apartment_schema_1.apartmentSchema.validate(req.body);
                if (error)
                    return res.status(400).send(error.details[0].message);
                const propertyData = req.body;
                const propertyId = req.params.propertyId;
                const property = yield apartment_services_1.default.createApartment(Object.assign(Object.assign({}, propertyData), { sittingRoom: Number(propertyData.sittingRoom), waitingRoom: Number(propertyData.waitingRoom), bedrooms: Number(propertyData.bedrooms), kitchen: Number(propertyData.kitchen), bathrooms: Number(propertyData.bathrooms), garages: Number(propertyData.garages), offices: Number(propertyData.offices), propertyId }));
                return res.status(201).json(property);
            }
            catch (error) {
                error_service_1.default.handleError(error, res);
            }
        });
    }
    getAppartments(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const propertyId = req.params.propertyId;
                const properties = yield apartment_services_1.default.getApartments(propertyId);
                if (properties.length < 1)
                    return res.status(200).json({ message: "No Property listed yet" });
                return res.status(200).json(properties);
            }
            catch (error) {
                error_service_1.default.handleError(error, res);
            }
        });
    }
    getAppartmentById(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const apartmentId = req.params.apartmentId;
                const apartment = yield apartment_services_1.default.getApartmentById(apartmentId);
                if (!apartment)
                    return res.status(200).json({ message: "No Appartment Found" });
                return res.status(200).json(apartment);
            }
            catch (error) {
                error_service_1.default.handleError(error, res);
            }
        });
    }
}
exports.default = new AppartmentController();
