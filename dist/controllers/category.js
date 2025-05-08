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
const category_service_1 = __importDefault(require("../services/category.service"));
const error_service_1 = __importDefault(require("../services/error.service"));
const client_1 = require("@prisma/client");
class CategoryControls {
    constructor() {
        this.createCategory = (req, res) => __awaiter(this, void 0, void 0, function* () {
            const { error } = category_1.categorySchema.validate(req.body);
            if (error)
                return res.status(400).send(error.details[0].message);
            const data = req.body;
            const image = data.cloudinaryUrls;
            delete data.cloudinaryUrls;
            delete data.cloudinaryVideoUrls;
            delete data.cloudinaryDocumentUrls;
            delete data.cloudinaryAudioUrls;
            try {
                const category = yield category_service_1.default.createCategory(Object.assign(Object.assign({}, data), { image }));
                res.status(201).json(category);
            }
            catch (err) {
                error_service_1.default.handleError(err, res);
            }
        });
        this.getAllCategories = (req, res) => __awaiter(this, void 0, void 0, function* () {
            try {
                const categories = yield category_service_1.default.getAllCategories();
                console.log(categories);
                res.status(200).json({ categories });
            }
            catch (err) {
                error_service_1.default.handleError(err, res);
            }
        });
        this.getAllCategoriesType = (req, res) => __awaiter(this, void 0, void 0, function* () {
            try {
                const type = req.query.type;
                // Check if the type is valid (i.e., matches the CategoryType enum)
                if (!type || !Object.values(client_1.CategoryType).includes(type)) {
                    return res.status(400).json({ message: "Invalid type. Please provide a valid type from the CategoryType enum (SERVICES, MAINTENANCE, BILL, etc..)." });
                }
                // Fetch the subcategories based on the type and categoryId
                const subCategories = yield category_service_1.default.getAllCategoriesTypes(type);
                res.status(200).json({ subCategories });
            }
            catch (err) {
                error_service_1.default.handleError(err, res);
            }
        });
        this.getCategoryById = (req, res) => __awaiter(this, void 0, void 0, function* () {
            try {
                const category = yield category_service_1.default.getCategoryById(req.params.id);
                if (!category)
                    return res.status(404).json({ error: 'Category not found' });
                res.status(200).json(category);
            }
            catch (err) {
                error_service_1.default.handleError(err, res);
            }
        });
        this.updateCategory = (req, res) => __awaiter(this, void 0, void 0, function* () {
            const { error } = category_1.categorySchema.validate(req.body);
            if (error)
                return res.status(400).send(error.details[0].message);
            try {
                const category = yield category_service_1.default.updateCategory(req.params.id, req.body);
                if (!category)
                    return res.status(404).json({ error: 'Category not found' });
                res.status(200).json(category);
            }
            catch (err) {
                error_service_1.default.handleError(err, res);
            }
        });
        this.deleteCategory = (req, res) => __awaiter(this, void 0, void 0, function* () {
            try {
                const category = yield category_service_1.default.deleteCategory(req.params.id);
                if (!category)
                    return res.status(404).json({ error: 'Category not found' });
                res.status(200).json({ message: 'Category deleted successfully' });
            }
            catch (err) {
                error_service_1.default.handleError(err, res);
            }
        });
    }
}
exports.default = new CategoryControls();
