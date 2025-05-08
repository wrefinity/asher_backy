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
const error_service_1 = __importDefault(require("../services/error.service"));
const upload_schema_1 = require("../validations/schemas/upload.schema");
const multerCloudinary_1 = require("../middlewares/multerCloudinary");
class FileUpload {
    constructor() {
        this.uploadToCloudinary = (req, res) => {
            try {
                const { error, value } = upload_schema_1.uploadSchema.validate(req.body);
                if (error) {
                    return res.status(400).json({ error: error.details[0].message });
                }
                res.status(201).json({
                    "imageUrls": value['cloudinaryUrls'],
                    "videoUrls": value['cloudinaryVideoUrls'],
                    "documentsUrls": value['cloudinaryDocumentUrls'],
                    "cloudinaryAudioUrls": value['cloudinaryAudioUrls']
                });
            }
            catch (error) {
                error_service_1.default.handleError(error, res);
            }
        };
        this.uploadSingleCloudinaryFileUrl = (req, res) => {
            var _a, _b, _c;
            try {
                const { error, value } = upload_schema_1.uploadSchema.validate(req.body);
                if (error) {
                    return res.status(400).json({ error: error.details[0].message });
                }
                // Extract only the uploaded file URL based on the available field
                const uploadedFileUrl = (_c = (_b = (_a = value['cloudinaryDocumentUrls']) !== null && _a !== void 0 ? _a : value['cloudinaryUrls']) !== null && _b !== void 0 ? _b : value['cloudinaryVideoUrls']) !== null && _c !== void 0 ? _c : value['cloudinaryAudioUrls'];
                if (!uploadedFileUrl) {
                    return res.status(400).json({ error: "No uploaded file found" });
                }
                res.status(201).json({ url: uploadedFileUrl[0] });
            }
            catch (error) {
                error_service_1.default.handleError(error, res);
            }
        };
        // Upload Documents Handler
        this.uploadAppDocumentsWithProps = (req, res) => __awaiter(this, void 0, void 0, function* () {
            try {
                // Ensure `req.files` exists and is not empty
                if (!req.files || Object.keys(req.files).length === 0) {
                    return res.status(400).json({ error: "No files provided" });
                }
                // Convert `req.files` to an array
                const files = Object.values(req.files).flat();
                // Upload files and save metadata
                const uploadedFiles = yield Promise.all(files.map((file) => __awaiter(this, void 0, void 0, function* () {
                    const uploadResult = yield (0, multerCloudinary_1.uploadDocsCloudinary)(file);
                    // Ensure `documentUrl` is always available
                    if (!uploadResult.secure_url) {
                        throw new Error("Failed to upload document");
                    }
                    // Remove file extension (e.g., ".jpg", ".pdf")
                    const documentName = file.originalname.replace(/\.[^/.]+$/, "");
                    return yield {
                        documentName, // File name
                        type: file.mimetype, // MIME type (e.g., image/jpeg, application/pdf)
                        size: String(file.size),
                        documentUrl: uploadResult.secure_url
                    };
                })));
                return res.status(201).json({ url: uploadedFiles[0] });
            }
            catch (error) {
                error_service_1.default.handleError(error, res);
            }
        });
    }
}
exports.default = new FileUpload();
