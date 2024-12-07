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
const error_service_1 = __importDefault(require("../../services/error.service"));
const broadcast_service_1 = __importDefault(require("../services/broadcast.service"));
class BroadcastController {
    constructor() {
        this.getBroadcastById = (req, res) => __awaiter(this, void 0, void 0, function* () {
            const { id } = req.params;
            const { landlords } = req.user;
            const landlordId = landlords === null || landlords === void 0 ? void 0 : landlords.id;
            try {
                const broadcast = yield broadcast_service_1.default.getBroadcastById(id, landlordId);
                if (!broadcast)
                    return res.status(404).json({ message: "Broadcast not found" });
                return res.status(201).json(broadcast);
            }
            catch (error) {
                error_service_1.default.handleError(error, res);
            }
        });
        this.getBroadcastByCategory = (req, res) => __awaiter(this, void 0, void 0, function* () {
            const { category } = req.params;
            const { landlords } = req.user;
            const landlordId = landlords === null || landlords === void 0 ? void 0 : landlords.id;
            try {
                const broadcasts = yield broadcast_service_1.default.getBroadcastByCategory(category, landlordId);
                if (!broadcasts)
                    return res.status(404).json({ message: "Broadcast not found" });
                return res.status(201).json(broadcasts);
            }
            catch (error) {
                error_service_1.default.handleError(error, res);
            }
        });
        this.getBroadcastsByLandlord = (req, res) => __awaiter(this, void 0, void 0, function* () {
            const { landlords } = req.user;
            const landlordId = landlords === null || landlords === void 0 ? void 0 : landlords.id;
            try {
                const broadcasts = yield broadcast_service_1.default.getBroadcastsByLandlord(landlordId);
                if (!broadcasts)
                    return res.status(404).json({ message: "Landlord has no Broadcast" });
                return res.status(201).json(broadcasts);
            }
            catch (error) {
                error_service_1.default.handleError(error, res);
            }
        });
        this.createBroadcast = (req, res) => __awaiter(this, void 0, void 0, function* () {
            const { landlords } = req.user;
            const landlordId = landlords === null || landlords === void 0 ? void 0 : landlords.id;
            try {
                const broadcast = yield broadcast_service_1.default.sendBroadcast(req.body, landlordId);
                return res.status(201).json(broadcast);
            }
            catch (error) {
                error_service_1.default.handleError(error, res);
            }
        });
    }
}
exports.default = new BroadcastController();
