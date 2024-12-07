"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const authorize_1 = require("../middlewares/authorize");
const wallet_controller_1 = __importDefault(require("../controllers/wallet.controller"));
class WalletRouter {
    constructor() {
        this.router = (0, express_1.Router)();
        this.authenticateService = new authorize_1.Authorize();
        this.initializeRoutes();
    }
    initializeRoutes() {
        this.router.use(this.authenticateService.authorize);
        this.router.get('/:userId', wallet_controller_1.default.getUserWallet);
        this.router.post('/fund', wallet_controller_1.default.fundWallet);
    }
}
exports.default = new WalletRouter().router;
