import nodemailer from 'nodemailer';
import { MAIL_HOST, MAIL_USERNAME, FROM_EMAIL, MAIL_PASSWORD } from "../secrets"
import logger from "./loggers";

export default async (to: string, subject: string, html: string) => {
    const transporter = nodemailer.createTransport({
        // service: 'gmail',
        port:465,
        host: MAIL_HOST,
        secure: false,
        auth: {
            user: MAIL_USERNAME,
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
    transporter.sendMail(mailOptions, (error, info) => {
        if (error) {
            console.log(error);
            logger.error(error);
        } else {
            logger.info('Email sent: ' + info.response);
        }
    });
}


