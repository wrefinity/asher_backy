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
const __1 = require("..");
class SubCategoryService {
    constructor() {
        this.createSubCategory = (data) => __awaiter(this, void 0, void 0, function* () {
            const { categoryId } = data, rest = __rest(data, ["categoryId"]);
            const existingSubCategory = yield this.checkSubCategoryExist(data.name, data.type);
            if (existingSubCategory) {
                throw new Error("A subCategory with the same name and type already exists.");
            }
            // If no duplicate exists, create the new subCategory
            return yield __1.prismaClient.subCategory.create({
                data: Object.assign(Object.assign({}, rest), { category: {
                        connect: {
                            id: categoryId,
                        },
                    } }),
            });
        });
        // check for subCategory existance 
        // base on name and type
        this.checkSubCategoryExist = (name, type) => __awaiter(this, void 0, void 0, function* () {
            // Check if a subCategory with the same name and type already exists
            return yield __1.prismaClient.subCategory.findFirst({
                where: {
                    name: name,
                    type: type,
                },
            });
        });
        // Other CRUD operations
        this.getAllSubCategories = () => __awaiter(this, void 0, void 0, function* () {
            return yield __1.prismaClient.subCategory.findMany({
                where: { isDeleted: false }
            });
        });
        // get all subcategories by type
        this.getAllSubCategoriesTypes = (type, categoryId) => __awaiter(this, void 0, void 0, function* () {
            return yield __1.prismaClient.subCategory.findMany({
                where: {
                    type,
                    categoryId,
                    isDeleted: false
                }
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
            return yield __1.prismaClient.subCategory.update({
                where: { id },
                data: { isDeleted: true },
            });
        });
    }
}
exports.default = new SubCategoryService();
