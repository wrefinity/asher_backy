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
exports.uploadToCloudinary = void 0;
const sharp_1 = __importDefault(require("sharp"));
const cloudinary_1 = __importDefault(require("../configs/cloudinary"));
const secrets_1 = require("../secrets");
const uploadToCloudinary = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const files = req.files || undefined;
        if (!files || Object.keys(files).length === 0) {
            req.body.cloudinaryUrls = [];
            req.body.cloudinaryVideoUrls = [];
            req.body.cloudinaryDocumentUrls = [];
            return next();
        }
        const allFiles = Object.values(files).flat();
        if (!allFiles || allFiles.length === 0) {
            return next(new Error('No files provided'));
        }
        // Initialize arrays for storing URLs
        const imageUrls = [];
        const videoUrls = [];
        const documentUrls = [];
        const uploadPromises = allFiles.map((file) => __awaiter(void 0, void 0, void 0, function* () {
            let fileBuffer = file.buffer;
            const isImage = file.mimetype.startsWith('image/');
            const isVideo = file.mimetype.startsWith('video/');
            const isDocument = file.mimetype.startsWith('application/'); // Handles PDFs, DOCs, etc.
            if (isImage) {
                // Resize the image
                fileBuffer = yield (0, sharp_1.default)(file.buffer)
                    .resize({ width: 800, height: 600, fit: 'inside' })
                    .toBuffer();
            }
            return new Promise((resolve, reject) => {
                const uploadStream = cloudinary_1.default.uploader.upload_stream({
                    resource_type: isImage ? 'image' : isVideo ? 'video' : isDocument ? 'raw' : 'auto',
                    folder: secrets_1.CLOUDINARY_FOLDER,
                    format: isImage ? 'webp' : undefined
                }, (err, result) => {
                    if (err) {
                        console.error('Cloudinary upload error:', err);
                        return reject(err);
                    }
                    if (!result) {
                        console.error('Cloudinary upload error: Result is undefined');
                        return reject(new Error('Cloudinary upload result is undefined'));
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
            });
        }));
        yield Promise.all(uploadPromises);
        // Attach URLs to the request body
        req.body.cloudinaryUrls = imageUrls;
        req.body.cloudinaryVideoUrls = videoUrls;
        req.body.cloudinaryDocumentUrls = documentUrls;
        next();
    }
    catch (error) {
        console.error('Error in uploadToCloudinary middleware:', error);
        next(error);
    }
});
exports.uploadToCloudinary = uploadToCloudinary;
