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
const logs_services_1 = __importDefault(require("../services/logs.services"));
const propertyServices_1 = __importDefault(require("../services/propertyServices"));
const error_service_1 = __importDefault(require("../services/error.service"));
const log_1 = require("../validations/schemas/log");
class LogController {
    constructor() {
        this.getProperyLog = (req, res) => __awaiter(this, void 0, void 0, function* () {
            try {
                const propertyId = req.params.propertyId;
                const property = yield propertyServices_1.default.getPropertyById(propertyId);
                if (!property) {
                    return res.status(404).json({ message: 'Property not found' });
                }
                const logs = yield logs_services_1.default.getLogsByProperty(propertyId);
                return res.status(200).json({ logs });
            }
            catch (error) {
                console.log(error);
                error_service_1.default.handleError(error, res);
            }
        });
        this.createLog = (req, res) => __awaiter(this, void 0, void 0, function* () {
            var _a;
            try {
                const { error, value } = log_1.logSchema.validate(req.body);
                if (error)
                    return res.status(400).json({ error: error.details[0].message });
                const createdById = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
                const log = yield logs_services_1.default.createLog(Object.assign(Object.assign({}, value), { createdById }));
                res.status(201).json({ log });
            }
            catch (error) {
                error_service_1.default.handleError(error, res);
            }
        });
    }
}
exports.default = new LogController();
