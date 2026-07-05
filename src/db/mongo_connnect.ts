import mongoose from 'mongoose';
import { MONGODB_URI } from "../secrets"

export function getMongoStatus() {
    const disabled = !MONGODB_URI || MONGODB_URI.trim() === '';
    const readyState = mongoose.connection.readyState;
    const status =
        disabled ? 'disabled' :
        readyState === 1 ? 'connected' :
        readyState === 2 ? 'connecting' :
        readyState === 3 ? 'disconnecting' :
        'disconnected';

    return { status, readyState, disabled };
}

const connectDB = () =>{

    if (!MONGODB_URI || MONGODB_URI.trim() === '') {
        console.log('MongoDB URI not configured — skipping connection');
        return;
    }

    mongoose.connect(MONGODB_URI, {
        autoIndex: false,
    }).then(() => {
        console.log('Connected to MongoDB');
    }).catch(err => {
        console.error('MongoDB connection error:', err);
    });
}

export default connectDB;