"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateWhitelistSchema = exports.maintenanceWhitelistSchema = void 0;
const joi_1 = __importDefault(require("joi"));
exports.maintenanceWhitelistSchema = joi_1.default.object({
    categoryId: joi_1.default.string().required(),
    subcategoryId: joi_1.default.string().optional(),
    propertyId: joi_1.default.string().optional(),
    apartmentId: joi_1.default.string().optional(),
});
exports.updateWhitelistSchema = joi_1.default.object({
    categoryId: joi_1.default.string().optional(),
    subcategoryId: joi_1.default.string().optional(),
    propertyId: joi_1.default.string(),
    apartmentId: joi_1.default.string().optional(),
});
// cm255m7nu0005dr5sp7fgvf7p
// cm515lu0f0001rplbnslzsazs
