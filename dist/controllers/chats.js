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
const helpers_1 = require("../utils/helpers");
class ChatMessageAuth {
    constructor() {
        this.createChatRoomAndMessage = (req, res) => __awaiter(this, void 0, void 0, function* () {
            try {
                // cm6021qtd00006emjscwd5w5f
                const senderId = (0, helpers_1.String)(req.user.id); // Sender is the current logged-in user
                const { receiverId, content } = req.body; // Receiver ID and message content from the request body
                // Step 1: Check if a chat room already exists between the two users
                let chatRoom = yield chatServices_1.default.getChatRooms(senderId, receiverId);
                // Step 2: If no chat room exists, create a new one
                if (!chatRoom) {
                    chatRoom = yield chatServices_1.default.createChatRoom(senderId, receiverId);
                }
                // Step 3: Create the message in the chat room
                const chat = yield chatServices_1.default.createRoomMessages(content, senderId, receiverId, chatRoom.id);
                // Step 4: Return the chat room ID and the created message
                return res.status(201).json({
                    chatRoomId: chatRoom.id,
                    message: chat,
                });
            }
            catch (error) {
                console.error('Error in createChatRoomAndMessage:', error);
                return res.status(500).json({ message: 'Internal server error' });
            }
        });
        // getChatRoomMessage = async (req: CustomRequest, res: Response) => {
        // const { chatRoomId } = req.params;
        // try {
        //     const chat = await ChatServices.getChatRoomMessages(chatRoomId);
        //     return res.json({ chat: String(chat) });
        // } catch (error) {
        //     return res.status(500).json({ message: 'Internal server error' });
        // }
        // Endpoint to get all chats between two users
        this.getChatsBetweenUsers = (req, res) => __awaiter(this, void 0, void 0, function* () {
            try {
                const senderId = (0, helpers_1.String)(req.user.id); // Current logged-in user
                const { receiverId } = req.params; // Receiver ID from the request params
                // Step 1: Find the chat room between the two users
                const chatRoom = yield chatServices_1.default.getChatRooms(senderId, receiverId);
                if (!chatRoom) {
                    return res.status(404).json({ message: 'Chat room not found' });
                }
                // Step 2: Retrieve all messages in the chat room, sorted by createdAt
                const messages = yield chatServices_1.default.getChatRoomMessages(chatRoom.id);
                // Step 3: Return the messages
                return res.status(200).json({
                    chatRoomId: chatRoom.id,
                    messages,
                });
            }
            catch (error) {
                return res.status(500).json({ message: 'Internal server error' });
            }
        });
    }
}
exports.default = new ChatMessageAuth();
