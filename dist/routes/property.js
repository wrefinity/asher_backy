"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const authorize_1 = require("../middlewares/authorize");
const property_controller_1 = __importDefault(require("../controllers/property.controller"));
const propertydoc_1 = __importDefault(require("./propertydoc"));
const booking_1 = __importDefault(require("./booking"));
class PropertyRouter {
    constructor() {
        this.router = (0, express_1.Router)();
        this.authenticateService = new authorize_1.Authorize();
        this.initializeRoutes();
    }
    initializeRoutes() {
        //     this.router.post("/property/features",  this.authenticateService.authorize, PropertyController.createFeatures);
        //     this.router.get("/property/features",  this.authenticateService.authorize, PropertyController.getFeatures);
        this.router.post("/property/enquire", this.authenticateService.authorize, property_controller_1.default.enquireProperty);
        this.router.use("/docs", propertydoc_1.default);
        this.router.use("/bookings", booking_1.default);
        this.router.get('/property', property_controller_1.default.getProperty);
        this.router.get('/property/unit/:id', property_controller_1.default.getPropsUnit);
        this.router.get('/property/units/:propertyId', property_controller_1.default.getPropsUnitsByPropertyId);
        this.router.get('/property/room/:id', property_controller_1.default.getPropsRoom);
        this.router.get('/property/rooms/:propertyId', property_controller_1.default.getPropsRoomByPropertyId);
        this.router.get('/property/landlord/:landlordId', property_controller_1.default.getPropertyListedByLandlord);
        this.router.post('/property/likes/:propertyId', this.authenticateService.authorize, property_controller_1.default.createLikeProperty);
        this.router.get('/property/user/likes', this.authenticateService.authorize, property_controller_1.default.getLikePropertyHistories);
        this.router.get('/property/:id', property_controller_1.default.getPropertyById);
        this.router.get('/property/state', property_controller_1.default.getPropertyByState);
        this.router.get('/property/listing', property_controller_1.default.getListedProperties);
        this.router.get('/property/maintenance/:propertyId', property_controller_1.default.getPropsMaintenance);
        this.router.get('/property/vendors/:propertyId', property_controller_1.default.getVendorsServicesOnProps);
        this.router.patch("/property/view/:propertyId", this.authenticateService.authorize, property_controller_1.default.viewProperty);
    }
}
exports.default = new PropertyRouter().router;
