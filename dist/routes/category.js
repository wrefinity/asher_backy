"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const category_1 = __importDefault(require("../controllers/category"));
const subcategory_1 = __importDefault(require("../controllers/subcategory"));
const authorize_1 = require("../middlewares/authorize");
const multerCloudinary_1 = require("../middlewares/multerCloudinary");
const multer_1 = __importDefault(require("../configs/multer"));
class CategoryRoutes {
    constructor() {
        this.router = (0, express_1.Router)();
        this.initializeRoutes = this.initializeRoutes.bind(this);
        this.authenticateService = new authorize_1.Authorize();
        this.initializeRoutes();
    }
    initializeRoutes() {
        //sub-categories
        this.router.get('/sub', subcategory_1.default.getAllSubCategories);
        this.router.post('/sub/:categoryId', this.authenticateService.authorize, multer_1.default.array('files'), multerCloudinary_1.uploadToCloudinary, subcategory_1.default.createSubCategory);
        this.router.get('/sub/:id', subcategory_1.default.getSubCategoryById);
        this.router.patch('/sub/:id', subcategory_1.default.updateSubCategory);
        this.router.delete('/sub/:id', this.authenticateService.authorize, subcategory_1.default.deleteSubCategory);
        //categories
        this.router.post('/', this.authenticateService.authorize, multer_1.default.array('files'), multerCloudinary_1.uploadToCloudinary, category_1.default.createCategory);
        this.router.get('/', category_1.default.getAllCategories);
        this.router.get('/:id', category_1.default.getCategoryById);
        this.router.patch('/:id', category_1.default.updateCategory);
        this.router.delete('/:id', this.authenticateService.authorize, category_1.default.deleteCategory);
    }
}
exports.default = new CategoryRoutes().router;
