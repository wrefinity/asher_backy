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
const category_1 = require("../validations/schemas/category");
const subcategory_service_1 = __importDefault(require("../services/subcategory.service"));
const error_service_1 = __importDefault(require("../services/error.service"));
const category_service_1 = __importDefault(require("../services/category.service"));
const client_1 = require("@prisma/client");
class SubCategoryControls {
    constructor() {
        this.createSubCategory = (req, res) => __awaiter(this, void 0, void 0, function* () {
            const { error } = category_1.subCategorySchema.validate(req.body);
            if (error)
                return res.status(400).send(error.details[0].message);
            try {
                // check for categoryId existance
                const categoryId = req.params.categoryId;
                const categoryExist = yield category_service_1.default.getCategoryById(categoryId);
                if (!categoryExist)
                    return res.status(400).json({ message: "category doesnt exist" });
                const data = req.body;
                const image = data.cloudinaryUrls;
                delete data.cloudinaryUrls;
                delete data.cloudinaryVideoUrls;
                delete data.cloudinaryDocumentUrls;
                const subCategory = yield subcategory_service_1.default.createSubCategory(Object.assign(Object.assign({}, data), { categoryId, image }));
                res.status(201).json(subCategory);
            }
            catch (err) {
                error_service_1.default.handleError(err, res);
            }
        });
        // Other CRUD operations
        this.getAllSubCategories = (req, res) => __awaiter(this, void 0, void 0, function* () {
            try {
                const subCategories = yield subcategory_service_1.default.getAllSubCategories();
                res.status(200).json({ subCategories });
            }
            catch (err) {
                error_service_1.default.handleError(err, res);
            }
        });
        this.getAllSubCategoriesForCategoryIdType = (req, res) => __awaiter(this, void 0, void 0, function* () {
            try {
                // Check if categoryId exists
                const categoryId = req.params.categoryId;
                const type = req.query.type;
                // Check if category exists
                const categoryExist = yield category_service_1.default.getCategoryById(categoryId);
                if (!categoryExist) {
                    return res.status(400).json({ message: "Category doesn't exist" });
                }
                // Check if the type is valid (i.e., matches the CategoryType enum)
                if (!type || !Object.values(client_1.CategoryType).includes(type)) {
                    return res.status(400).json({ message: "Invalid type. Please provide a valid type from the CategoryType enum (SERVICES, MAINTENANCE, BILL, etc..)." });
                }
                // Fetch the subcategories based on the type and categoryId
                const subCategories = yield subcategory_service_1.default.getAllSubCategoriesTypes(type, categoryId);
                res.status(200).json({ subCategories });
            }
            catch (err) {
                error_service_1.default.handleError(err, res);
            }
        });
        this.getSubCategoryById = (req, res) => __awaiter(this, void 0, void 0, function* () {
            try {
                const subCategory = yield subcategory_service_1.default.getSubCategoryById(req.params.id);
                if (!subCategory)
                    return res.status(404).json({ error: 'SubCategory not found' });
                res.status(200).json(subCategory);
            }
            catch (err) {
                error_service_1.default.handleError(err, res);
            }
        });
        this.updateSubCategory = (req, res) => __awaiter(this, void 0, void 0, function* () {
            const { error } = category_1.subCategorySchema.validate(req.body);
            if (error)
                return res.status(400).send(error.details[0].message);
            try {
                const subCategory = yield subcategory_service_1.default.updateSubCategory(req.params.id, req.body);
                if (!subCategory)
                    return res.status(404).json({ error: 'SubCategory not found' });
                res.status(200).json(subCategory);
            }
            catch (err) {
                error_service_1.default.handleError(err, res);
            }
        });
        this.deleteSubCategory = (req, res) => __awaiter(this, void 0, void 0, function* () {
            try {
                const subCategory = yield subcategory_service_1.default.deleteSubCategory(req.params.id);
                if (!subCategory)
                    return res.status(404).json({ error: 'SubCategory not found' });
                res.status(200).json({ message: 'SubCategory deleted successfully' });
            }
            catch (err) {
                error_service_1.default.handleError(err, res);
            }
        });
    }
}
exports.default = new SubCategoryControls();
