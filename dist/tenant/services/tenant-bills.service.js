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
const __1 = require("../..");
class TenantBills {
    getTenantBills(tenantId) {
        return __awaiter(this, void 0, void 0, function* () {
            return __1.prismaClient.bills.findMany({
                where: {
                    tenantId
                },
                orderBy: {
                    dueDate: 'asc'
                }
            });
        });
    }
    getUpcomingBills(tenantId_1) {
        return __awaiter(this, arguments, void 0, function* (tenantId, days = 30) {
            const today = new Date();
            const futureDate = new Date(today.getTime() + days * 24 * 60 * 60 * 1000);
            return __1.prismaClient.bills.findMany({
                where: {
                    tenantId,
                    dueDate: {
                        gte: today,
                        lte: futureDate
                    }
                },
                orderBy: {
                    dueDate: 'asc'
                }
            });
        });
    }
    getOverdueBills(tenantId) {
        return __awaiter(this, void 0, void 0, function* () {
            const today = new Date();
            return __1.prismaClient.bills.findMany({
                where: {
                    tenantId,
                    dueDate: {
                        lt: today
                    }
                },
                orderBy: {
                    dueDate: 'asc'
                }
            });
        });
    }
}
exports.default = new TenantBills();
