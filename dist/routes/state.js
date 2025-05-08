"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const states_controller_1 = __importDefault(require("../controllers/states.controller"));
const authorize_1 = require("../middlewares/authorize");
class StateRoutes {
    constructor() {
        this.router = (0, express_1.Router)();
        this.initializeRoutes = this.initializeRoutes.bind(this);
        this.authenticateService = new authorize_1.Authorize();
        this.initializeRoutes();
    }
    initializeRoutes() {
        this.router.get('/', states_controller_1.default.getAllStates);
        this.router.get('/:id', states_controller_1.default.getStateById);
        this.router.post('/', this.authenticateService.authorize, states_controller_1.default.createState);
        this.router.patch('/:id', states_controller_1.default.updateState);
        this.router.delete('/:id', states_controller_1.default.deleteState);
    }
}
exports.default = new StateRoutes().router;
