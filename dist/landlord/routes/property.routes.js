"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const authorize_1 = require("../../middlewares/authorize");
const properties_controller_1 = __importDefault(require("../controllers/properties.controller"));
const setting_controller_1 = __importDefault(require("../controllers/setting.controller"));
const multer_1 = __importDefault(require("../../configs/multer"));
const multerCloudinary_1 = require("../../middlewares/multerCloudinary");
class ApartmentLandlordRouter {
    constructor() {
        this.router = (0, express_1.Router)();
        this.authenticateService = new authorize_1.Authorize();
        this.initializeRoutes();
    }
    initializeRoutes() {
        // landlord properties
        this.router.patch('/property/showcase/:propertyId', properties_controller_1.default.showCaseRentals);
        this.router.get('/property', properties_controller_1.default.getCurrentLandlordProperties);
        this.router.post('/property', multer_1.default.array('files'), multerCloudinary_1.uploadToCloudinary, properties_controller_1.default.createProperty);
        this.router.delete('/property/:propertyId', properties_controller_1.default.deleteLandlordProperties);
        this.router.patch('/property/status/:propertyId', properties_controller_1.default.updatePropertyAvailability);
        this.router.get('/property/showcased', properties_controller_1.default.getShowCasedRentals);
        //   settings 
        this.router.post('/settings', setting_controller_1.default.createPropApartmentSetting);
        this.router.get('/settings', setting_controller_1.default.getAllPropsApartSetting);
        this.router.get('/settings/:id', setting_controller_1.default.getById);
        this.router.patch('/settings/:id', setting_controller_1.default.updatePropsApartSetting);
        this.router.delete('/settings/:id', setting_controller_1.default.deletePropsApartmentSetting);
        // Route to create a global setting
        this.router.post('/settings/global', setting_controller_1.default.createGlobalSetting);
        // Route to get all global settings
        this.router.get('/settings/global', setting_controller_1.default.getAllGlobalSettings);
        // Route to update a specific global setting
        this.router.put('/settings/global/:id', setting_controller_1.default.updateLandlordGlobalSetting);
        // Route to delete a specific global setting
        this.router.delete('/settings/global/:id', setting_controller_1.default.deleteLandlordGlobalSetting);
    }
}
exports.default = new ApartmentLandlordRouter().router;
