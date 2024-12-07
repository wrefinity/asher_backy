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
class SubCategoryService {
    constructor() {
        this.createSubCategory = (data) => __awaiter(this, void 0, void 0, function* () {
            return yield __1.prismaClient.subCategory.create({
                data,
            });
        });
        // Other CRUD operations
        this.getAllSubCategories = () => __awaiter(this, void 0, void 0, function* () {
            return yield __1.prismaClient.subCategory.findMany({
                where: { isDeleted: false }
            });
        });
        this.getSubCategoryById = (id) => __awaiter(this, void 0, void 0, function* () {
            return yield __1.prismaClient.subCategory.findUnique({
                where: { id },
            });
        });
        this.updateSubCategory = (id, data) => __awaiter(this, void 0, void 0, function* () {
            return yield __1.prismaClient.subCategory.update({
                where: { id },
                data,
            });
        });
        this.deleteSubCategory = (id) => __awaiter(this, void 0, void 0, function* () {
            return yield __1.prismaClient.subCategory.delete({
                where: { id },
            });
        });
    }
}
exports.default = new SubCategoryService();
