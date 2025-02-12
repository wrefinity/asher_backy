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
class StateService {
    getAllState() {
        return __awaiter(this, void 0, void 0, function* () {
            return yield __1.prismaClient.state.findMany({ where: { isDeleted: false } });
        });
    }
    getStateById(id) {
        return __awaiter(this, void 0, void 0, function* () {
            return yield __1.prismaClient.state.findUnique({ where: { id } });
        });
    }
    getStateByName(name) {
        return __awaiter(this, void 0, void 0, function* () {
            // Try to find the state by name (case-insensitive)
            let state = yield __1.prismaClient.state.findFirst({
                where: {
                    name: {
                        equals: name,
                        mode: 'insensitive',
                    },
                },
            });
            // If the state doesn't exist, create it
            if (!state) {
                state = yield __1.prismaClient.state.create({
                    data: {
                        name: name,
                    },
                });
            }
            return state;
        });
    }
    createState(name) {
        return __awaiter(this, void 0, void 0, function* () {
            return yield __1.prismaClient.state.create({
                data: { name },
            });
        });
    }
    updateState(id, name) {
        return __awaiter(this, void 0, void 0, function* () {
            return yield __1.prismaClient.state.update({
                where: { id, isDeleted: false },
                data: { name },
            });
        });
    }
    deleteState(id) {
        return __awaiter(this, void 0, void 0, function* () {
            return yield __1.prismaClient.state.update({
                where: { id },
                data: { isDeleted: true },
            });
        });
    }
}
exports.default = new StateService();
