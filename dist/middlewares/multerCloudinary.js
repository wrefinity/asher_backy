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
// {
//     "offer": ["100"],
//     "amount": 150,
//     "description":"pipe breaks",
//     "categoryId":"cm57schfs0000refzg0j13jpx",
//     "subcategoryIds":["cm57swrez0002refzkdqv44x6"],
//     "propertyId":"cm5s34u45000d5sxxeitn5rr2",
//     "scheduleDate": "2025-01-15T14:00:00Z",
//     "serviceId": "cm640cvp80001ko7zvhffhnq8"
// }
