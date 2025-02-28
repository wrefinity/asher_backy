"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const error_service_1 = __importDefault(require("../services/error.service"));
const upload_schema_1 = require("../validations/schemas/upload.schema");
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
    }
}
exports.default = new FileUpload();
