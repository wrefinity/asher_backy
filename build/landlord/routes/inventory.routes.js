"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const authorize_1 = require("../../middlewares/authorize");
const inventory_controller_1 = __importDefault(require("../controllers/inventory.controller"));
class InventoryRouter {
    constructor() {
        this.router = (0, express_1.Router)();
        this.authenticateService = new authorize_1.Authorize();
        this.initializeRoutes();
    }
    initializeRoutes() {
        this.router.use(this.authenticateService.authorize);
        this.router.post('/', inventory_controller_1.default.createInventory);
        this.router.get('/', inventory_controller_1.default.getAllInventorys);
        this.router.get('/:inventoryId', inventory_controller_1.default.getInventoryById);
        this.router.patch('/:inventoryId', inventory_controller_1.default.updateInventory);
        this.router.delete('/:inventoryId', inventory_controller_1.default.deleteInventory);
        this.router.get('/property/:propertyId', inventory_controller_1.default.getAllInventorysByProperty);
    }
}
exports.default = new InventoryRouter().router;
