import { Router } from "express";
import { Authorize } from "../middlewares/authorize";
import EmailController from '../controllers/email';

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
        this.router.post('/', EmailController.createEmail)
        this.router.get('/:emailId', EmailController.getEmailById)
        this.router.patch('/:emailId', EmailController.updateEmail)
        this.router.delete('/:emailId', EmailController.deleteEmail)
        this.router.get('/user/:email/inbox', EmailController.getUserInbox)
        this.router.get('/user/:email/sent', EmailController.getUserSentEmails)
        this.router.get('/user/:email/drafts', EmailController.getUserDraftEmails)
        this.router.get('/user/:email/unread', EmailController.getUserUnreadEmails)
        this.router.patch('/:emailId/read', EmailController.markEmailAsRead)
        this.router.patch('/:emailId/send', EmailController.sendDraftEmail)
    }
}

export default new EmailRouter().router