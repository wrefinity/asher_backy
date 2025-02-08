"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const users_controller_1 = __importDefault(require("../controllers/users.controller"));
class UserRoutes {
    constructor() {
        this.router = (0, express_1.Router)();
        this.initializeRoutes();
    }
    initializeRoutes() {
        this.router.get("/:userId", users_controller_1.default.getUserById.bind(users_controller_1.default));
    }
}
exports.default = new UserRoutes().router;
