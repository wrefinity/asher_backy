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
class categoryService {
    constructor() {
        this.createCategory = (data) => __awaiter(this, void 0, void 0, function* () {
            return yield __1.prismaClient.category.create({
                data,
            });
        });
        this.getAllCategories = () => __awaiter(this, void 0, void 0, function* () {
            return yield __1.prismaClient.category.findMany({
                where: { isDeleted: false },
                include: this.inclusion
            });
        });
        this.getCategoryById = (id) => __awaiter(this, void 0, void 0, function* () {
            return yield __1.prismaClient.category.findUnique({
                where: { id, isDeleted: false },
                include: this.inclusion
            });
        });
        this.updateCategory = (id, data) => __awaiter(this, void 0, void 0, function* () {
            return yield __1.prismaClient.category.update({
                where: { id, isDeleted: false },
                data,
                include: this.inclusion
            });
        });
        this.deleteCategory = (id) => __awaiter(this, void 0, void 0, function* () {
            return yield __1.prismaClient.category.update({
                where: { id },
                data: {
                    isDeleted: true
                }
            });
        });
        this.inclusion = {
            subCategory: true
        };
    }
}
exports.default = new categoryService();
