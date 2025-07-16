import { Router } from "express";
import { Authorize } from "../middlewares/authorize";
import EmailController from '../controllers/email';
import upload from "../configs/multer";
import { uploadToCloudinary } from "../middlewares/multerCloudinary";

class EmailRouter {
    public router: Router
    authenticateService: Authorize

    constructor() {
        this.router = Router()
        this.authenticateService = new Authorize()
        this.initializeRoutes()
    }

    private initializeRoutes() {
        this.router.use(this.authenticateService.authorize)
        this.router.get('/', EmailController.getUserInbox)
        this.router.post('/', upload.array('files'), uploadToCloudinary, EmailController.createEmail);
        this.router.post('/reply', upload.array('files'), uploadToCloudinary, EmailController.replyToEmail);
        this.router.get('/:emailId', EmailController.getEmailById);
        this.router.post('/forward/:emailId', EmailController.forwardEmail);
        this.router.patch('/:emailId', EmailController.updateEmail);
        this.router.patch('/state/:emailId', EmailController.updateEmailState);
        this.router.delete('/:emailId', EmailController.deleteEmail);
        this.router.get('/user-mails/categorize', EmailController.getUserEmail);
        this.router.get('/user/sent', EmailController.getUserSentEmails);
        this.router.get('/user/:email/drafts', EmailController.getUserDraftEmails);
        this.router.get('/user/unread', EmailController.getUserUnreadEmails);
        this.router.patch('/read/:emailId/', EmailController.markEmailAsRead);
        this.router.patch('/:emailId/send', EmailController.sendDraftEmail);
        this.router.patch('/recover/:emailId', EmailController.recoverUserEmail);

    }
}

export default new EmailRouter().router