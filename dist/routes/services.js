"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const services_controller_1 = __importDefault(require("../vendor/controllers/services.controller"));
const authorize_1 = require("../middlewares/authorize");
const client_1 = require("@prisma/client");
class VendorServiceRoutes {
    constructor() {
        this.router = (0, express_1.Router)();
        this.initializeRoutes = this.initializeRoutes.bind(this);
        this.authenticateService = new authorize_1.Authorize();
        this.initializeRoutes();
    }
    initializeRoutes() {
        this.router.use(this.authenticateService.authorize);
        this.router.post('/', this.authenticateService.authorizeRole(client_1.userRoles.VENDOR), services_controller_1.default.createService);
        this.router.get('/', services_controller_1.default.getAllServices);
        this.router.post('/category/:categoryId', this.authenticateService.authorize, services_controller_1.default.getServicesByCategoryAndSubcategories);
        this.router.post('/offer/:categoryId', this.authenticateService.authorize, services_controller_1.default.applyOffer);
        this.router.get('/:id', services_controller_1.default.getService);
        this.router.patch('/:id', this.authenticateService.authorize, services_controller_1.default.updateService);
        this.router.delete('/:id', this.authenticateService.authorize, services_controller_1.default.deleteService);
    }
}
exports.default = new VendorServiceRoutes().router;
