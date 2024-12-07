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
const __1 = require("../..");
class InventoryService {
    createInventory(inventoryData) {
        return __awaiter(this, void 0, void 0, function* () {
            //NOTE: Check the property ID if it exist before inserting into the table
            return yield __1.prismaClient.inventoryManageMent.create({
                data: inventoryData,
            });
        });
    }
    ;
    updateInventory(inventoryId, inventoryData) {
        return __awaiter(this, void 0, void 0, function* () {
            return yield __1.prismaClient.inventoryManageMent.update({
                where: { id: inventoryId },
                data: inventoryData,
            });
        });
    }
    deleteInventory(inventoryId) {
        return __awaiter(this, void 0, void 0, function* () {
            return yield __1.prismaClient.inventoryManageMent.delete({
                where: { id: inventoryId },
            });
        });
    }
    getAllInventoriesByProperty(propertyId) {
        return __awaiter(this, void 0, void 0, function* () {
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
