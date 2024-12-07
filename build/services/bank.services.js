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
exports.BankInfoService = void 0;
const __1 = require("..");
class BankInfoService {
    constructor() {
        this.createBankInfo = (data) => __awaiter(this, void 0, void 0, function* () {
            return yield __1.prismaClient.bankInfo.create({
                data,
            });
        });
        this.getBankInfoById = (id) => __awaiter(this, void 0, void 0, function* () {
            return yield __1.prismaClient.bankInfo.findUnique({
                where: { id },
            });
        });
        this.updateBankInfo = (id, data) => __awaiter(this, void 0, void 0, function* () {
            return yield __1.prismaClient.bankInfo.update({
                where: { id },
                data,
            });
        });
        this.deleteBankInfo = (id) => __awaiter(this, void 0, void 0, function* () {
            return yield __1.prismaClient.bankInfo.delete({
                where: { id },
            });
        });
        this.getAllBankInfo = () => __awaiter(this, void 0, void 0, function* () {
            return yield __1.prismaClient.bankInfo.findMany();
        });
    }
}
exports.BankInfoService = BankInfoService;
