"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = __importDefault(require("mongoose"));
const secrets_1 = require("../secrets");
const connectDB = () => {
    mongoose_1.default.connect(secrets_1.MONGODB_URI, {
        autoIndex: false,
    }).then(() => {
        console.log('Connected to MongoDB');
    }).catch(err => {
        console.error('MongoDB connection error:', err);
    });
};
exports.default = connectDB;
