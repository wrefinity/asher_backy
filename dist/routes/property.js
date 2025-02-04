"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const authorize_1 = require("../middlewares/authorize");
const property_controller_1 = __importDefault(require("../controllers/property.controller"));
const propertydoc_1 = __importDefault(require("./propertydoc"));
const appartment_1 = __importDefault(require("./appartment"));
class PropertyRouter {
    constructor() {
        this.router = (0, express_1.Router)();
        this.authenticateService = new authorize_1.Authorize();
        this.initializeRoutes();
    }
    initializeRoutes() {
        this.router.use("/docs", propertydoc_1.default);
        this.router.use("/apartments", appartment_1.default);
        this.router.get('/property', property_controller_1.default.getProperty);
        this.router.get('/property/:id', property_controller_1.default.getPropertyById);
        this.router.get('/property/state', property_controller_1.default.getPropertyByState);
        this.router.get('/property/listing', property_controller_1.default.getListedProperties);
        this.router.get('/property/maintenance/:propertyId', property_controller_1.default.getPropsMaintenance);
        this.router.get('/property/vendors/:propertyId', property_controller_1.default.getVendorsServicesOnProps);
    }
}
exports.default = new PropertyRouter().router;
