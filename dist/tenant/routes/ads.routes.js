"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const authorize_1 = require("../../middlewares/authorize");
const multer_1 = __importDefault(require("../../configs/multer"));
const multerCloudinary_1 = require("../../middlewares/multerCloudinary");
const ads_controller_1 = __importDefault(require("../controllers/ads.controller"));
class AdsRouter {
    constructor() {
        this.router = (0, express_1.Router)();
        this.authenticateService = new authorize_1.Authorize();
        this.initializeRoutes();
    }
    initializeRoutes() {
        this.router.use(this.authenticateService.authorize);
        this.router.post('/', multer_1.default.array('files'), multerCloudinary_1.uploadToCloudinary, ads_controller_1.default.createAd);
        this.router.get('/listed', ads_controller_1.default.getAllListedAds);
        this.router.get('/:adsId', ads_controller_1.default.getAdsById);
        this.router.patch('/:adsId/list', this.authenticateService.authorizeRole, ads_controller_1.default.listAd);
        this.router.get('/post/location', ads_controller_1.default.getAdsByLocation);
        this.router.get('/user/:userId', ads_controller_1.default.getAdsByUser);
        this.router.get('/:adsId/stats', ads_controller_1.default.getAdStats);
        this.router.patch('/:adsId/stats', ads_controller_1.default.incrementAdsStats);
    }
}
exports.default = new AdsRouter().router;
