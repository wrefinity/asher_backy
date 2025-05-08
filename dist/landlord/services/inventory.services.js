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
const __1 = require("../..");
class InventoryService {
    constructor() {
        this.createInventory = (inventoryData) => __awaiter(this, void 0, void 0, function* () {
            const { propertyId } = inventoryData, rest = __rest(inventoryData, ["propertyId"]);
            // Validate that the propertyId exists
            const propertyExists = yield __1.prismaClient.properties.findUnique({
                where: { id: inventoryData.propertyId },
            });
            if (!propertyExists) {
                throw new Error(`Property with ID ${inventoryData.propertyId} does not exist`);
            }
            return yield __1.prismaClient.inventoryManageMent.create({
                data: Object.assign(Object.assign({}, rest), { property: {
                        connect: {
                            id: propertyId,
                        },
                    } })
            });
        });
        this.updateInventory = (inventoryId, inventoryData) => __awaiter(this, void 0, void 0, function* () {
            return yield __1.prismaClient.inventoryManageMent.update({
                where: { id: inventoryId },
                data: inventoryData,
            });
        });
        this.deleteInventory = (inventoryId) => __awaiter(this, void 0, void 0, function* () {
            return yield __1.prismaClient.inventoryManageMent.update({
                where: { id: inventoryId },
                data: { isDeleted: true },
            });
        });
        this.getAllInventoriesByProperty = (propertyId) => __awaiter(this, void 0, void 0, function* () {
            return yield __1.prismaClient.inventoryManageMent.findMany({
                where: { propertyId },
            });
        });
    }
    getInventoryById(inventoryId) {
        return __awaiter(this, void 0, void 0, function* () {
            return yield __1.prismaClient.inventoryManageMent.findUnique({
                where: { id: inventoryId },
            });
        });
    }
    getAllInventory() {
        return __awaiter(this, void 0, void 0, function* () {
            return yield __1.prismaClient.inventoryManageMent.findMany({
                include: {
                    property: true,
                }
            });
        });
    }
}
exports.default = new InventoryService();
