"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const profile_1 = __importDefault(require("../controllers/profile"));
const multerCloudinary_1 = require("../middlewares/multerCloudinary");
const multer_1 = __importDefault(require("../configs/multer"));
const authorize_1 = require("../middlewares/authorize");
class ProfileRoutes {
    constructor() {
        this.router = (0, express_1.Router)();
        this.authenticateService = new authorize_1.Authorize();
        this.router.use(this.authenticateService.authorize);
        this.initializeRoutes();
    }
    initializeRoutes() {
        this.router.post('/update', multer_1.default.array('files'), multerCloudinary_1.uploadToCloudinary, profile_1.default.profileUpdate);
        this.router.post('/search-preferences', profile_1.default.addUserSearchPreference);
        this.router.get('/', profile_1.default.getCurrentUserProfile);
    }
}
exports.default = new ProfileRoutes().router;
