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
const emailService_1 = __importDefault(require("../services/emailService"));
class EmailController {
    constructor() {
    }
    createEmail(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const emailData = req.body;
                emailData.senderEmail = String(req.user.email);
                if (req.body.cloudinaryUrls) {
                    emailData.attachment = req.body.cloudinaryUrls;
                }
                else {
                    emailData.attachment = null;
                }
                if (!emailData.recieverEmail || !emailData.subject || !emailData.body) {
                    return res.status(400).json({ message: 'Missing required fields' });
                }
                const email = yield emailService_1.default.createEmail(emailData);
                return res.status(201).json(email);
            }
            catch (error) {
                console.log(error);
                return res.status(500).json({ message: 'Failed to create email' });
            }
        });
    }
    getUserInbox(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const email = String(req.user.email);
                const emails = yield emailService_1.default.getUserEmails(email, { recieved: true });
                if (emails.length < 1)
                    return res.status(200).json({ message: 'No emails found ' });
                return res.status(200).json(emails);
            }
            catch (error) {
                console.log(error);
                return res.status(500).json({ message: 'Failed to fetch email' });
            }
        });
    }
    getEmailById(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const emailId = String(req.params.emailId);
                const email = yield emailService_1.default.getEmailById(emailId);
                if (!email)
                    return res.status(404).json({ message: "Email not found" });
                return res.status(200).json(email);
            }
            catch (error) {
                return res.status(500).json({ message: "Failed to get email" });
            }
        });
    }
    updateEmail(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const emailId = String(req.params.emailId);
                //get the email
                const email = yield emailService_1.default.getEmailById(emailId);
                if (!email)
                    return res.status(404).json({ message: 'Email not found' });
                //check userId if he owns the email
                if (email.senderEmail !== String(req.user.email)) {
                    return res.status(403).json({ message: 'Forbbiden' });
                }
                const updatedEmail = yield emailService_1.default.updateEmail(emailId, req.body);
                return res.status(200).json(updatedEmail);
            }
            catch (error) {
                return res.status(500).json({ message: "Failed to update email" });
            }
        });
    }
    deleteEmail(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const emailId = String(req.params.emailId);
                //get the email
                const email = yield emailService_1.default.getEmailById(emailId);
                if (!email)
                    return res.status(404).json({ message: 'Email not found' });
                //check userId if he owns the email
                if (email.senderEmail !== String(req.user.email)) {
                    return res.status(403).json({ message: 'Forbbiden' });
                }
                //store the email in fail safe db
                yield emailService_1.default.deleteEmail(emailId);
                return res.status(200).json({ message: "Email deleted successfully" });
            }
            catch (error) {
                return res.status(500).json({ message: "Failed to delete email" });
            }
        });
    }
    getUserSentEmails(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const email = String(req.user.email);
                const emails = yield emailService_1.default.getUserEmails(email, { sent: true });
                if (emails.length < 1)
                    return res.status(200).json({ message: "No sent emails" });
                return res.status(200).json(emails);
            }
            catch (error) {
                return res.status(500).json({ message: "Failed to get sent emails" });
            }
        });
    }
    getUserDraftEmails(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const email = String(req.user.email);
                const emails = yield emailService_1.default.getUserEmails(email, { draft: true });
                if (emails.length < 1)
                    return res.status(200).json({ message: "No draft emails" });
                return res.status(200).json(emails);
            }
            catch (error) {
                return res.status(500).json({ message: "Couldnt get Draft emails" });
            }
        });
    }
    getUserUnreadEmails(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const email = String(req.user.email);
                const emails = yield emailService_1.default.getUserEmails(email, { recieved: true, unread: true });
                if (emails.length < 1)
                    return res.status(200).json({ message: "No Unread Emails" });
                return res.status(200).json(emails);
            }
            catch (error) {
                return res.status(500).json({ message: "Couldnt get unread emails" });
            }
        });
    }
    markEmailAsRead(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const emailId = String(req.params.emailId);
                const email = yield emailService_1.default.getEmailById(emailId);
                if (!email)
                    return res.status(404).json({ message: 'Email not found' });
                const isReciever = email.recieverEmail === String(req.user.email);
                if (email.senderEmail !== String(req.user.email) && !isReciever) {
                    return res.status(403).json({ message: 'Forbbiden' });
                }
                const updatedEmail = yield emailService_1.default.markEmailAsRead(emailId, isReciever);
                return res.status(200).json(updatedEmail);
            }
            catch (error) {
                console.log(error);
                return res.status(500).json({ message: "Couldnt read email" });
            }
        });
    }
    sendDraftEmail(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const emailId = String(req.params.emailId);
                const email = yield emailService_1.default.getEmailById(emailId);
                if (!email)
                    return res.status(404).json({ message: 'Email not found' });
                if (email.senderEmail !== String(req.user.email)) {
                    return res.status(403).json({ message: 'Forbbiden' });
                }
                const sentEmail = yield emailService_1.default.sendDraftEmail(emailId);
                return res.status(200).json(sentEmail);
            }
            catch (error) {
                return res.status(500).json({ message: "Couldn't send email" });
            }
        });
    }
}
exports.default = new EmailController();
