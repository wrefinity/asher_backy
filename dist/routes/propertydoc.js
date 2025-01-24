"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const authorize_1 = require("../middlewares/authorize");
const propertyDocument_controller_1 = __importDefault(require("../controllers/propertyDocument.controller"));
const multer_1 = __importDefault(require("../configs/multer"));
const multerCloudinary_1 = require("../middlewares/multerCloudinary");
class PropertyDocsRouter {
    constructor() {
        this.router = (0, express_1.Router)();
        this.authenticateService = new authorize_1.Authorize();
        this.initializeRoutes();
    }
    initializeRoutes() {
        this.router.post('/', this.authenticateService.authorize, multer_1.default.array('files'), multerCloudinary_1.uploadToCloudinary, propertyDocument_controller_1.default.create);
        this.router.get('/props/:propertyId', propertyDocument_controller_1.default.findAll);
        this.router.get('/:id', propertyDocument_controller_1.default.findById);
        this.router.put('/:id', propertyDocument_controller_1.default.update);
        this.router.delete('/:id', propertyDocument_controller_1.default.delete);
    }
}
exports.default = new PropertyDocsRouter().router;
