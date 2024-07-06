import { Request } from 'express';

export type JWTPayload = {
    id: number;
    role: string;
}

export interface CustomRequest extends Request {
    user: JWTPayload;
}