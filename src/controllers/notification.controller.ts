import { Response } from 'express';
import NotificationService from '../services/notification.service';
import { createNotificationSchema } from '../validations/schemas/notificationValidation';
import { CustomRequest } from '../utils/types';
import { notificationPreferenceSchema } from '../validations/schemas/profile';

class NotificationController {

    public createNotification = async (req: CustomRequest, res: Response) => {
        try {
            const { error } = createNotificationSchema.validate(req.body);
            if (error) {
                return res.status(400).json({ error: error.details[0].message });
            }

            const sourceId = req.user.id;
            const notification = await NotificationService.createNotification({ ...req.body, sourceId });
            res.status(201).json(notification);
        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    };

    public getAllNotifications = async (req: CustomRequest, res: Response) => {
        try {
            const userId = req.user.id;
            const notifications = await NotificationService.getAllNotifications(userId);
            res.status(200).json(notifications);
        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    };

    public getNotificationById = async (req: CustomRequest, res: Response) => {
        try {
            const { id } = req.params;
            const notification = await NotificationService.getNotificationById(id);
            if (!notification) {
                return res.status(404).json({ error: 'Notification not found' });
            }
            res.status(200).json(notification);
        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    };

    public updateNotification = async (req: CustomRequest, res: Response) => {
        try {
            const { id } = req.params;
            const notification = await NotificationService.updateNotification(id, req.body);
            if (!notification) {
                return res.status(404).json({ error: 'Notification not found' });
            }
            res.status(200).json(notification);
        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    };

    public deleteNotification = async (req: CustomRequest, res: Response) => {
        try {
            const { id } = req.params;
            const notification = await NotificationService.deleteNotification(id);
            if (!notification) {
                return res.status(404).json({ error: 'Notification not found' });
            }
            res.status(200).json({ message: 'Notification deleted successfully' });
        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    };

    public getPreferences = async (req: CustomRequest, res: Response) => {
        try {
            const userId = req.user.id;
            const preferences = await NotificationService.getUserNotificationPreferences(
                userId
            );
            res.json(preferences);
        } catch (error) {
            console.log(error)
            res.status(500).json({ error: 'Failed to fetch notification preferences' });
        }
    }

    public updatePreferences = async (req: CustomRequest, res: Response) =>{
        try {

            const userId = req.user.id;
            const { error, value } = notificationPreferenceSchema.validate(
                req.body
            );

            if (error) {
                return res.status(400).json({
                    error: 'Validation failed',
                    details: error.details.map((d) => d.message),
                });
            }

            const updatedPreferences =
                await NotificationService.updateNotificationPreferences(userId, value);
            res.json(updatedPreferences);
        } catch (error) {
            res.status(500).json({ error: 'Failed to update notification preferences' });
        }
    }

    public getCategoryPreference = async (req: CustomRequest, res: Response) =>{
        try {
            const userId = req.user.id;
            const { category } = req.params;
            const preference =
                await NotificationService.getNotificationPreferenceByCategory(
                    userId,
                    category
                );
            res.json(preference || {});
        } catch (error) {
            res.status(500).json({ error: 'Failed to fetch category preference' });
        }
    }
}

export default new NotificationController();