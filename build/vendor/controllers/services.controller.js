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
const vendor_services_1 = __importDefault(require("../services/vendor.services"));
const category_service_1 = __importDefault(require("../../services/category.service"));
const subcategory_service_1 = __importDefault(require("../../services/subcategory.service"));
const schema_1 = require("../validations/schema");
class ServiceControls {
    constructor() {
        // Create Service
        this.createService = (req, res) => __awaiter(this, void 0, void 0, function* () {
            var _a, _b;
            try {
                const { error, value } = schema_1.serviceSchema.validate(req.body);
                if (error)
                    return res.status(400).json({ error: error.details[0].message });
                console.log(value);
                const vendorId = (_b = (_a = req.user) === null || _a === void 0 ? void 0 : _a.vendors) === null || _b === void 0 ? void 0 : _b.id;
                if (!vendorId)
                    return res.status(403).json({ message: "only vendor can create a service to be rendered" });
                const categoryExist = yield category_service_1.default.getCategoryById(value.categoryId);
                if (!categoryExist)
                    return res.status(400).json({ message: "category doesnt exist" });
                const subCategoryExist = yield subcategory_service_1.default.getSubCategoryById(value.subcategoryId);
                if (!subCategoryExist)
                    return res.status(400).json({ message: "sub category doesnt exist" });
                const service = yield vendor_services_1.default.createService(Object.assign(Object.assign({}, value), { vendorId }));
                res.status(201).json({ service });
            }
            catch (error) {
                console.log(error);
                res.status(500).json({ error: error.message });
            }
        });
        // Get Service by ID
        this.getService = (req, res) => __awaiter(this, void 0, void 0, function* () {
            try {
                const { id } = req.params;
                const service = yield vendor_services_1.default.getService(id);
                if (!service)
                    return res.status(404).json({ error: 'Service not found' });
                res.status(200).json({ service });
            }
            catch (error) {
                res.status(500).json({ error: error.message });
            }
        });
        // Update Service
        this.updateService = (req, res) => __awaiter(this, void 0, void 0, function* () {
            try {
                const { id } = req.params;
                const { error, value } = schema_1.serviceSchema.validate(req.body);
                if (error)
                    return res.status(400).json({ error: error.details[0].message });
                const updatedService = yield vendor_services_1.default.updateService(id, value);
                res.status(200).json(updatedService);
            }
            catch (error) {
                res.status(500).json({ error: error.message });
            }
        });
        // Delete Service
        this.deleteService = (req, res) => __awaiter(this, void 0, void 0, function* () {
            try {
                const { id } = req.params;
                const deletedService = yield vendor_services_1.default.deleteService(id);
                res.status(200).json(deletedService);
            }
            catch (error) {
                res.status(500).json({ error: error.message });
            }
        });
        // Get All Services
        this.getAllServices = (_req, res) => __awaiter(this, void 0, void 0, function* () {
            try {
                const services = yield vendor_services_1.default.getAllServices();
                res.status(200).json(services);
            }
            catch (error) {
                res.status(500).json({ error: error.message });
            }
        });
        // Get Services by Category and Subcategories
        this.getServicesByCategoryAndSubcategories = (req, res) => __awaiter(this, void 0, void 0, function* () {
            try {
                const { id } = req.params;
                const { error, value } = schema_1.applyOfferSchema.validate(req.body);
                if (error)
                    return res.status(400).json({ error: error.details[0].message });
                const services = yield vendor_services_1.default.getServicesByCategoryAndSubcategories(id, value.subcategoryIds);
                res.status(200).json({ services });
            }
            catch (error) {
                res.status(500).json({ error: error.message });
            }
        });
        this.applyOffer = (req, res) => __awaiter(this, void 0, void 0, function* () {
            try {
                const { categoryId } = req.params;
                const { error, value } = schema_1.applyOfferSchema.validate(req.body);
                if (error)
                    return res.status(400).json({ error: error.details[0].message });
                // const services = await serviceService.applyOffer(categoryId, value.plan, value.offer);
                const services = yield vendor_services_1.default.getServicesByCategoryAndSubcategories(categoryId, value.plan);
                res.status(200).json({ services });
            }
            catch (error) {
                res.status(500).json({ error: error.message });
            }
        });
    }
}
exports.default = new ServiceControls();
