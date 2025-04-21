"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const authorize_1 = require("../../middlewares/authorize");
const properties_controller_1 = __importDefault(require("../controllers/properties.controller"));
const setting_controller_1 = __importDefault(require("../controllers/setting.controller"));
const multer_1 = __importStar(require("../../configs/multer"));
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
        this.router.get('/property/rentals', properties_controller_1.default.categorizedPropsInRentals);
        this.router.post('/property/property-listing', properties_controller_1.default.createPropertyListing);
        this.router.delete('/property/property-unlisting/:propertyId', properties_controller_1.default.unListPropertyListing);
        this.router.get('/property/property-listing', properties_controller_1.default.getLandlordPropertyListing);
        this.router.get('/property/property-listing/active-inactive', properties_controller_1.default.getActiveOrInactivePropsListing);
        this.router.patch('/property/property-listing/:propertyId', properties_controller_1.default.updatePropsListing);
        this.router.get('/property', properties_controller_1.default.getCurrentLandlordProperties);
        this.router.post('/property', multer_1.default.array('files'), multerCloudinary_1.uploadToCloudinary, properties_controller_1.default.createProperty);
        this.router.post('/create', multer_1.default.array("files"), multerCloudinary_1.handlePropertyUploads, properties_controller_1.default.createProperties);
        this.router.post('/upload', multer_1.uploadcsv.single("files"), properties_controller_1.default.bulkPropsUpload);
        this.router.delete('/property/:propertyId', properties_controller_1.default.deleteLandlordProperties);
        this.router.patch('/property/status/:propertyId', properties_controller_1.default.updatePropertyAvailability);
        this.router.get('/property/showcased', properties_controller_1.default.getShowCasedRentals);
        this.router.get('/property/tenants/:propertyId', properties_controller_1.default.getTenantsForProperty);
        this.router.get('/property/without-tenants', properties_controller_1.default.getPropertiesWithoutTenants);
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
        this.router.get('/settings/global/application-fee/:id', setting_controller_1.default.getApplicationFee);
        // Route to update a specific global setting
        this.router.put('/settings/global/:id', setting_controller_1.default.updateLandlordGlobalSetting);
        // Route to delete a specific global setting
        this.router.delete('/settings/global/:id', setting_controller_1.default.deleteLandlordGlobalSetting);
    }
}
exports.default = new ApartmentLandlordRouter().router;
