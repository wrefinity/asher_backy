"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const authorize_1 = require("../middlewares/authorize");
const roles_controller_1 = __importDefault(require("../controllers/roles.controller"));
class RolesRouter {
    constructor() {
        this.router = (0, express_1.Router)();
        this.authenticateService = new authorize_1.Authorize();
        this.initializeRoutes();
    }
    initializeRoutes() {
        this.router.use(this.authenticateService.authorize);
        // Assign roles to a user
        this.router.post("/assign-roles", roles_controller_1.default.assignRoles);
        // Get roles of a specific user
        this.router.get("/roles/:userId", roles_controller_1.default.getUserRoles);
        // Remove roles from a user
        this.router.post("/remove-roles", roles_controller_1.default.removeRoles);
    }
}
exports.default = new RolesRouter().router;
