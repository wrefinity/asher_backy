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
        this.router.get('/property/landlord/:landlordId', property_controller_1.default.getPropertyListedByLandlord);
        this.router.post('/property/likes/:propertyId', this.authenticateService.authorize, property_controller_1.default.createLikeProperty);
        this.router.get('/property/user/likes', this.authenticateService.authorize, property_controller_1.default.getLikePropertyHistories);
        this.router.get('/property/:id', property_controller_1.default.getPropertyById);
        this.router.get('/property/state', property_controller_1.default.getPropertyByState);
        this.router.get('/property/listing', property_controller_1.default.getListedProperties);
        this.router.get('/property/maintenance/:propertyId', property_controller_1.default.getPropsMaintenance);
        this.router.get('/property/vendors/:propertyId', property_controller_1.default.getVendorsServicesOnProps);
        this.router.post("/property/viewings", this.authenticateService.authorize, property_controller_1.default.createViewing);
        this.router.get("/property/viewings/:propertyId", this.authenticateService.authorize, property_controller_1.default.getAllPropsViewings);
        this.router.get("/property/view/:id", this.authenticateService.authorize, property_controller_1.default.getViewingById);
        this.router.patch("/property/viewings/:id", this.authenticateService.authorize, property_controller_1.default.updateViewing);
        this.router.patch("/property/view/:propertyId", this.authenticateService.authorize, property_controller_1.default.viewProperty);
        this.router.delete("/viewings/:id", this.authenticateService.authorize, property_controller_1.default.deleteViewing);
    }
}
exports.default = new PropertyRouter().router;
