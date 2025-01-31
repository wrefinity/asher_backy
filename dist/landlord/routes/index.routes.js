"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const client_1 = require("@prisma/client");
const authorize_1 = require("../../middlewares/authorize");
const landlord_controller_1 = __importDefault(require("../controllers/landlord.controller"));
const application_routes_1 = __importDefault(require("./application.routes"));
const tenants_routes_1 = __importDefault(require("./tenants.routes"));
const property_routes_1 = __importDefault(require("./property.routes"));
const apartment_routes_1 = __importDefault(require("./apartment.routes"));
const maintenance_routes_1 = __importDefault(require("./maintenance.routes"));
const task_routes_1 = __importDefault(require("./task.routes"));
const inventory_routes_1 = __importDefault(require("./inventory.routes"));
const bill_routes_1 = __importDefault(require("./bill.routes"));
const braodcast_routes_1 = __importDefault(require("./braodcast.routes"));
const finance_routes_1 = __importDefault(require("./finance.routes"));
const landlord_transaction_routes_1 = __importDefault(require("./landlord-transaction.routes"));
class LandlordRouter {
    constructor() {
        this.router = (0, express_1.Router)();
        this.authenticateService = new authorize_1.Authorize();
        this.initializeRoutes();
    }
    initializeRoutes() {
        this.router.use(this.authenticateService.authorize);
        this.router.use(this.authenticateService.authorizeRole(client_1.userRoles.LANDLORD));
        // update landlord informations route
        this.router.get('/info', landlord_controller_1.default.getLandlordInfo);
        this.router.post('/info', landlord_controller_1.default.updateLandlordProfile);
        this.router.get('/', landlord_controller_1.default.getAllLandlords);
        this.router.get('/:id', landlord_controller_1.default.getLandlordUsingId);
        this.router.patch('/:id', landlord_controller_1.default.updateLandlord);
        this.router.delete('/:id', landlord_controller_1.default.deleteLandlord);
        this.router.get('/jobs/current', landlord_controller_1.default.getCurrentJobsForLandordProperties);
        this.router.get('/jobs/completed', landlord_controller_1.default.getCompletedVendorsJobsForLandordProperties);
        // maintenances modules under landlord
        this.router.use("/maintenance", maintenance_routes_1.default);
        // tenants modules under landlord
        this.router.use("/tenants", tenants_routes_1.default);
        // applications modules under landlord
        this.router.use('/application', application_routes_1.default);
        // properties modules under landlord
        this.router.use('/properties', property_routes_1.default);
        // appartments
        this.router.use('/apartments', apartment_routes_1.default);
        // tasks routes routes
        this.router.use("/tasks", task_routes_1.default);
        // inventory routes routes
        this.router.use("/inventory", inventory_routes_1.default);
        // bills routes routes
        this.router.use("/bills", bill_routes_1.default);
        this.router.use("/transactions", landlord_transaction_routes_1.default);
        this.router.use("/finance", finance_routes_1.default);
        //braodcast routes
        this.router.use('/broadcast', braodcast_routes_1.default);
    }
}
exports.default = new LandlordRouter().router;
