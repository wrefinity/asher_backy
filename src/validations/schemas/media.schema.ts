import Joi from "joi";
import { DocumentType, IdType } from "@prisma/client";


export const MediaDocumentSchema = Joi.object({
    documentName: Joi.string().required(),
    docType: Joi.string()
        .valid(...Object.values(DocumentType))
        .optional(),
    idType: Joi.string()
        .valid(...Object.values(IdType))
        .optional(),
    type: Joi.string().required(),
    size: Joi.string().required(),
});
