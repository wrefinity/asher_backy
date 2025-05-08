"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const status_service_1 = __importDefault(require("../services/status.service"));
const error_service_1 = __importDefault(require("../services/error.service"));
class StatusController {
    constructor() {
        this.statusService = new status_service_1.default();
        this.getAllStatuses = (req, res) => __awaiter(this, void 0, void 0, function* () {
            try {
                const statuses = yield this.statusService.getAllStatuses();
                return res.status(200).json(statuses);
            }
            catch (error) {
                error_service_1.default.handleError(error, res);
            }
        });
        this.getStatusById = (req, res) => __awaiter(this, void 0, void 0, function* () {
            try {
                const id = req.params.id;
                const status = yield this.statusService.getStatusById(id);
                if (status) {
                    res.status(200).json(status);
                }
                else {
                    res.status(404).json({ message: 'Status not found' });
                }
            }
            catch (error) {
                error_service_1.default.handleError(error, res);
            }
        });
        this.createStatus = (req, res) => __awaiter(this, void 0, void 0, function* () {
            try {
                const { name } = req.body;
                if (!name) {
                    return res.status(400).json({ message: "status name required" });
                }
                const status = yield this.statusService.createStatus(name);
                res.status(201).json(status);
            }
            catch (error) {
                error_service_1.default.handleError(error, res);
            }
        });
        this.updateStatus = (req, res) => __awaiter(this, void 0, void 0, function* () {
            try {
                const id = req.params.id;
                const { name } = req.body;
                if (!name) {
                    return res.status(400).json({ message: "status name required" });
                }
                const status = yield this.statusService.updateStatus(id, name);
                return res.status(200).json(status);
            }
            catch (error) {
                error_service_1.default.handleError(error, res);
            }
        });
        this.deleteStatus = (req, res) => __awaiter(this, void 0, void 0, function* () {
            try {
                const id = req.params.id;
                const deleted = yield this.statusService.deleteStatus(id);
                res.status(200).json({ deleted, message: "status deleted" });
            }
            catch (error) {
                error_service_1.default.handleError(error, res);
            }
        });
    }
}
exports.default = new StatusController();
