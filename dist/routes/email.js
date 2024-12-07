"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const authorize_1 = require("../middlewares/authorize");
const email_1 = __importDefault(require("../controllers/email"));
const multer_1 = __importDefault(require("../configs/multer"));
const multerCloudinary_1 = require("../middlewares/multerCloudinary");
class EmailRouter {
    constructor() {
        this.router = (0, express_1.Router)();
        this.authenticateService = new authorize_1.Authorize();
        this.initializeRoutes();
    }
    initializeRoutes() {
        this.router.use(this.authenticateService.authorize);
        this.router.post('/', multer_1.default.array('files'), multerCloudinary_1.uploadToCloudinary, email_1.default.createEmail);
        this.router.get('/:emailId', email_1.default.getEmailById);
        this.router.patch('/:emailId', email_1.default.updateEmail);
        this.router.delete('/:emailId', email_1.default.deleteEmail);
        this.router.get('/user/:email/inbox', email_1.default.getUserInbox);
        this.router.get('/user/:email/sent', email_1.default.getUserSentEmails);
        this.router.get('/user/:email/drafts', email_1.default.getUserDraftEmails);
        this.router.get('/user/:email/unread', email_1.default.getUserUnreadEmails);
        this.router.patch('/:emailId/read', email_1.default.markEmailAsRead);
        this.router.patch('/:emailId/send', email_1.default.sendDraftEmail);
    }
}
exports.default = new EmailRouter().router;
