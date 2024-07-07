import { Request } from 'express';

export type JWTPayload = {
    id: number;
    role: string;
    email: string;
}

export interface CustomRequest extends Request {
    user: JWTPayload;
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
