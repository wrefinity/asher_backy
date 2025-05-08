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
var __rest = (this && this.__rest) || function (s, e) {
    var t = {};
    for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p) && e.indexOf(p) < 0)
        t[p] = s[p];
    if (s != null && typeof Object.getOwnPropertySymbols === "function")
        for (var i = 0, p = Object.getOwnPropertySymbols(s); i < p.length; i++) {
            if (e.indexOf(p[i]) < 0 && Object.prototype.propertyIsEnumerable.call(s, p[i]))
                t[p[i]] = s[p[i]];
        }
    return t;
};
Object.defineProperty(exports, "__esModule", { value: true });
const __1 = require("../..");
const helpers_1 = require("../../utils/helpers");
class BillService {
    constructor() {
        this.createBill = (billData, landlordId) => __awaiter(this, void 0, void 0, function* () {
            const billId = (0, helpers_1.generateIDs)('BILL');
            const { propertyId } = billData, rest = __rest(billData, ["propertyId"]);
            return yield __1.prismaClient.bills.create({
                data: Object.assign(Object.assign({ billId, description: `Created ${billData.billName}` }, rest), { 
                    // propertyId,
                    property: {
                        connect: { id: propertyId }
                    }, landlord: {
                        connect: { id: landlordId }
                    } }),
            });
        });
        this.getTenantBills = (tenantId) => __awaiter(this, void 0, void 0, function* () {
            const tenantBills = yield __1.prismaClient.bills.findMany({
                where: {
                    tenantId: tenantId,
                },
                include: {
                    tenant: true,
                    property: true,
                    transactions: true,
                },
            });
            return tenantBills;
        });
        this.getAllBills = (landlordId) => __awaiter(this, void 0, void 0, function* () {
            return yield __1.prismaClient.bills.findMany({
                where: {
                    landlordId
                },
            });
        });
        this.getBillById = (billId, landlordId) => __awaiter(this, void 0, void 0, function* () {
            return yield __1.prismaClient.bills.findUnique({
                where: { id: billId, landlordId },
            });
        });
        this.updateBill = (billId, billData, landlordId) => __awaiter(this, void 0, void 0, function* () {
            return yield __1.prismaClient.bills.update({
                where: { id: billId, landlordId },
                data: billData,
            });
        });
        this.deleteBill = (billId, landlordId) => __awaiter(this, void 0, void 0, function* () {
            return yield __1.prismaClient.bills.delete({
                where: { id: billId, landlordId },
            });
        });
        this.getBillByPropertyId = (propertyId, landlordId) => __awaiter(this, void 0, void 0, function* () {
            return yield __1.prismaClient.bills.findMany({
                where: {
                    propertyId,
                    landlordId
                },
                include: {
                    property: true
                }
            });
        });
    }
}
exports.default = new BillService();
