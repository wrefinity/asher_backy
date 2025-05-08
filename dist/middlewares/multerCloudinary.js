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
exports.handlePropertyUploads = exports.uploadToCloudinary = exports.uploadDocsCloudinary = void 0;
const sharp_1 = __importDefault(require("sharp"));
const cloudinary_1 = __importDefault(require("../configs/cloudinary"));
const client_1 = require("@prisma/client");
const secrets_1 = require("../secrets");
const media_schema_1 = require("../validations/schemas/media.schema");
// Function to upload a file to Cloudinary
const uploadDocsCloudinary = (file) => __awaiter(void 0, void 0, void 0, function* () {
    return new Promise((resolve, reject) => {
        cloudinary_1.default.uploader
            .upload_stream({ resource_type: "auto", folder: "documents" }, (error, result) => {
            if (error)
                return reject(error);
            resolve(result);
        })
            .end(file.buffer);
    });
});
exports.uploadDocsCloudinary = uploadDocsCloudinary;
const uploadToCloudinary = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const files = req.files || undefined;
        if (!files || Object.keys(files).length === 0) {
            req.body.cloudinaryUrls = [];
            req.body.cloudinaryVideoUrls = [];
            req.body.cloudinaryDocumentUrls = [];
            req.body.cloudinaryAudioUrls = [];
            return next();
        }
        const allFiles = Object.values(files).flat();
        if (!allFiles || allFiles.length === 0) {
            return next(new Error("No files provided"));
        }
        // Initialize arrays for storing URLs
        const imageUrls = [];
        const videoUrls = [];
        const documentUrls = [];
        const audioUrls = [];
        const uploadPromises = allFiles.map((file) => __awaiter(void 0, void 0, void 0, function* () {
            let fileBuffer = file.buffer;
            const isImage = file.mimetype.startsWith("image/");
            const isVideo = file.mimetype.startsWith("video/");
            const isDocument = file.mimetype.startsWith("application/"); // PDFs, DOCs, etc.
            const isAudio = file.mimetype.startsWith("audio/"); // Audio files (MP3, WAV, etc.)
            if (isImage) {
                // Resize the image before upload
                fileBuffer = yield (0, sharp_1.default)(file.buffer)
                    .resize({ width: 800, height: 600, fit: "inside" })
                    .toBuffer();
            }
            return new Promise((resolve, reject) => {
                const uploadStream = cloudinary_1.default.uploader.upload_stream({
                    resource_type: isImage ? "image" : isVideo ? "video" : isDocument ? "raw" : isAudio ? "video" : "auto",
                    folder: secrets_1.CLOUDINARY_FOLDER,
                    format: isImage ? "webp" : undefined,
                }, (err, result) => {
                    if (err) {
                        console.error("Cloudinary upload error:", err);
                        return reject(err);
                    }
                    if (!result) {
                        console.error("Cloudinary upload error: Result is undefined");
                        return reject(new Error("Cloudinary upload result is undefined"));
                    }
                    resolve(result.secure_url);
                });
                uploadStream.end(fileBuffer);
            }).then((url) => {
                if (isImage) {
                    imageUrls.push(url);
                }
                else if (isVideo) {
                    videoUrls.push(url);
                }
                else if (isDocument) {
                    documentUrls.push(url);
                }
                else if (isAudio) {
                    audioUrls.push(url);
                }
            });
        }));
        yield Promise.all(uploadPromises);
        // Attach URLs to the request body
        req.body.cloudinaryUrls = imageUrls;
        req.body.cloudinaryVideoUrls = videoUrls;
        req.body.cloudinaryDocumentUrls = documentUrls;
        req.body.cloudinaryAudioUrls = audioUrls;
        next();
    }
    catch (error) {
        console.error("Error in uploadToCloudinary middleware:", error);
        next(error);
    }
});
exports.uploadToCloudinary = uploadToCloudinary;
// Example form data usage
// formData.append("name", "My Property");
// formData.append("location", "Lagos");
// formData.append("documentName", "Passport");
// formData.append("docType", "ID");
// formData.append("idType", "PASSPORT");
// formData.append("documentName", "Tax File");
// formData.append("docType", "TAX_RETURN");
// formData.append("idType", ""); // Leave blank if not ID
// formData.append("files", file1);
// formData.append("files", file2);
const handlePropertyUploads = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    console.log("=====================");
    if (req.body.residential) {
        req.body.residential = JSON.parse(req.body.residential);
    }
    if (req.body.commercial) {
        req.body.commercial = JSON.parse(req.body.commercial);
    }
    if (req.body.shortlet) {
        req.body.shortlet = JSON.parse(req.body.shortlet);
    }
    if (req.body.typeSpecific) {
        req.body.typeSpecific = JSON.parse(req.body.typeSpecific);
    }
    console.log(req.body);
    console.log("=====================");
    try {
        const files = Object.values(req.files || {}).flat();
        if (!files.length)
            return res.status(400).json({ error: "No files provided" });
        // Normalize arrays from req.body
        const documentNames = Array.isArray(req.body.documentName)
            ? req.body.documentName
            : [req.body.documentName];
        const docTypes = Array.isArray(req.body.docType)
            ? req.body.docType
            : [req.body.docType];
        const idTypes = Array.isArray(req.body.idType)
            ? req.body.idType
            : [req.body.idType];
        const uploadedFiles = [];
        for (let i = 0; i < files.length; i++) {
            const file = files[i];
            const uploadResult = yield (0, exports.uploadDocsCloudinary)(file);
            if (!uploadResult.secure_url) {
                return res.status(500).json({ error: `Upload failed for file ${file.originalname}` });
            }
            const commonMeta = {
                documentName: documentNames[i] || file.originalname,
                docType: docTypes[i],
                idType: idTypes[i],
                type: file.mimetype,
                size: `${file.size} bytes`,
            };
            // Check type and validate
            if (file.mimetype.startsWith("image/") || file.mimetype.startsWith("video/")) {
                // MEDIA file
                uploadedFiles.push({
                    type: file.mimetype.startsWith("image/") ? client_1.MediaType.IMAGE : client_1.MediaType.VIDEO,
                    url: uploadResult.secure_url,
                    fileType: file.mimetype,
                    identifier: "MediaTable",
                    isPrimary: false,
                    caption: documentNames[i] || "",
                });
            }
            else {
                // DOCUMENT file
                const { error } = media_schema_1.MediaDocumentSchema.validate(commonMeta);
                if (error) {
                    return res.status(400).json({
                        error: `Invalid document metadata for ${file.originalname}: ${error.message}`,
                    });
                }
                uploadedFiles.push(Object.assign(Object.assign({}, commonMeta), { identifier: "DocTable", documentUrl: [uploadResult.secure_url] }));
            }
        }
        // Attach to req for controller use
        req.body.uploadedFiles = uploadedFiles;
        console.log("Uploaded files:", uploadedFiles);
        next();
    }
    catch (err) {
        console.error("Upload middleware error:", err);
        res.status(500).json({ error: "Failed to process uploads" });
    }
});
exports.handlePropertyUploads = handlePropertyUploads;
