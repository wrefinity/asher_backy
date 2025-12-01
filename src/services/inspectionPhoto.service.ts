import { prismaClient } from '..';
import { supabase, STORAGE_BUCKET } from '../configs/supabase';
import sharp from 'sharp';

interface UploadPhotoResult {
    url: string;
    path: string;
    photoId: string;
}

class InspectionPhotoService {
    /**
     * Upload a photo to Supabase storage and save to database
     * @param file - Multer file object
     * @param itemId - Optional inspection item ID
     * @param sectionId - Optional inspection section ID
     * @param caption - Optional caption for the photo
     * @returns Photo record with URL
     */
    async uploadPhoto(
        file: Express.Multer.File,
        itemId?: string,
        sectionId?: string,
        caption?: string
    ): Promise<UploadPhotoResult> {
        try {
            // Resize image before upload (optimize for web)
            const resizedBuffer = await sharp(file.buffer)
                .resize({ width: 1200, height: 900, fit: 'inside' })
                .jpeg({ quality: 85 })
                .toBuffer();

            // Generate unique filename
            const timestamp = Date.now();
            const sanitizedName = file.originalname.replace(/[^a-zA-Z0-9.]/g, '_');
            const objectName = `inspections/${timestamp}_${sanitizedName}`;

            // Upload to Supabase storage
            const { data, error } = await supabase.storage
                .from(STORAGE_BUCKET)
                .upload(objectName, resizedBuffer, {
                    cacheControl: '3600',
                    contentType: 'image/jpeg',
                    upsert: false,
                });

            if (error || !data?.path) {
                throw error || new Error('Failed to upload photo to Supabase storage');
            }

            // Get public URL
            const { data: urlData } = supabase.storage
                .from(STORAGE_BUCKET)
                .getPublicUrl(data.path);

            if (!urlData?.publicUrl) {
                throw new Error('Failed to get public URL for uploaded photo');
            }

            // Save photo record to database
            const photo = await prismaClient.inspectionPhoto.create({
                data: {
                    url: urlData.publicUrl,
                    caption: caption || null,
                    itemId: itemId || null,
                    sectionId: sectionId || null,
                },
            });

            return {
                url: urlData.publicUrl,
                path: data.path,
                photoId: photo.id,
            };
        } catch (error) {
            console.error('Error uploading inspection photo:', error);
            throw error;
        }
    }

    /**
     * Upload multiple photos at once
     * @param files - Array of Multer file objects
     * @param itemId - Optional inspection item ID
     * @param sectionId - Optional inspection section ID
     * @returns Array of photo records with URLs
     */
    async uploadMultiplePhotos(
        files: Express.Multer.File[],
        itemId?: string,
        sectionId?: string
    ): Promise<UploadPhotoResult[]> {
        const uploadPromises = files.map((file) =>
            this.uploadPhoto(file, itemId, sectionId, file.originalname)
        );

        return Promise.all(uploadPromises);
    }

    /**
     * Get all photos for an inspection item
     * @param itemId - Inspection item ID
     * @returns Array of photo records
     */
    async getItemPhotos(itemId: string) {
        return prismaClient.inspectionPhoto.findMany({
            where: { itemId },
            orderBy: { createdAt: 'asc' },
        });
    }

    /**
     * Get all photos for an inspection section
     * @param sectionId - Inspection section ID
     * @returns Array of photo records
     */
    async getSectionPhotos(sectionId: string) {
        return prismaClient.inspectionPhoto.findMany({
            where: { sectionId },
            orderBy: { createdAt: 'asc' },
        });
    }

    /**
     * Delete a photo from storage and database
     * @param photoId - Photo ID
     */
    async deletePhoto(photoId: string) {
        try {
            // Get photo record to get the storage path
            const photo = await prismaClient.inspectionPhoto.findUnique({
                where: { id: photoId },
            });

            if (!photo) {
                throw new Error('Photo not found');
            }

            // Extract path from URL
            // URL format: https://{project}.supabase.co/storage/v1/object/public/{bucket}/{path}
            const urlParts = photo.url.split(`${STORAGE_BUCKET}/`);
            const storagePath = urlParts[1];

            if (storagePath) {
                // Delete from Supabase storage
                const { error } = await supabase.storage
                    .from(STORAGE_BUCKET)
                    .remove([storagePath]);

                if (error) {
                    console.error('Error deleting from storage:', error);
                    // Continue to delete from database even if storage deletion fails
                }
            }

            // Delete from database
            await prismaClient.inspectionPhoto.delete({
                where: { id: photoId },
            });

            return { success: true };
        } catch (error) {
            console.error('Error deleting inspection photo:', error);
            throw error;
        }
    }

    /**
     * Update photo caption
     * @param photoId - Photo ID
     * @param caption - New caption
     */
    async updateCaption(photoId: string, caption: string) {
        return prismaClient.inspectionPhoto.update({
            where: { id: photoId },
            data: { caption },
        });
    }
}

export default new InspectionPhotoService();
