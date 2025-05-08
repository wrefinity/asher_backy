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
const transaction_services_1 = __importDefault(require("../../services/transaction.services"));
class TransactionController {
    constructor() {
        this.getTransaction = (req, res) => __awaiter(this, void 0, void 0, function* () {
            var _a, _b;
            try {
                // Extract landlordId from the authenticated user
                const landlordId = (_b = (_a = req.user) === null || _a === void 0 ? void 0 : _a.landlords) === null || _b === void 0 ? void 0 : _b.id;
                if (!landlordId)
                    return res.status(400).json({ message: "Landlord not found" });
                const propertyId = req.params.propertyId;
                const transaction = yield transaction_services_1.default.getTransactionByProps(propertyId, landlordId);
                // }
                return res.status(201).json({ transaction });
            }
            catch (error) {
                error_service_1.default.handleError(error, res);
            }
        });
    }
}
exports.default = new TransactionController();
