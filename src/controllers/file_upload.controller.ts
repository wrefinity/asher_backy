import { CustomRequest } from "../utils/types"
import { Response } from "express"
import ErrorService from "../services/error.service";
import { uploadSchema } from "../validations/schemas/upload.schema";
import { uploadDocsCloudinary } from '../middlewares/multerCloudinary';

class FileUpload {

    uploadToCloudinary = (req: CustomRequest, res: Response) => {

        try {
            const { error, value } = uploadSchema.validate(req.body);
            if (error) {
                return res.status(400).json({ error: error.details[0].message });
            }
            res.status(201).json({
                "imageUrls": value['cloudinaryUrls'],
                "videoUrls": value['cloudinaryVideoUrls'],
                "documentsUrls": value['cloudinaryDocumentUrls'],
                "cloudinaryAudioUrls": value['cloudinaryAudioUrls']
            });
        } catch (error) {
            ErrorService.handleError(error, res);
        }
    }
    uploadSingleCloudinaryFileUrl = (req: CustomRequest, res: Response) => {
        try {
            const { error, value } = uploadSchema.validate(req.body);
            if (error) {
                return res.status(400).json({ error: error.details[0].message });
            }

            // Extract only the uploaded file URL based on the available field
            const uploadedFileUrl =
                value['cloudinaryDocumentUrls'] ??
                value['cloudinaryUrls'] ??
                value['cloudinaryVideoUrls'] ??
                value['cloudinaryAudioUrls'];

            if (!uploadedFileUrl) {
                return res.status(400).json({ error: "No uploaded file found" });
            }

            res.status(201).json({ url: uploadedFileUrl[0] });
        } catch (error) {
            ErrorService.handleError(error, res);
        }
    };
    // Upload Documents Handler
    uploadAppDocumentsWithProps = async (req: CustomRequest, res: Response) => {
        try {

            // Ensure `req.files` exists and is not empty
            if (!req.files || Object.keys(req.files).length === 0) {
                return res.status(400).json({ error: "No files provided" });
            }

            // Convert `req.files` to an array
            const files: Express.Multer.File[] = Object.values(req.files).flat();

            // Upload files and save metadata
            const uploadedFiles = await Promise.all(
                files.map(async (file) => {
                    const uploadResult: any = await uploadDocsCloudinary(file);
                    // Ensure `documentUrl` is always available
                    if (!uploadResult.secure_url) {
                        throw new Error("Failed to upload document");
                    }
                    // Remove file extension (e.g., ".jpg", ".pdf")
                    const documentName = file.originalname.replace(/\.[^/.]+$/, "");
                    return await {
                        documentName, // File name
                        type: file.mimetype, // MIME type (e.g., image/jpeg, application/pdf)
                        size: String(file.size),
                        documentUrl: uploadResult.secure_url
                    }
                })
            );

            return res.status(201).json({ url: uploadedFiles[0] });
        } catch (error) {
            ErrorService.handleError(error, res)
        }
    };


}

export default new FileUpload()