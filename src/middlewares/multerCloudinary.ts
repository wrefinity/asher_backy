import { UploadApiResponse, UploadApiErrorResponse } from 'cloudinary';
import { Response, NextFunction } from "express";
import sharp from 'sharp';
import cloudinary from "../configs/cloudinary";
import { CustomRequest, CloudinaryFile } from "../utils/types";
import { CLOUDINARY_FOLDER } from "../secrets";

export const uploadToCloudinary = async (req: CustomRequest, res: Response, next: NextFunction) => {
    try {
        const files = req.files as { [fieldname: string]: Express.Multer.File[] } || undefined;

        if (!files || Object.keys(files).length === 0) {
            req.body.cloudinaryUrls = [];
            req.body.cloudinaryVideoUrls = [];
            req.body.cloudinaryDocumentUrls = [];
            return next();
        }

        const allFiles: CloudinaryFile[] = Object.values(files).flat() as CloudinaryFile[];

        if (!allFiles || allFiles.length === 0) {
            return next(new Error('No files provided'));
        }

        // Initialize arrays for storing URLs
        const imageUrls: string[] = [];
        const videoUrls: string[] = [];
        const documentUrls: string[] = [];

        const uploadPromises = allFiles.map(async (file) => {
            let fileBuffer: Buffer = file.buffer;
            const isImage = file.mimetype.startsWith('image/');
            const isVideo = file.mimetype.startsWith('video/');
            const isDocument = file.mimetype.startsWith('application/'); // Handles PDFs, DOCs, etc.

            if (isImage) {
                // Resize the image
                fileBuffer = await sharp(file.buffer)
                    .resize({ width: 800, height: 600, fit: 'inside' })
                    .toBuffer();
            }

            return new Promise<string>((resolve, reject) => {
                const uploadStream = cloudinary.uploader.upload_stream(
                    {
                        resource_type: isImage ? 'image' : isVideo ? 'video' : isDocument ? 'raw' : 'auto',
                        folder: CLOUDINARY_FOLDER,
                        format: isImage ? 'webp' : undefined
                    } as any,
                    (err: UploadApiErrorResponse | undefined, result: UploadApiResponse | undefined) => {
                        if (err) {
                            console.error('Cloudinary upload error:', err);
                            return reject(err);
                        }
                        if (!result) {
                            console.error('Cloudinary upload error: Result is undefined');
                            return reject(new Error('Cloudinary upload result is undefined'));
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
                }
            });
        });

        await Promise.all(uploadPromises);

        // Attach URLs to the request body
        req.body.cloudinaryUrls = imageUrls;
        req.body.cloudinaryVideoUrls = videoUrls;
        req.body.cloudinaryDocumentUrls = documentUrls;

        next();
    } catch (error) {
        console.error('Error in uploadToCloudinary middleware:', error);
        next(error);
    }
};
