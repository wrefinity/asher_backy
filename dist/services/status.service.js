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
const __1 = require("..");
class StatusService {
    getAllStatuses() {
        return __awaiter(this, void 0, void 0, function* () {
            return yield __1.prismaClient.status.findMany({ where: { isDeleted: false } });
        });
    }
    getStatusById(id) {
        return __awaiter(this, void 0, void 0, function* () {
            return yield __1.prismaClient.status.findUnique({ where: { id } });
        });
    }
    createStatus(name) {
        return __awaiter(this, void 0, void 0, function* () {
            return yield __1.prismaClient.status.create({
                data: { name },
            });
        });
    }
    updateStatus(id, name) {
        return __awaiter(this, void 0, void 0, function* () {
            return yield __1.prismaClient.status.update({
                where: { id, isDeleted: false },
                data: { name },
            });
        });
    }
    deleteStatus(id) {
        return __awaiter(this, void 0, void 0, function* () {
            return yield __1.prismaClient.status.update({
                where: { id },
                data: { isDeleted: true },
            });
        });
    }
}
exports.default = StatusService;
