"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const inspection_controller_1 = __importDefault(require("../controllers/inspection.controller"));
class InspectionRoutes {
    constructor() {
        this.router = express_1.default.Router();
        this.initializeRoutes();
    }
    initializeRoutes() {
        this.router.post('/', inspection_controller_1.default.createInspection.bind(inspection_controller_1.default));
        this.router.get('/', inspection_controller_1.default.getInspections.bind(inspection_controller_1.default));
        this.router.put('/:id', inspection_controller_1.default.updateInspection.bind(inspection_controller_1.default));
        this.router.delete('/:id', inspection_controller_1.default.deleteInspection.bind(inspection_controller_1.default));
    }
    getRouter() {
        return this.router;
    }
}
exports.default = new InspectionRoutes().getRouter();
