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
var __rest = (this && this.__rest) || function (s, e) {
    var t = {};
    for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p) && e.indexOf(p) < 0)
        t[p] = s[p];
    if (s != null && typeof Object.getOwnPropertySymbols === "function")
        for (var i = 0, p = Object.getOwnPropertySymbols(s); i < p.length; i++) {
            if (e.indexOf(p[i]) < 0 && Object.prototype.propertyIsEnumerable.call(s, p[i]))
                t[p[i]] = s[p[i]];
        }
    return t;
};
Object.defineProperty(exports, "__esModule", { value: true });
const __1 = require("..");
const client_1 = require("@prisma/client");
class PropertyRoom {
    constructor() {
        // Update room details
        this.updateRoomProperty = (id, data) => __awaiter(this, void 0, void 0, function* () {
            return yield __1.prismaClient.roomDetail.update({
                where: { id },
                data,
            });
        });
        // Soft delete the unit by marking isDeleted = true (you need to add this field in the model)
        this.softDeleteUnit = (id) => __awaiter(this, void 0, void 0, function* () {
            return yield __1.prismaClient.roomDetail.update({
                where: { id },
                data: { isDeleted: true },
            });
        });
        // Update unit availability status (VACANT or OCCUPIED)
        this.updateUnitAvailabilityStatus = (id, availability) => __awaiter(this, void 0, void 0, function* () {
            return yield __1.prismaClient.roomDetail.update({
                where: { id },
                data: { availability },
            });
        });
        // Fetch all rooms across all property types
        this.getAllRooms = () => __awaiter(this, void 0, void 0, function* () {
            return yield __1.prismaClient.roomDetail.findMany({
                include: {
                    ResidentialProperty: true,
                    CommercialProperty: true,
                    ShortletProperty: true,
                    images: true,
                },
            });
        });
    }
    // Create a room under any one of the property types
    createRoomDetail(data) {
        return __awaiter(this, void 0, void 0, function* () {
            const { residentialPropertyId, commercialPropertyId, shortletPropertyId, uploadedFiles } = data, rest = __rest(data, ["residentialPropertyId", "commercialPropertyId", "shortletPropertyId", "uploadedFiles"]);
            const propertyTypes = [residentialPropertyId, commercialPropertyId].filter(Boolean);
            if (propertyTypes.length !== 1) {
                throw new Error('Exactly one of residentialPropertyId, commercialPropertyId, or commercialPropertyId must be provided.');
            }
            // Separate media by type
            const images = uploadedFiles === null || uploadedFiles === void 0 ? void 0 : uploadedFiles.filter(file => (file === null || file === void 0 ? void 0 : file.identifier) === 'MediaTable' && (file === null || file === void 0 ? void 0 : file.type) === client_1.MediaType.IMAGE);
            return yield __1.prismaClient.roomDetail.create({
                data: Object.assign(Object.assign({}, rest), { residentialPropertyId,
                    commercialPropertyId,
                    shortletPropertyId, images: {
                        create: images === null || images === void 0 ? void 0 : images.map(img => ({
                            type: img.type,
                            size: img.size,
                            fileType: img.fileType,
                            url: img.url,
                            isPrimary: img.isPrimary,
                            caption: img.caption,
                        }))
                    } }),
            });
        });
    }
    // Get room by ID
    getRoomById(id) {
        return __awaiter(this, void 0, void 0, function* () {
            return yield __1.prismaClient.roomDetail.findUnique({
                where: { id },
                include: {
                    ResidentialProperty: true,
                    CommercialProperty: true,
                    ShortletProperty: true,
                    images: true,
                }
            });
        });
    }
    getRoomsByProperty(propertyType, propertyId) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!Object.values(client_1.PropertySpecificationType).includes(propertyType)) {
                throw new Error(`Invalid property type: ${propertyType}`);
            }
            let whereClause = {};
            switch (propertyType) {
                case client_1.PropertySpecificationType.RESIDENTIAL:
                    whereClause.ResidentialProperty = { id: propertyId };
                    break;
                case client_1.PropertySpecificationType.COMMERCIAL:
                    whereClause.CommercialProperty = { id: propertyId };
                    break;
                // Uncomment and extend for SHORTLET or others:
                case client_1.PropertySpecificationType.SHORTLET:
                    whereClause.ShortletProperty = { id: propertyId };
                    break;
                default:
                    throw new Error('Invalid property type');
            }
            const units = yield __1.prismaClient.roomDetail.findMany({
                where: whereClause,
                include: {
                    images: true,
                    ResidentialProperty: true,
                    CommercialProperty: true,
                    ShortletProperty: true,
                },
            });
            // Format response to flatten and rename relations
            const formattedUnits = units.map(unit => {
                const { ResidentialProperty, ShortletProperty, CommercialProperty } = unit, rest = __rest(unit, ["ResidentialProperty", "ShortletProperty", "CommercialProperty"]);
                return Object.assign(Object.assign({}, rest), { residential: ResidentialProperty, commercial: CommercialProperty, shortlet: ShortletProperty });
            });
            return formattedUnits;
        });
    }
}
exports.default = new PropertyRoom();
