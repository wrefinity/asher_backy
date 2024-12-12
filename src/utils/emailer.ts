import nodemailer from 'nodemailer';
import { MAIL_HOST, MAIL_PORT, MAIL_USERNAME, FROM_EMAIL, MAIL_PASSWORD } from "../secrets"
import logger from "./loggers";

export default async (to: string, subject: string, html: string) => {
    const transporter = nodemailer.createTransport({
        service: 'gmail',
        port: Number(MAIL_PORT),
        host: MAIL_HOST,
        secure: false,
        auth: {
            user: FROM_EMAIL,
            pass: MAIL_PASSWORD
        }
    });



    const mailOptions = {
        from: FROM_EMAIL,
        to: to,
        subject: subject,
        html: html
    };

    logger.info(`Sending mail to - ${to}`);
    await transporter.sendMail(mailOptions, (error, info) => {
        if (error) {
            console.log(error);
            logger.error(error);
        } else {
            logger.info('Email sent: ' + info.response);
        }
    });
}


