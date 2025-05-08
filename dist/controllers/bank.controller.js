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
Object.defineProperty(exports, "__esModule", { value: true });
const bank_services_1 = require("../services/bank.services");
const banks_schema_1 = require("../validations/schemas/banks.schema");
const bankInfoService = new bank_services_1.BankInfoService();
class BankInfoController {
    constructor() {
        this.createBankInfo = (req, res) => __awaiter(this, void 0, void 0, function* () {
            var _a, _b, _c, _d;
            const { error, value } = banks_schema_1.bankInfoSchema.validate(req.body);
            if (error)
                return res.status(400).json({ error: error.details[0].message });
            try {
                // Check if landlordId or vendorId is available from the user
                const landlordId = ((_b = (_a = req.user) === null || _a === void 0 ? void 0 : _a.landlords) === null || _b === void 0 ? void 0 : _b.id) || null;
                const vendorId = ((_d = (_c = req.user) === null || _c === void 0 ? void 0 : _c.vendors) === null || _d === void 0 ? void 0 : _d.id) || null;
                // Prevent creation if both landlordId and vendorId are null
                if (!landlordId && !vendorId) {
                    return res.status(400).json({ error: 'kindly login aas landlord or vendor to add bank informations' });
                }
                const data = Object.assign(Object.assign({}, value), { landlordId: landlordId ? landlordId : undefined, vendorId: vendorId ? vendorId : undefined });
                const bankInfo = yield bankInfoService.createBankInfo(data);
                return res.status(201).json({ bankInfo });
            }
            catch (err) {
                return res.status(500).json({ error: 'Failed to create bank info' });
            }
        });
        this.getBankInfo = (req, res) => __awaiter(this, void 0, void 0, function* () {
            try {
                const bankInfo = yield bankInfoService.getBankInfoById(req.params.id);
                if (!bankInfo)
                    return res.status(404).json({ error: 'Bank info not found' });
                return res.status(200).json(bankInfo);
            }
            catch (err) {
                return res.status(500).json({ error: 'Failed to retrieve bank info' });
            }
        });
        this.updateBankInfo = (req, res) => __awaiter(this, void 0, void 0, function* () {
            const { error } = banks_schema_1.bankInfoSchema.validate(req.body);
            if (error)
                return res.status(400).json({ error: error.details[0].message });
            try {
                const updatedBankInfo = yield bankInfoService.updateBankInfo(req.params.id, req.body);
                return res.status(200).json(updatedBankInfo);
            }
            catch (err) {
                return res.status(500).json({ error: 'Failed to update bank info' });
            }
        });
        this.deleteBankInfo = (req, res) => __awaiter(this, void 0, void 0, function* () {
            try {
                yield bankInfoService.deleteBankInfo(req.params.id);
                return res.status(204).send();
            }
            catch (err) {
                return res.status(500).json({ error: 'Failed to delete bank info' });
            }
        });
        this.getAllBankInfo = (req, res) => __awaiter(this, void 0, void 0, function* () {
            try {
                const bankInfoList = yield bankInfoService.getAllBankInfo();
                return res.status(200).json(bankInfoList);
            }
            catch (err) {
                return res.status(500).json({ error: 'Failed to retrieve bank info' });
            }
        });
    }
}
exports.default = new BankInfoController();
