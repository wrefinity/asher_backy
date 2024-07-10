import {UploadApiResponse,UploadApiErrorResponse} from 'cloudinary';
import { Response, NextFunction } from "express";
import sharp from 'sharp';
import cloudinary from "../configs/cloudinary";
import { CustomRequest, CloudinaryFile } from "../utils/types";
import { CLOUDINARY_FOLDER } from "../secrets";

export const uploadToCloudinary = async (req: CustomRequest, res: Response, next: NextFunction) => {
    try {
        console.log('Request received:', req);  // Debug log
        const files = req.files as { [fieldname: string]: Express.Multer.File[] };
        console.log('Files:', files);  // Debug log

        if (!files) {
            return next(new Error('No files provided'));
        }

        const allFiles: CloudinaryFile[] = Object.values(files).flat() as CloudinaryFile[];

        if (!allFiles || allFiles.length === 0) {
            return next(new Error('No files provided'));
        }

        const uploadPromises = allFiles.map(async (file) => {
            let fileBuffer: Buffer = file.buffer;
            const isImage = file.mimetype.startsWith('image/');
            if (isImage) {
                fileBuffer = await sharp(file.buffer)
                    .resize({ width: 800, height: 600, fit: 'inside' })
                    .toBuffer();  
            }

            return new Promise<string>((resolve, reject) => {
                const uploadStream = cloudinary.uploader.upload_stream(
                    {
                        resource_type: 'auto',
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
            });
        });

        const cloudinaryUrls = await Promise.all(uploadPromises);

        req.body.cloudinaryUrls = cloudinaryUrls;
        next();
    } catch (error) {
        console.error('Error in uploadToCloudinary middleware:', error);
        next(error);
    }
};


