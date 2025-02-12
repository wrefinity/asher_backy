import { Response } from 'express';
import { CustomRequest } from "../utils/types";
import ChatServices from '../services/chatServices';
import { String } from "../utils/helpers";
import UserServices from '../services/user.services';
import ErrorService from '../services/error.service';
import { chatSchema } from '../validations/schemas/chats.schema';


class ChatMessageAuth {
    // Get all chat rooms for the current logged-in user
    getAllChatRoomsForUser = async (req: CustomRequest, res: Response) => {
        try {
            const userId = String(req.user.id); // The logged-in user ID

            // Step 1: Find all chat rooms where the user is either user1 or user2
            const chatRooms = await ChatServices.getChatRoomsForUser(userId);

            if (chatRooms.length === 0) {
                return res.status(404).json({ message: 'No chat rooms found for this user.' });
            }

            // Step 2: Return the list of chat rooms
            return res.status(200).json({
                chatRooms,
            });

        } catch (error) {
            ErrorService.handleError(error, res);
        }
    };
    createChatRoomAndMessage = async (req: CustomRequest, res: Response) => {
        try {
            // Get the sender's ID from the logged-in user
            const senderId = String(req.user.id);
    
            // Validate the request body
            const { error, value } = chatSchema.validate(req.body);
            if (error) return res.status(400).json({ message: error.details[0].message });
    
            const {
                receiverId,
                content,
                cloudinaryUrls = [],      // Images
                cloudinaryVideoUrls = [],  // Videos
                cloudinaryDocumentUrls = [], // Documents
                cloudinaryAudioUrls = []   // Audios
            } = value;
    
            // Check if the receiver exists
            await UserServices.findAUserById(receiverId);
    
            // Step 1: Retrieve or create a chat room between sender and receiver
            let chatRoom = await ChatServices.getChatRooms(senderId, receiverId);
            if (!chatRoom) {
                chatRoom = await ChatServices.createChatRoom(senderId, receiverId);
            }
    
            // Step 2: Create a new message in the chat room
            const chat = await ChatServices.createRoomMessages(
                content,
                senderId,
                receiverId,
                chatRoom.id,
                cloudinaryUrls, 
                cloudinaryVideoUrls, 
                cloudinaryDocumentUrls, 
                cloudinaryAudioUrls
            );
    
            // Step 3: Return the chat room ID and the created message
            return res.status(201).json({
                chatRoomId: chatRoom.id,
                message: chat,
            });
    
        } catch (error) {
            ErrorService.handleError(error, res);
        }
    };
    
    

    // getChatRoomMessage = async (req: CustomRequest, res: Response) => {
    // const { chatRoomId } = req.params;
    // try {
    //     const chat = await ChatServices.getChatRoomMessages(chatRoomId);
    //     return res.json({ chat: String(chat) });
    // } catch (error) {
    //     return res.status(500).json({ message: 'Internal server error' });
    // }

    // Endpoint to get all chats between two users
    getChatsBetweenUsers = async (req: CustomRequest, res: Response) => {
        try {
            const senderId = String(req.user.id); // Current logged-in user
            const { receiverId } = req.params; // Receiver ID from the request params

            // check for user existance
            await UserServices.findAUserById(receiverId)

            // Step 1: Find the chat room between the two users
            const chatRoom = await ChatServices.getChatRooms(senderId, receiverId);

            if (!chatRoom) {
                return res.status(404).json({ message: 'Chat room not found' });
            }

            // Step 2: Retrieve all messages in the chat room, sorted by createdAt
            const messages = await ChatServices.getChatRoomMessages(chatRoom.id,);

            // Step 3: Return the messages
            return res.status(200).json({
                chatRoomId: chatRoom.id,
                messages,
            });
        } catch (error) {
            ErrorService.handleError(error, res);
        }
    };
}


export default new ChatMessageAuth()