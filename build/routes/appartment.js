"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const authorize_1 = require("../middlewares/authorize");
const multer_1 = __importDefault(require("../configs/multer"));
const multerCloudinary_1 = require("../middlewares/multerCloudinary");
const apartment_controller_1 = __importDefault(require("../controllers/apartment.controller"));
class ApartmentRouter {
    constructor() {
        this.router = (0, express_1.Router)();
        this.authenticateService = new authorize_1.Authorize();
        this.initializeRoutes();
    }
    initializeRoutes() {
        this.router.post('/:propertyId', this.authenticateService.authorize, multer_1.default.array('files'), multerCloudinary_1.uploadToCloudinary, apartment_controller_1.default.createApartment);
        this.router.get('/:propertyId', apartment_controller_1.default.getAppartments);
    }
}
exports.default = new ApartmentRouter().router;
