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
const state_services_1 = __importDefault(require("../services/state.services"));
const error_service_1 = __importDefault(require("../services/error.service"));
class StateController {
    constructor() {
        this.getAllStates = (req, res) => __awaiter(this, void 0, void 0, function* () {
            try {
                const states = yield state_services_1.default.getAllState();
                return res.status(200).json(states);
            }
            catch (error) {
                error_service_1.default.handleError(error, res);
            }
        });
        this.getStateById = (req, res) => __awaiter(this, void 0, void 0, function* () {
            try {
                const id = req.params.id;
                const status = yield state_services_1.default.getStateById(id);
                if (status) {
                    res.status(200).json(status);
                }
                else {
                    res.status(404).json({ message: 'State not found' });
                }
            }
            catch (error) {
                error_service_1.default.handleError(error, res);
            }
        });
        this.createState = (req, res) => __awaiter(this, void 0, void 0, function* () {
            try {
                const { name } = req.body;
                if (!name) {
                    return res.status(400).json({ message: "status name required" });
                }
                const states = yield state_services_1.default.createState(name);
                res.status(201).json(states);
            }
            catch (error) {
                error_service_1.default.handleError(error, res);
            }
        });
        this.updateState = (req, res) => __awaiter(this, void 0, void 0, function* () {
            try {
                const id = req.params.id;
                const { name } = req.body;
                if (!name) {
                    return res.status(400).json({ message: "states name required" });
                }
                const status = yield state_services_1.default.updateState(id, name);
                return res.status(200).json(status);
            }
            catch (error) {
                error_service_1.default.handleError(error, res);
            }
        });
        this.deleteState = (req, res) => __awaiter(this, void 0, void 0, function* () {
            try {
                const id = req.params.id;
                const deleted = yield state_services_1.default.deleteState(id);
                res.status(200).json({ deleted, message: "state deleted" });
            }
            catch (error) {
                error_service_1.default.handleError(error, res);
            }
        });
    }
}
exports.default = new StateController();
