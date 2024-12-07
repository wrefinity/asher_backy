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
const tenant_bills_service_1 = __importDefault(require("../services/tenant-bills.service"));
class TenantBillController {
    constructor() {
    }
    getTenantBill(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a, _b;
            const tenantId = (_b = (_a = req.user) === null || _a === void 0 ? void 0 : _a.tenant) === null || _b === void 0 ? void 0 : _b.id;
            try {
                const tenantBills = yield tenant_bills_service_1.default.getTenantBills(tenantId);
                if (!tenantBills || tenantBills.length < 1)
                    return res.status(404).json({ message: "No bills found" });
                return res.status(200).json(tenantBills);
            }
            catch (error) {
                error_service_1.default.handleError(error, res);
            }
        });
    }
    getUpcomingBills(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a, _b;
            const tenantId = (_b = (_a = req.user) === null || _a === void 0 ? void 0 : _a.tenant) === null || _b === void 0 ? void 0 : _b.id;
            const { days } = req.body;
            try {
                const tenantBills = yield tenant_bills_service_1.default.getUpcomingBills(tenantId, days);
                if (!tenantBills || tenantBills.length < 1)
                    return res.status(404).json({ message: "No bills found" });
                return res.status(200).json(tenantBills);
            }
            catch (error) {
                error_service_1.default.handleError(error, res);
            }
        });
    }
    getOverdueBills(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a, _b;
            const tenantId = (_b = (_a = req.user) === null || _a === void 0 ? void 0 : _a.tenant) === null || _b === void 0 ? void 0 : _b.id;
            try {
                const tenantBills = yield tenant_bills_service_1.default.getOverdueBills(tenantId);
                if (!tenantBills || tenantBills.length < 1)
                    return res.status(404).json({ message: "No bills found" });
                return res.status(200).json(tenantBills);
            }
            catch (error) {
                error_service_1.default.handleError(error, res);
            }
        });
    }
}
exports.default = new TenantBillController();
