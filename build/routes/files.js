"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const files_controller_1 = __importDefault(require("../tenant/controllers/files.controller"));
const authorize_1 = require("../middlewares/authorize");
class FileRoute {
    constructor() {
        this.router = (0, express_1.Router)();
        this.initializeRoutes = this.initializeRoutes.bind(this);
        this.authenticateService = new authorize_1.Authorize();
        this.initializeRoutes();
    }
    initializeRoutes() {
        this.router.get('/', files_controller_1.default.getAllDocuments);
        this.router.get('/me', files_controller_1.default.getUserDocuments);
    }
}
exports.default = new FileRoute().router;
