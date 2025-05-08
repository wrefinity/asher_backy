"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const complaint_controller_1 = __importDefault(require("../controllers/complaint.controller"));
const authorize_1 = require("../middlewares/authorize");
class ChatRoutes {
    constructor() {
        this.router = (0, express_1.Router)();
        this.initializeRoutes = this.initializeRoutes.bind(this);
        this.authenticateService = new authorize_1.Authorize();
        this.initializeRoutes();
    }
    initializeRoutes() {
        this.router.post('/', this.authenticateService.authorize, complaint_controller_1.default.createComplaint.bind(complaint_controller_1.default));
        this.router.get('/', this.authenticateService.authorize, complaint_controller_1.default.getAllComplaints.bind(complaint_controller_1.default));
        this.router.get('/:id', this.authenticateService.authorize, complaint_controller_1.default.getComplaintById.bind(complaint_controller_1.default));
    }
}
exports.default = new ChatRoutes().router;
