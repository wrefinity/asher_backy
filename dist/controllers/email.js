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
var __rest = (this && this.__rest) || function (s, e) {
    var t = {};
    for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p) && e.indexOf(p) < 0)
        t[p] = s[p];
    if (s != null && typeof Object.getOwnPropertySymbols === "function")
        for (var i = 0, p = Object.getOwnPropertySymbols(s); i < p.length; i++) {
            if (e.indexOf(p[i]) < 0 && Object.prototype.propertyIsEnumerable.call(s, p[i]))
                t[p[i]] = s[p[i]];
        }
    return t;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const emailService_1 = __importDefault(require("../services/emailService"));
const chats_schema_1 = require("../validations/schemas/chats.schema");
const tenant_service_1 = __importDefault(require("../services/tenant.service"));
const index_1 = require("../index"); // Import WebSocket-enabled server
const error_service_1 = __importDefault(require("../services/error.service"));
class EmailController {
    constructor() {
        this.createEmail = (req, res) => __awaiter(this, void 0, void 0, function* () {
            var _a, _b, _c, _d, _e, _f, _g, _h, _j;
            try {
                // Validate request body
                const { error, value } = chats_schema_1.EmailSchema.validate(req.body);
                if (error) {
                    return res.status(400).json({ message: error.details[0].message });
                }
                // Handle optional attachment
                const attachment = (_a = value.cloudinaryUrls) !== null && _a !== void 0 ? _a : null;
                // Determine sender email
                let senderEmail = (_c = (_b = req.user) === null || _b === void 0 ? void 0 : _b.email) !== null && _c !== void 0 ? _c : null;
                if ((_e = (_d = req.user) === null || _d === void 0 ? void 0 : _d.tenant) === null || _e === void 0 ? void 0 : _e.id) {
                    const tenant = yield tenant_service_1.default.getTenantById((_g = (_f = req.user) === null || _f === void 0 ? void 0 : _f.tenant) === null || _g === void 0 ? void 0 : _g.id);
                    senderEmail = (_h = tenant === null || tenant === void 0 ? void 0 : tenant.tenantWebUserEmail) !== null && _h !== void 0 ? _h : senderEmail;
                }
                // Fetch sender details
                const receiver = yield emailService_1.default.checkUserEmailExists(value.receiverEmail);
                if (!receiver) {
                    throw new Error('Receiver email not found');
                }
                // unnecessary fields from the value object (without mutating it)
                const { cloudinaryUrls, cloudinaryVideoUrls, cloudinaryDocumentUrls, cloudinaryAudioUrls } = value, emailData = __rest(value, ["cloudinaryUrls", "cloudinaryVideoUrls", "cloudinaryDocumentUrls", "cloudinaryAudioUrls"]);
                // Create email
                const email = yield emailService_1.default.createEmail(Object.assign(Object.assign({}, emailData), { senderId: (_j = req.user) === null || _j === void 0 ? void 0 : _j.id, receiverId: receiver.userId, attachment, senderEmail }));
                if (!email) {
                    return res.status(500).json({ message: "Failed to create email" });
                }
                // Notify the recipient in real-time
                index_1.serverInstance.sendToUserEmail(email.receiverEmail, "newEmail", email);
                return res.status(201).json({ email });
            }
            catch (error) {
                error_service_1.default.handleError(error, res);
            }
        });
        this.getUserInbox = (req, res) => __awaiter(this, void 0, void 0, function* () {
            var _a, _b, _c, _d;
            try {
                let email = null;
                if ((_b = (_a = req.user) === null || _a === void 0 ? void 0 : _a.tenant) === null || _b === void 0 ? void 0 : _b.id) {
                    const tenant = yield tenant_service_1.default.getTenantById((_d = (_c = req.user) === null || _c === void 0 ? void 0 : _c.tenant) === null || _d === void 0 ? void 0 : _d.id);
                    email = tenant === null || tenant === void 0 ? void 0 : tenant.tenantWebUserEmail;
                }
                else {
                    email = String(req.user.email);
                }
                const emails = yield emailService_1.default.getUserEmails(email, { recieved: true });
                if (emails.length < 1)
                    return res.status(200).json({ message: 'No emails found ' });
                return res.status(200).json({ emails });
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
            var _a, _b, _c, _d;
            try {
                let email = null;
                if ((_b = (_a = req.user) === null || _a === void 0 ? void 0 : _a.tenant) === null || _b === void 0 ? void 0 : _b.id) {
                    const tenant = yield tenant_service_1.default.getTenantById((_d = (_c = req.user) === null || _c === void 0 ? void 0 : _c.tenant) === null || _d === void 0 ? void 0 : _d.id);
                    email = tenant === null || tenant === void 0 ? void 0 : tenant.tenantWebUserEmail;
                }
                else {
                    email = String(req.user.email);
                }
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
            var _a, _b, _c, _d;
            try {
                let email = null;
                if ((_b = (_a = req.user) === null || _a === void 0 ? void 0 : _a.tenant) === null || _b === void 0 ? void 0 : _b.id) {
                    const tenant = yield tenant_service_1.default.getTenantById((_d = (_c = req.user) === null || _c === void 0 ? void 0 : _c.tenant) === null || _d === void 0 ? void 0 : _d.id);
                    email = tenant === null || tenant === void 0 ? void 0 : tenant.tenantWebUserEmail;
                }
                else {
                    email = String(req.user.email);
                }
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
            var _a, _b, _c, _d;
            try {
                const emailId = String(req.params.emailId);
                const email = yield emailService_1.default.getEmailById(emailId);
                if (!email)
                    return res.status(404).json({ message: 'Email not found' });
                let receiverEmail = null;
                if ((_b = (_a = req.user) === null || _a === void 0 ? void 0 : _a.tenant) === null || _b === void 0 ? void 0 : _b.id) {
                    const tenant = yield tenant_service_1.default.getTenantById((_d = (_c = req.user) === null || _c === void 0 ? void 0 : _c.tenant) === null || _d === void 0 ? void 0 : _d.id);
                    receiverEmail = tenant === null || tenant === void 0 ? void 0 : tenant.tenantWebUserEmail;
                }
                else {
                    receiverEmail = String(req.user.email);
                }
                const isReciever = email.receiverEmail === receiverEmail;
                if (email.senderEmail !== receiverEmail && !isReciever) {
                    return res.status(403).json({ message: 'Forbbiden' });
                }
                const updatedEmail = yield emailService_1.default.markEmailAsRead(emailId, isReciever);
                return res.status(200).json(updatedEmail);
            }
            catch (error) {
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
