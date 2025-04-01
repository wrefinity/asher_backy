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
exports.sendApplicationCompletionEmails = void 0;
const nodemailer_1 = __importDefault(require("nodemailer"));
const secrets_1 = require("../secrets");
const loggers_1 = __importDefault(require("./loggers"));
const sendMail = (to, subject, html) => __awaiter(void 0, void 0, void 0, function* () {
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
// URLs
const guarantorURL = "https://asher-website.vercel.app/guarantor";
const employerURL = "https://asher-website.vercel.app/employer";
const landlordURL = "https://asher-website.vercel.app/landlord";
// Template definitions
const applicationCompletionTemplates = {
    guarantor: (application) => {
        var _a, _b, _c, _d, _e;
        return ({
            subject: 'Application Completion Notification - Guarantor',
            html: `<p>Dear ${((_a = application.guarantorInformation) === null || _a === void 0 ? void 0 : _a.fullName) || 'Guarantor'},</p>
          <p>The leasing application request by ${(_c = (_b = application.user) === null || _b === void 0 ? void 0 : _b.profile) === null || _c === void 0 ? void 0 : _c.firstName} ${(_e = (_d = application.user) === null || _d === void 0 ? void 0 : _d.profile) === null || _e === void 0 ? void 0 : _e.lastName} 
          (Application ID: ${application.id}) has been completed and requires your attention for Attestation.</p>
          <p>Follow the link below to complete the application attestation:<br/>
          <a href="${guarantorURL}/${application.id}">${guarantorURL}/${application.id}</a></p>
          <p><em>This link will expire in 72 hours.</em></p>`
        });
    },
    employer: (application) => {
        var _a, _b, _c, _d, _e;
        return ({
            subject: 'Employment Verification Request - Employer',
            html: `<p>Dear ${((_a = application.employmentInfo) === null || _a === void 0 ? void 0 : _a.employerName) || 'Employer'},</p>
          <p>The leasing application submitted by ${(_c = (_b = application.user) === null || _b === void 0 ? void 0 : _b.profile) === null || _c === void 0 ? void 0 : _c.firstName} ${(_e = (_d = application.user) === null || _d === void 0 ? void 0 : _d.profile) === null || _e === void 0 ? void 0 : _e.lastName} 
          (Application ID: ${application.id}) requires your employment verification.</p>
          <p>Please use the link below to complete the employment verification:<br/>
          <a href="${employerURL}/${application.id}">${employerURL}/${application.id}</a></p>
          <p><em>This verification request will expire in 7 business days.</em></p>`
        });
    },
    landlord: (application) => {
        var _a, _b, _c, _d, _e;
        // Extract landlord info from residential information
        const residentialInfo = application.residentialInfo;
        const mostRecentAddress = (_a = residentialInfo === null || residentialInfo === void 0 ? void 0 : residentialInfo.prevAddresses) === null || _a === void 0 ? void 0 : _a[0];
        return {
            subject: 'Tenancy Verification Request',
            html: `<p>Dear ${(residentialInfo === null || residentialInfo === void 0 ? void 0 : residentialInfo.landlordOrAgencyName) || 'Valued Customer'},</p>
            <p>${(_c = (_b = application.user) === null || _b === void 0 ? void 0 : _b.profile) === null || _c === void 0 ? void 0 : _c.firstName} ${(_e = (_d = application.user) === null || _d === void 0 ? void 0 : _d.profile) === null || _e === void 0 ? void 0 : _e.lastName} 
            has listed your property at ${(mostRecentAddress === null || mostRecentAddress === void 0 ? void 0 : mostRecentAddress.address) || 'a previous address'}.</p>
            
            <p>Please confirm their tenancy details:</p>
            <ul>
              <li>Duration: ${(mostRecentAddress === null || mostRecentAddress === void 0 ? void 0 : mostRecentAddress.lengthOfResidence) || 'N/A'}</li>
              <li>Move-out Reason: ${(residentialInfo === null || residentialInfo === void 0 ? void 0 : residentialInfo.reasonForLeaving) || 'N/A'}</li>
            </ul>
            
            <p>Click here to verify: 
            <a href="${landlordURL}/${application.id}">Verify Tenancy</a></p>`
        };
    }
};
// Email sending function
const sendApplicationCompletionEmails = (application) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b, _c;
    try {
        const recipients = {
            guarantor: (_a = application.guarantorInformation) === null || _a === void 0 ? void 0 : _a.email,
            employer: (_b = application.employmentInfo) === null || _b === void 0 ? void 0 : _b.employerEmail,
            landlord: (_c = application.residentialInfo) === null || _c === void 0 ? void 0 : _c.landlordOrAgencyEmail
        };
        // Prepare all email templates first
        const [guarantorTemplate, employerTemplate, landlordTemplate] = yield Promise.all([
            applicationCompletionTemplates.guarantor(application),
            applicationCompletionTemplates.employer(application),
            applicationCompletionTemplates.landlord(application)
        ]);
        // Send emails in parallel
        yield Promise.all([
            recipients.guarantor && sendMail(recipients.guarantor, guarantorTemplate.subject, guarantorTemplate.html),
            recipients.employer && sendMail(recipients.employer, employerTemplate.subject, employerTemplate.html),
            recipients.landlord && sendMail(recipients.landlord, landlordTemplate.subject, landlordTemplate.html)
        ]);
    }
    catch (emailError) {
        loggers_1.default.error('Failed to send completion emails:', emailError);
        throw emailError;
    }
});
exports.sendApplicationCompletionEmails = sendApplicationCompletionEmails;
exports.default = sendMail;
