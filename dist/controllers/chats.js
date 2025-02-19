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
const user_services_1 = __importDefault(require("../services/user.services"));
const error_service_1 = __importDefault(require("../services/error.service"));
const chats_schema_1 = require("../validations/schemas/chats.schema");
class ChatMessageAuth {
    constructor() {
        // Get all chat rooms for the current logged-in user
        this.getAllChatRoomsForUser = (req, res) => __awaiter(this, void 0, void 0, function* () {
            try {
                const userId = (0, helpers_1.String)(req.user.id); // The logged-in user ID
                // Step 1: Find all chat rooms where the user is either user1 or user2
                const chatRooms = yield chatServices_1.default.getChatRoomsForUser(userId);
                if (chatRooms.length === 0) {
                    return res.status(404).json({ message: 'No chat rooms found for this user.' });
                }
                // Step 2: Return the list of chat rooms
                return res.status(200).json({
                    chatRooms,
                });
            }
            catch (error) {
                error_service_1.default.handleError(error, res);
            }
        });
        this.createChatRoomAndMessage = (req, res) => __awaiter(this, void 0, void 0, function* () {
            try {
                // Get the sender's ID from the logged-in user
                const senderId = (0, helpers_1.String)(req.user.id);
                // Validate the request body
                const { error, value } = chats_schema_1.chatSchema.validate(req.body);
                if (error)
                    return res.status(400).json({ message: error.details[0].message });
                const { receiverId, content, cloudinaryUrls = [], // Images
                cloudinaryVideoUrls = [], // Videos
                cloudinaryDocumentUrls = [], // Documents
                cloudinaryAudioUrls = [] // Audios
                 } = value;
                // Check if the receiver exists
                yield user_services_1.default.findAUserById(receiverId);
                // Step 1: Retrieve or create a chat room between sender and receiver
                let chatRoom = yield chatServices_1.default.getChatRooms(senderId, receiverId);
                if (!chatRoom) {
                    chatRoom = yield chatServices_1.default.createChatRoom(senderId, receiverId);
                }
                // Step 2: Create a new message in the chat room
                const chat = yield chatServices_1.default.createRoomMessages(content, senderId, receiverId, chatRoom.id, cloudinaryUrls, cloudinaryVideoUrls, cloudinaryDocumentUrls, cloudinaryAudioUrls);
                // Step 3: Return the chat room ID and the created message
                return res.status(201).json({
                    chatRoomId: chatRoom.id,
                    message: chat,
                });
            }
            catch (error) {
                error_service_1.default.handleError(error, res);
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
                // check for user existance
                yield user_services_1.default.findAUserById(receiverId);
                // Step 1: Find the chat room between the two users
                const chatRoom = yield chatServices_1.default.getChatRooms(senderId, receiverId);
                if (!chatRoom) {
                    // return res.status(200).json({ message: 'Chat room not found' });
                    return res.status(200);
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
                error_service_1.default.handleError(error, res);
            }
        });
    }
}
exports.default = new ChatMessageAuth();
