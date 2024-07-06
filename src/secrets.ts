import dotenv from "dotenv";
dotenv.config({ path: ".env" });

export const PORT =  process.env.PORT!;
export const JWT_SECRET =  process.env.JWT_SECRET!;
export const MAIL_HOST = process.env.MAIL_HOST!;
export const MAIL_USERNAME = process.env.MAIL_USERNAME!;
export const MAIL_PASSWORD = process.env.MAIL_PASSWORD!;
export const FROM_EMAIL = process.env.FROM_EMAIL!;
export const APP_SECRET = process.env.APP_SECRET!;