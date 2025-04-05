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
const propertyDocument_service_1 = require("../services/propertyDocument.service");
const properties_schema_1 = require("../validations/schemas/properties.schema");
const multerCloudinary_1 = require("../middlewares/multerCloudinary");
const error_service_1 = __importDefault(require("../services/error.service"));
class DocumentController {
    constructor() {
        this.propertyDocumentService = new propertyDocument_service_1.PropertyDocumentService();
        this.create = (req, res) => __awaiter(this, void 0, void 0, function* () {
            try {
                const userId = req.user.id;
                const files = Object.values(req.files).flat();
                if (!(files === null || files === void 0 ? void 0 : files.length)) {
                    return res.status(400).json({ error: "No files provided" });
                }
                // Normalize metadata
                const documentNames = Array.isArray(req.body.documentName)
                    ? req.body.documentName : [req.body.documentName];
                const docTypes = Array.isArray(req.body.docType)
                    ? req.body.docType : [req.body.docType];
                // Validate metadata length
                if (documentNames.length !== files.length || docTypes.length !== files.length) {
                    return res.status(400).json({
                        error: "documentName/docType length must match files count"
                    });
                }
                const results = yield Promise.allSettled(files.map((file, index) => __awaiter(this, void 0, void 0, function* () {
                    try {
                        const documentData = {
                            documentName: documentNames[index],
                            type: file.mimetype,
                            size: String(file.size),
                            docType: docTypes[index]
                        };
                        // Validate with actual data
                        const { error } = properties_schema_1.documentUploadSchema.validate(documentData);
                        if (error)
                            throw new Error(`Document ${index + 1}: ${error.message}`);
                        const uploadResult = yield (0, multerCloudinary_1.uploadDocsCloudinary)(file);
                        if (!uploadResult.secure_url)
                            throw new Error("Upload failed");
                        return yield this.propertyDocumentService.create(Object.assign(Object.assign({}, documentData), { documentUrl: [uploadResult.secure_url], users: {
                                connect: {
                                    id: userId
                                }
                            } }));
                    }
                    catch (err) {
                        return {
                            error: err.message,
                            file: file.originalname
                        };
                    }
                })));
                // Separate successes/errors
                const uploadedFiles = results
                    .filter(r => r.status === 'fulfilled')
                    .map(r => r.value);
                const errors = results
                    .filter(r => r.status === 'rejected')
                    .map(r => r.reason);
                return res.status(201).json({
                    success: true,
                    uploadedFiles,
                    errors
                });
            }
            catch (error) {
                error_service_1.default.handleError(error, res);
            }
        });
        this.getter = (req, res) => __awaiter(this, void 0, void 0, function* () {
            try {
                const landlordId = req.user.landlords.id;
                const documents = yield this.propertyDocumentService.getDocumentLandlordAndStatuses(landlordId);
                return res.status(201).json({
                    documents
                });
            }
            catch (error) {
                error_service_1.default.handleError(error, res);
            }
        });
    }
}
exports.default = new DocumentController();
