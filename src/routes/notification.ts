import express from 'express';
import NotificationController from '../controllers/notification.controller';
import { Authorize } from "../middlewares/authorize";
class NotificationRoutes {
    public router: express.Router;
    authenticateService: Authorize
    

    constructor() {
        this.router = express.Router();
        this.authenticateService = new Authorize()
        this.initializeRoutes();
    }

    private initializeRoutes() {
        this.router.post('/', this.authenticateService.authorize, NotificationController.createNotification);
        this.router.get('/me', this.authenticateService.authorize, NotificationController.getAllNotifications);
        this.router.get('/:id', this.authenticateService.authorize, NotificationController.getNotificationById);
        this.router.patch('/:id', this.authenticateService.authorize, NotificationController.updateNotification);
        this.router.delete('/:id', this.authenticateService.authorize, NotificationController.deleteNotification);
    }
}

export default new NotificationRoutes().router;
