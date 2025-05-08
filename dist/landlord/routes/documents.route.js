"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const document_controller_1 = __importDefault(require("../../controllers/document.controller"));
const multer_1 = __importDefault(require("../../configs/multer"));
class DocumentRouter {
    constructor() {
        this.router = (0, express_1.Router)();
        this.initializeRoutes();
    }
    initializeRoutes() {
        this.router.post('/', multer_1.default.array('files'), document_controller_1.default.create);
        this.router.get('/docs', document_controller_1.default.getter);
    }
}
exports.default = new DocumentRouter().router;
