"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const authorize_1 = require("../../middlewares/authorize");
const apartment_controller_1 = __importDefault(require("../controllers/apartment.controller"));
const multer_1 = __importDefault(require("../../configs/multer"));
const multerCloudinary_1 = require("../../middlewares/multerCloudinary");
class ApartmentLandlordRouter {
    constructor() {
        this.router = (0, express_1.Router)();
        this.authenticateService = new authorize_1.Authorize();
        this.initializeRoutes();
    }
    initializeRoutes() {
        this.router.get('/', apartment_controller_1.default.getCurrentLandlordAppartments);
        this.router.post('/', multer_1.default.array('files'), multerCloudinary_1.uploadToCloudinary, apartment_controller_1.default.createApartment);
        this.router.patch('/:apartmentId', multer_1.default.array('files'), multerCloudinary_1.uploadToCloudinary, apartment_controller_1.default.updateApartment);
        this.router.delete('/:apartmentId', apartment_controller_1.default.deleteApartments);
    }
}
exports.default = new ApartmentLandlordRouter().router;
