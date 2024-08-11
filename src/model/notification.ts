import mongoose, { Document, Schema } from 'mongoose';

// Notification document Interface
export interface INotification extends Document {
    sourceId: string;
    destId: string;
    title: string;
    message: string;
    isRead: boolean;
    createdAt: Date;
}

// Define the schema for the Notification
const NotificationSchema: Schema = new Schema({
    // send id from the prsima user schema
    sourceId: {
        type:String
    },
    // receiver id from the prsima user schema
    destId: {
        type:String
    },
    title: {
        type: String,
        required: true,
    },
    message: {
        type: String,
        required: true,
    },
    isRead: {
        type: Boolean,
        default: false,
    },
    createdAt: {
        type: Date,
        default: Date.now,
    },
});

// Create the model from the schema
const Notification = mongoose.model<INotification>('Notification', NotificationSchema);

export default Notification;
