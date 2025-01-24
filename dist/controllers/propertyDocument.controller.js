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
const propertyDocument_service_1 = require("../services/propertyDocument.service");
const properties_schema_1 = require("../validations/schemas/properties.schema");
class PropertyDocumentController {
    constructor() {
        // constructor(){
        // }
        this.propertyDocumentService = new propertyDocument_service_1.PropertyDocumentService();
        this.create = (req, res) => __awaiter(this, void 0, void 0, function* () {
            var _a;
            try {
                console.log(req.body);
                const { error, value } = properties_schema_1.createPropertyDocumentSchema.validate(req.body);
                if (error) {
                    return res.status(400).json({ error: error.details[0].message });
                }
                const uploadedBy = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
                const documentUrl = value.cloudinaryDocumentUrls;
                delete value['cloudinaryUrls'];
                delete value['cloudinaryVideoUrls'];
                delete value['cloudinaryDocumentUrls'];
                const data = Object.assign(Object.assign({}, value), { uploadedBy, documentUrl });
                const propertyDocument = yield this.propertyDocumentService.create(data);
                res.status(201).json({ propertyDocument });
            }
            catch (error) {
                console.log(error);
                res.status(500).json({ message: 'Failed to create property document', error });
            }
        });
        this.findAll = (req, res) => __awaiter(this, void 0, void 0, function* () {
            try {
                console.log("========called======");
                const propertyId = req.params.propertyId;
                const propertyDocuments = yield this.propertyDocumentService.findAll(propertyId);
                res.status(200).json(propertyDocuments);
            }
            catch (error) {
                res.status(500).json({ message: 'Failed to retrieve property documents', error });
            }
        });
        this.findById = (req, res) => __awaiter(this, void 0, void 0, function* () {
            try {
                const { id } = req.params;
                const propertyDocument = yield this.propertyDocumentService.findById(id);
                if (propertyDocument) {
                    res.status(200).json({ propertyDocument });
                }
                else {
                    res.status(404).json({ message: 'Property document not found' });
                }
            }
            catch (error) {
                res.status(500).json({ message: 'Failed to retrieve property document', error });
            }
        });
    }
    update(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const { id } = req.params;
                const { error } = properties_schema_1.updatePropertyDocumentSchema.validate(req.body);
                if (error) {
                    return res.status(400).json({ error: error.details[0].message });
                }
                const data = req.body;
                const updatedPropertyDocument = yield this.propertyDocumentService.update(id, data);
                res.status(200).json({ updatedPropertyDocument });
            }
            catch (error) {
                res.status(500).json({ message: 'Failed to update property document', error });
            }
        });
    }
    delete(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const { id } = req.params;
                yield this.propertyDocumentService.delete(id);
                res.status(204).send();
            }
            catch (error) {
                res.status(500).json({ message: 'Failed to delete property document', error });
            }
        });
    }
}
exports.default = new PropertyDocumentController();
