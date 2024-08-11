import mongoose from 'mongoose';
import { MONGODB_URI } from "../secrets"


const connectDB = () =>{

    mongoose.connect(MONGODB_URI, {
        autoIndex: false,
    }).then(() => {
        console.log('Connected to MongoDB');
    }).catch(err => {
        console.error('MongoDB connection error:', err);
    });
}

export default connectDB;