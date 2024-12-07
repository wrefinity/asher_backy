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
const __1 = require("..");
const propertyServices_1 = __importDefault(require("./propertyServices"));
class ApartmentService {
    constructor() {
        this.getApartments = (propertyId) => __awaiter(this, void 0, void 0, function* () {
            return yield __1.prismaClient.apartments.findMany({
                where: { isDeleted: false, propertyId },
                include: this.inclusion
            });
        });
        this.getApartmentById = (id) => __awaiter(this, void 0, void 0, function* () {
            return yield __1.prismaClient.apartments.findFirst({
                where: {
                    id,
                    isDeleted: false
                },
                include: this.inclusion
            });
        });
        this.createApartment = (data) => __awaiter(this, void 0, void 0, function* () {
            var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m;
            const propertyExists = yield propertyServices_1.default.getPropertiesById(data.propertyId);
            if (!propertyExists)
                throw new Error('Property not found');
            return yield __1.prismaClient.apartments.create({
                data: {
                    code: data.code,
                    description: data.description,
                    waitingRoom: (_a = data.waitingRoom) !== null && _a !== void 0 ? _a : null,
                    name: data.name,
                    size: data.size,
                    monthlyRent: data.monthlyRent,
                    minLeaseDuration: data.minLeaseDuration,
                    maxLeaseDuration: data.maxLeaseDuration,
                    bedrooms: (_b = data.bedrooms) !== null && _b !== void 0 ? _b : null,
                    sittingRoom: (_c = data.sittingRoom) !== null && _c !== void 0 ? _c : null,
                    kitchen: (_d = data.kitchen) !== null && _d !== void 0 ? _d : null,
                    bathrooms: (_e = data.bathrooms) !== null && _e !== void 0 ? _e : null,
                    garages: (_f = data.garages) !== null && _f !== void 0 ? _f : null,
                    floorplans: (_g = data.floorplans) !== null && _g !== void 0 ? _g : [],
                    facilities: (_h = data.facilities) !== null && _h !== void 0 ? _h : [],
                    offices: (_j = data.offices) !== null && _j !== void 0 ? _j : null,
                    isVacant: (_k = data.isVacant) !== null && _k !== void 0 ? _k : true,
                    rentalAmount: data.rentalAmount,
                    images: (_l = data.images) !== null && _l !== void 0 ? _l : [],
                    videourl: (_m = data.videourl) !== null && _m !== void 0 ? _m : [],
                    propertyId: data.propertyId,
                },
                include: {
                    property: true,
                }
            });
        });
        this.updateApartment = (id, data) => __awaiter(this, void 0, void 0, function* () {
            var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m, _o, _p, _q, _r, _s, _t, _u, _v, _w;
            const apartmentExists = yield this.getApartmentById(id);
            if (!apartmentExists)
                throw new Error("Apartment not found");
            if (data.propertyId) {
                const propertyExists = yield propertyServices_1.default.getPropertiesById(data.propertyId);
                if (!propertyExists) {
                    throw new Error("Property not found");
                }
            }
            return yield __1.prismaClient.apartments.update({
                where: { id },
                data: {
                    code: (_a = data.code) !== null && _a !== void 0 ? _a : apartmentExists.code,
                    description: (_b = data.description) !== null && _b !== void 0 ? _b : apartmentExists.description,
                    name: (_c = data.name) !== null && _c !== void 0 ? _c : apartmentExists.name,
                    size: (_d = data.size) !== null && _d !== void 0 ? _d : apartmentExists.size,
                    monthlyRent: (_e = data.monthlyRent) !== null && _e !== void 0 ? _e : apartmentExists.monthlyRent,
                    minLeaseDuration: (_f = data.minLeaseDuration) !== null && _f !== void 0 ? _f : apartmentExists.minLeaseDuration,
                    maxLeaseDuration: (_g = data.maxLeaseDuration) !== null && _g !== void 0 ? _g : apartmentExists.maxLeaseDuration,
                    sittingRoom: (_h = data.sittingRoom) !== null && _h !== void 0 ? _h : apartmentExists.sittingRoom,
                    waitingRoom: (_j = data.waitingRoom) !== null && _j !== void 0 ? _j : apartmentExists.waitingRoom,
                    bedrooms: (_k = data.bedrooms) !== null && _k !== void 0 ? _k : apartmentExists.bedrooms,
                    kitchen: (_l = data.kitchen) !== null && _l !== void 0 ? _l : apartmentExists.kitchen,
                    bathrooms: (_m = data.bathrooms) !== null && _m !== void 0 ? _m : apartmentExists.bathrooms,
                    garages: (_o = data.garages) !== null && _o !== void 0 ? _o : apartmentExists.garages,
                    floorplans: (_p = data.floorplans) !== null && _p !== void 0 ? _p : apartmentExists.floorplans,
                    facilities: (_q = data.facilities) !== null && _q !== void 0 ? _q : apartmentExists.facilities,
                    offices: (_r = data.offices) !== null && _r !== void 0 ? _r : apartmentExists.offices,
                    isVacant: (_s = data.isVacant) !== null && _s !== void 0 ? _s : apartmentExists.isVacant,
                    rentalAmount: (_t = data.rentalAmount) !== null && _t !== void 0 ? _t : apartmentExists.rentalAmount,
                    images: (_u = data.images) !== null && _u !== void 0 ? _u : apartmentExists.images,
                    videourl: (_v = data.videourl) !== null && _v !== void 0 ? _v : apartmentExists.videourl,
                    propertyId: (_w = data.propertyId) !== null && _w !== void 0 ? _w : apartmentExists.propertyId,
                },
                include: this.inclusion,
            });
        });
        // Fetch apartments based on the currently logged-in landlord
        this.getApartmentsByLandlord = (landlordId) => __awaiter(this, void 0, void 0, function* () {
            return yield __1.prismaClient.apartments.findMany({
                where: {
                    isDeleted: false,
                    property: {
                        landlordId,
                        isDeleted: false,
                    },
                },
                include: this.inclusion,
            });
        });
        this.deleteApartment = (id) => __awaiter(this, void 0, void 0, function* () {
            return yield __1.prismaClient.apartments.update({
                where: { id },
                data: {
                    isDeleted: false
                }
            });
        });
        this.inclusion = {
            property: true
        };
    }
}
exports.default = new ApartmentService();
