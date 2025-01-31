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
const inventory_services_1 = __importDefault(require("../services/inventory.services"));
const inventorySchema_1 = require("../validations/schema/inventorySchema");
class InventoryController {
    constructor() {
        this.createInventory = (req, res) => __awaiter(this, void 0, void 0, function* () {
            const { value, error } = yield inventorySchema_1.inventorySchema.validate(req.body);
            if (error)
                return res.status(400).json({ message: error.details[0].message });
            try {
                const inventory = yield inventory_services_1.default.createInventory(value);
                return res.status(201).json({ inventory });
            }
            catch (error) {
                error_service_1.default.handleError(error, res);
            }
        });
        this.getAllInventorys = (req, res) => __awaiter(this, void 0, void 0, function* () {
            try {
                const inventorys = yield inventory_services_1.default.getAllInventory();
                return res.status(200).json({ inventorys });
            }
            catch (error) {
                error_service_1.default.handleError(error, res);
            }
        });
        this.getInventoryById = (req, res) => __awaiter(this, void 0, void 0, function* () {
            try {
                const { inventoryId } = req.params;
                const inventory = yield inventory_services_1.default.getInventoryById(inventoryId);
                if (!inventory)
                    return res.status(404).json({ message: "Inventory not found" });
                return res.status(200).json(inventory);
            }
            catch (error) {
                error_service_1.default.handleError(error, res);
            }
        });
        this.updateInventory = (req, res) => __awaiter(this, void 0, void 0, function* () {
            // const { value, error } = await inventorySchema.validate(req.body);
            // if (error) return res.status(400).json({ message: error.details[0].message });
            try {
                const { value, error } = yield inventorySchema_1.inventoryUpdateSchema.validate(req.body);
                if (error)
                    return res.status(400).json({ message: error.details[0].message });
                const updatedInventory = yield inventory_services_1.default.updateInventory(req.params.inventoryId, value);
                if (!updatedInventory)
                    return res.status(404).json({ message: "Inventory not found" });
                return res.status(200).json({ updatedInventory });
            }
            catch (error) {
                error_service_1.default.handleError(error, res);
            }
        });
        this.deleteInventory = (req, res) => __awaiter(this, void 0, void 0, function* () {
            try {
                const deletedInventory = yield inventory_services_1.default.deleteInventory(req.params.inventoryId);
                if (!deletedInventory)
                    return res.status(404).json({ message: "Inventory not found" });
                return res.status(200).json({ deletedInventory });
            }
            catch (error) {
                error_service_1.default.handleError(error, res);
            }
        });
        this.getAllInventorysByProperty = (req, res) => __awaiter(this, void 0, void 0, function* () {
            try {
                const { propertyId } = req.params;
                const inventorys = yield inventory_services_1.default.getAllInventoriesByProperty(propertyId);
                if (inventorys.length === 0)
                    return res.status(404).json({ message: "No inventorys found" });
                return res.status(200).json({ inventorys });
            }
            catch (error) {
                error_service_1.default.handleError(error, res);
            }
        });
    }
}
exports.default = new InventoryController();
