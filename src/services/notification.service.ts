import Notification, {INotification} from '../model/notification';

class NotificationService {
    public async createNotification(data: INotification) {
        const notification = new Notification(data);
        return await notification.save();
    }

    public async getAllNotifications(destId) {
        return await Notification.find({destId});
    }

    public async getNotificationById(id: string) {
        return await Notification.findById(id);
    }

    public async updateNotification(id: string, data: any) {
        return await Notification.findByIdAndUpdate(id, data, { new: true });
    }

    public async deleteNotification(id: string) {
        return await Notification.findByIdAndDelete(id);
    }
}

export default new NotificationService();
