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
        this.router.get(
            '/preferences/mine',
            this.authenticateService.authorize,
            NotificationController.getPreferences
        );

        this.router.post(
            '/preferences',
            this.authenticateService.authorize,
            NotificationController.updatePreferences
        );

        this.router.get(
            '/preferences/:category',
            this.authenticateService.authorize,
            NotificationController.getCategoryPreference
        );
    }
}

export default new NotificationRoutes().router;
