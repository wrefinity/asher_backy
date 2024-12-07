"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const chatServices_1 = __importDefault(require("../services/chatServices"));
const helpers_1 = require("../../utils/helpers");
class ChatMessageAuth {
    constructor() {
        this.createChatRoom = (req, res) => __awaiter(this, void 0, void 0, function* () {
            try {
                const senderId = (0, helpers_1.String)(req.user.id); // sender is the current logged in user
                const receiverId = req.params.receiverId;
                const chatRoomExist = yield chatServices_1.default.getChatRooms(senderId, receiverId);
                let chatRoom = null;
                if (!chatRoomExist) {
                    chatRoom = yield chatServices_1.default.createChatRoom(senderId, receiverId);
                    return res.status(201).json({ chatRoom: (0, helpers_1.String)(chatRoom) });
                }
                return res.status(201).json({ chatRoom: (0, helpers_1.String)(chatRoomExist) });
            }
            catch (error) {
                return res.status(500).json({ message: 'Internal server error' });
            }
        });
        this.createMessage = (req, res) => __awaiter(this, void 0, void 0, function* () {
            const { content } = req.body;
            const { chatRoomId, receiverId } = req.params;
            try {
                const senderId = (0, helpers_1.String)(req.user.id); // sender is the current logged in user  
                const chat = yield chatServices_1.default.createRoomMessages(content, senderId, receiverId, chatRoomId);
                return res.status(201).json({ chat: (0, helpers_1.String)(chat) });
            }
            catch (error) {
                res.status(500).json({ message: 'Internal server error' });
            }
        });
        this.getChatRoomMessage = (req, res) => __awaiter(this, void 0, void 0, function* () {
            const { chatRoomId } = req.params;
            try {
                const chat = yield chatServices_1.default.getChatRoomMessages(chatRoomId);
                return res.json({ chat: (0, helpers_1.String)(chat) });
            }
            catch (error) {
                return res.status(500).json({ message: 'Internal server error' });
            }
        });
    }
}
exports.default = new ChatMessageAuth();
