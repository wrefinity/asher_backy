"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const nodemailer_1 = __importDefault(require("nodemailer"));
const secrets_1 = require("../secrets");
const loggers_1 = __importDefault(require("./loggers"));
exports.default = (to, subject, html) => __awaiter(void 0, void 0, void 0, function* () {
    const transporter = nodemailer_1.default.createTransport({
        service: 'gmail',
        port: Number(secrets_1.MAIL_PORT),
        host: secrets_1.MAIL_HOST,
        secure: false,
        auth: {
            user: secrets_1.FROM_EMAIL,
            pass: secrets_1.MAIL_PASSWORD
        }
    });
    const mailOptions = {
        from: secrets_1.FROM_EMAIL,
        to: to,
        subject: subject,
        html: html
    };
    loggers_1.default.info(`Sending mail to - ${to}`);
    yield transporter.sendMail(mailOptions, (error, info) => {
        if (error) {
            console.log(error);
            loggers_1.default.error(error);
        }
        else {
            loggers_1.default.info('Email sent: ' + info.response);
        }
    });
});
