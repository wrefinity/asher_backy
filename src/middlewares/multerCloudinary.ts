import { Response, NextFunction } from "express";
import sharp from "sharp";
import cloudinary from "../configs/cloudinary";
import { CustomRequest, CloudinaryFile } from "../utils/types";
import { CLOUDINARY_FOLDER } from "../secrets";

// Function to upload a file to Cloudinary
export const uploadDocsCloudinary = async (file: Express.Multer.File) => {
    return new Promise((resolve, reject) => {
        cloudinary.uploader
            .upload_stream(
                { resource_type: "auto", folder: "documents" },
                (error, result) => {
                    if (error) return reject(error);
                    resolve(result);
                }
            )
            .end(file.buffer);
    });
};

export const uploadToCloudinary = async (req: CustomRequest, res: Response, next: NextFunction) => {
    try {
        const files = (req.files as { [fieldname: string]: Express.Multer.File[] }) || undefined;

        if (!files || Object.keys(files).length === 0) {
            req.body.cloudinaryUrls = [];
            req.body.cloudinaryVideoUrls = [];
            req.body.cloudinaryDocumentUrls = [];
            req.body.cloudinaryAudioUrls = [];
            return next();
        }

        const allFiles: CloudinaryFile[] = Object.values(files).flat() as CloudinaryFile[];

        if (!allFiles || allFiles.length === 0) {
            return next(new Error("No files provided"));
        }

        // Initialize arrays for storing URLs
        const imageUrls: string[] = [];
        const videoUrls: string[] = [];
        const documentUrls: string[] = [];
        const audioUrls: string[] = [];

        const uploadPromises = allFiles.map(async (file) => {
            let fileBuffer: Buffer = file.buffer;
            const isImage = file.mimetype.startsWith("image/");
            const isVideo = file.mimetype.startsWith("video/");
            const isDocument = file.mimetype.startsWith("application/"); // PDFs, DOCs, etc.
            const isAudio = file.mimetype.startsWith("audio/"); // Audio files (MP3, WAV, etc.)

            if (isImage) {
                // Resize the image before upload
                fileBuffer = await sharp(file.buffer)
                    .resize({ width: 800, height: 600, fit: "inside" })
                    .toBuffer();
            }

            return new Promise<string>((resolve, reject) => {
                const uploadStream = cloudinary.uploader.upload_stream(
                    {
                        resource_type: isImage ? "image" : isVideo ? "video" : isDocument ? "raw" : isAudio ? "video" : "auto",
                        folder: CLOUDINARY_FOLDER,
                        format: isImage ? "webp" : undefined,
                    } as any,
                    (err, result) => {
                        if (err) {
                            console.error("Cloudinary upload error:", err);
                            return reject(err);
                        }
                        if (!result) {
                            console.error("Cloudinary upload error: Result is undefined");
                            return reject(new Error("Cloudinary upload result is undefined"));
                        }
                        resolve(result.secure_url);
                    }
                );
                uploadStream.end(fileBuffer);
            }).then((url) => {
                if (isImage) {
                    imageUrls.push(url);
                } else if (isVideo) {
                    videoUrls.push(url);
                } else if (isDocument) {
                    documentUrls.push(url);
                } else if (isAudio) {
                    audioUrls.push(url);
                }
            });
        });

        await Promise.all(uploadPromises);
        // Attach URLs to the request body
        req.body.cloudinaryUrls = imageUrls;
        req.body.cloudinaryVideoUrls = videoUrls;
        req.body.cloudinaryDocumentUrls = documentUrls;
        req.body.cloudinaryAudioUrls = audioUrls;

        next();
    } catch (error) {
        console.error("Error in uploadToCloudinary middleware:", error);
        next(error);
    }
};
