import { Response } from 'express';
import { PropertyDocumentService } from '../services/propertyDocument.service';
import { documentUploadSchema } from '../validations/schemas/properties.schema';
import { CustomRequest } from '../utils/types';
import { uploadDocsCloudinary } from '../middlewares/multerCloudinary';
import ErrorService from "../services/error.service";


class DocumentController {

    private propertyDocumentService = new PropertyDocumentService();

    create = async (req: CustomRequest, res: Response) => {
        try {
            const userId = req.user.id;
            const files: Express.Multer.File[] = Object.values(req.files).flat();

            if (!files?.length) {
                return res.status(400).json({ error: "No files provided" });
            }

            // Normalize metadata
            const documentNames = Array.isArray(req.body.documentName)
                ? req.body.documentName : [req.body.documentName];
            const docTypes = Array.isArray(req.body.docType)
                ? req.body.docType : [req.body.docType];

            // Validate metadata length
            if (documentNames.length !== files.length || docTypes.length !== files.length) {
                return res.status(400).json({
                    error: "documentName/docType length must match files count"
                });
            }

            const results = await Promise.allSettled(
                files.map(async (file, index) => {
                    try {
                        const documentData = {
                            documentName: documentNames[index],
                            type: file.mimetype,
                            size: String(file.size),
                            docType: docTypes[index]
                        };

                        // Validate with actual data
                        const { error } = documentUploadSchema.validate(documentData);
                        if (error) throw new Error(`Document ${index + 1}: ${error.message}`);

                        const uploadResult: any = await uploadDocsCloudinary(file);
                        if (!uploadResult.secure_url) throw new Error("Upload failed");

                        return await this.propertyDocumentService.create({
                            ...documentData,
                            documentUrl: [uploadResult.secure_url],
                            users: {
                                connect: {
                                    id: userId
                                }
                            }
                        });
                    } catch (err) {
                        return {
                            error: err.message,
                            file: file.originalname
                        };
                    }
                })
            );

            // Separate successes/errors
            const uploadedFiles = results
                .filter(r => r.status === 'fulfilled')
                .map(r => r.value);
            const errors = results
                .filter(r => r.status === 'rejected')
                .map(r => r.reason);

            return res.status(201).json({
                success: true,
                uploadedFiles,
                errors
            });
        } catch (error) {
            ErrorService.handleError(error, res);
        }
    };
    getter = async (req: CustomRequest, res: Response) => {
        try {
            const landlordId = req.user.landlords.id;
            const documents = await this.propertyDocumentService.getDocumentLandlordAndStatuses(landlordId);
            return res.status(201).json({
                documents
            }); 
        } catch (error) {
            ErrorService.handleError(error, res);
        }
    };
}

export default new DocumentController(); 