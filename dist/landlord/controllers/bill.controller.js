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
const billSchema_1 = require("../validations/schema/billSchema");
const bill_services_1 = __importDefault(require("../services/bill.services"));
class BillController {
    constructor() {
        this.createBill = (req, res) => __awaiter(this, void 0, void 0, function* () {
            var _a, _b;
            const { error, value } = billSchema_1.billSchema.validate(req.body);
            if (error)
                return res.status(400).json({ message: error.details[0].message });
            const landlordId = (_b = (_a = req.user) === null || _a === void 0 ? void 0 : _a.landlords) === null || _b === void 0 ? void 0 : _b.id;
            try {
                const bill = yield bill_services_1.default.createBill(value, landlordId);
                return res.status(201).json({ bill });
            }
            catch (error) {
                error_service_1.default.handleError(error, res);
            }
        });
        this.updateBill = (req, res) => __awaiter(this, void 0, void 0, function* () {
            const { billId } = req.params;
            const { value, error } = billSchema_1.billSchema.validate(req.body);
            if (error)
                return res.status(400).json({ message: error.details[0].message });
            const landlordId = req.user.landlords.id;
            try {
                const bill = yield bill_services_1.default.updateBill(billId, value, landlordId);
                // NOTE: When we create a new bill we want to alert tenants and show on their side too
                return res.status(201).json({ bill });
            }
            catch (error) {
                error_service_1.default.handleError(error, res);
            }
        });
        this.deleteBill = (req, res) => __awaiter(this, void 0, void 0, function* () {
            var _a, _b;
            const { billId } = req.params;
            const landlordId = (_b = (_a = req.user) === null || _a === void 0 ? void 0 : _a.landlords) === null || _b === void 0 ? void 0 : _b.id;
            try {
                const bill = yield bill_services_1.default.deleteBill(billId, landlordId);
                return res.status(201).json({ message: `Deleted Bill ${bill.billName} succesfully` });
            }
            catch (error) {
                error_service_1.default.handleError(error, res);
            }
        });
        //NOTE: These are the bills tenants under this landlord will pay
        this.getAllBills = (req, res) => __awaiter(this, void 0, void 0, function* () {
            var _a, _b;
            const landlordId = (_b = (_a = req.user) === null || _a === void 0 ? void 0 : _a.landlords) === null || _b === void 0 ? void 0 : _b.id;
            try {
                const bills = yield bill_services_1.default.getAllBills(landlordId);
                return res.status(201).json(bills);
            }
            catch (error) {
                error_service_1.default.handleError(error, res);
            }
        });
        this.getSingleBill = (req, res) => __awaiter(this, void 0, void 0, function* () {
            var _a, _b;
            const { billId } = req.params;
            const landlordId = (_b = (_a = req.user) === null || _a === void 0 ? void 0 : _a.landlords) === null || _b === void 0 ? void 0 : _b.id;
            try {
                const bill = yield bill_services_1.default.getBillById(billId, landlordId);
                return res.status(201).json(bill);
            }
            catch (error) {
                error_service_1.default.handleError(error, res);
            }
        });
        this.getBillByPropertyId = (req, res) => __awaiter(this, void 0, void 0, function* () {
            var _a, _b;
            const { propertyId } = req.params;
            const landlordId = (_b = (_a = req.user) === null || _a === void 0 ? void 0 : _a.landlords) === null || _b === void 0 ? void 0 : _b.id;
            try {
                const bill = yield bill_services_1.default.getBillByPropertyId(propertyId, landlordId);
                return res.status(201).json(bill);
            }
            catch (error) {
                error_service_1.default.handleError(error, res);
            }
        });
    }
}
exports.default = new BillController();
