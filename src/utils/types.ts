import { Request } from 'express';

export type JWTPayload = {
    id: number;
    role: string;
    email: string;
}

export interface CustomRequest extends Request {
    user: JWTPayload;
    files: {
        [fieldname: string]: Express.Multer.File[];
    };
}

export type EmailDataType = {
    senderEmail: string;
    recieverEmail: string;
    subject: string;
    body: string;
    attachment?: string;
    isDraft?: boolean;
    isSent?: boolean;
    isRead?:boolean;
}
export interface CloudinaryFile extends Express.Multer.File {
    buffer: Buffer;
}