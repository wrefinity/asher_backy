"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const authorize_1 = require("../middlewares/authorize");
const file_upload_controller_1 = __importDefault(require("../controllers/file_upload.controller"));
const multer_1 = __importDefault(require("../configs/multer"));
const multerCloudinary_1 = require("../middlewares/multerCloudinary");
class UploadsRouter {
    constructor() {
        this.router = (0, express_1.Router)();
        this.authenticateService = new authorize_1.Authorize();
        this.initializeRoutes();
    }
    initializeRoutes() {
        this.router.post('/', multer_1.default.array('files'), multerCloudinary_1.uploadToCloudinary, file_upload_controller_1.default.uploadToCloudinary);
        this.router.post('/single', multer_1.default.array('files'), multerCloudinary_1.uploadToCloudinary, file_upload_controller_1.default.uploadAppDocumentsWithProps);
    }
}
exports.default = new UploadsRouter().router;
