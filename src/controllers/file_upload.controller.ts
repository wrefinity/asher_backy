import { CustomRequest } from "../utils/types"
import { Response } from "express"
import ErrorService from "../services/error.service";
import { uploadSchema } from "../validations/schemas/upload.schema";


class FileUpload{

    uploadToCloudinary = (req: CustomRequest, res: Response) =>{

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

}

export default new FileUpload()