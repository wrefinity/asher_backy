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
class PropertyUnit {
    constructor() {
        // Update unit details
        this.updateUnitProperty = (id, data) => __awaiter(this, void 0, void 0, function* () {
            return yield __1.prismaClient.unitConfiguration.update({
                where: { id },
                data,
            });
        });
        // Soft delete the unit by marking isDeleted = true (you need to add this field in the model)
        this.softDeleteUnit = (id) => __awaiter(this, void 0, void 0, function* () {
            return yield __1.prismaClient.unitConfiguration.update({
                where: { id },
                data: { isDeleted: true },
            });
        });
        // Update unit availability status (VACANT or OCCUPIED)
        this.updateUnitAvailabilityStatus = (id, availability) => __awaiter(this, void 0, void 0, function* () {
            return yield __1.prismaClient.unitConfiguration.update({
                where: { id },
                data: { availability },
            });
        });
        // Fetch all unit across all property types
        this.getAllUnit = () => __awaiter(this, void 0, void 0, function* () {
            return yield __1.prismaClient.unitConfiguration.findMany({
                include: {
                    ResidentialProperty: true,
                    CommercialProperty: true,
                    images: true,
                },
            });
        });
    }
    // Create a unit under any one of the property types
    createUnitDetail(data) {
        return __awaiter(this, void 0, void 0, function* () {
            const { residentialPropertyId, commercialPropertyId, uploadedFiles } = data, rest = __rest(data, ["residentialPropertyId", "commercialPropertyId", "uploadedFiles"]);
            const propertyTypes = [residentialPropertyId, commercialPropertyId].filter(Boolean);
            if (propertyTypes.length !== 1) {
                throw new Error('Exactly one of residentialPropertyId or commercialPropertyId must be provided.');
            }
            // Separate media by type
            const images = uploadedFiles === null || uploadedFiles === void 0 ? void 0 : uploadedFiles.filter(file => (file === null || file === void 0 ? void 0 : file.identifier) === 'MediaTable' && (file === null || file === void 0 ? void 0 : file.type) === client_1.MediaType.IMAGE);
            return yield __1.prismaClient.unitConfiguration.create({
                data: Object.assign(Object.assign({}, rest), { residentialPropertyId,
                    commercialPropertyId, images: {
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
    // Get unit by ID
    getUnitById(id) {
        return __awaiter(this, void 0, void 0, function* () {
            const props = yield __1.prismaClient.unitConfiguration.findUnique({
                where: { id },
                include: {
                    ResidentialProperty: true,
                    CommercialProperty: true,
                    images: true,
                }
            });
            if (!props) {
                throw new Error("Unit not found");
            }
            const { ResidentialProperty, CommercialProperty } = props, rest = __rest(props, ["ResidentialProperty", "CommercialProperty"]);
            return Object.assign(Object.assign({}, rest), { residential: ResidentialProperty, commercial: CommercialProperty });
        });
    }
    getUnitByProperty(propertyType, propertyId) {
        return __awaiter(this, void 0, void 0, function* () {
            // Validate propertyType again in service layer for extra safety
            if (!Object.values(client_1.PropertySpecificationType).includes(propertyType)) {
                throw new Error(`Invalid property type: ${propertyType}`);
            }
            let whereClause = {};
            switch (propertyType) {
                case client_1.PropertySpecificationType.RESIDENTIAL:
                    whereClause.residentialPropertyId = propertyId;
                    break;
                case client_1.PropertySpecificationType.COMMERCIAL:
                    whereClause.commercialPropertyId = propertyId;
                    break;
                //   case PropertySpecificationType.SHORTLET:
                //     whereClause.shortletPropertyId = propertyId;
                //     break;
                default:
                    throw new Error('Invalid property type');
            }
            return yield __1.prismaClient.unitConfiguration.findMany({
                where: whereClause,
                include: { images: true, ResidentialProperty: true, CommercialProperty: true },
            });
        });
    }
}
exports.default = new PropertyUnit();
