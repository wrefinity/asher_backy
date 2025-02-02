import { Response } from 'express';
import { CustomRequest } from "../utils/types";
import ChatServices from '../services/chatServices';
import { String } from "../utils/helpers";

class ChatMessageAuth {
    createChatRoomAndMessage = async (req: CustomRequest, res: Response) => {
        try {
            // cm6021qtd00006emjscwd5w5f
            const senderId = String(req.user.id); // Sender is the current logged-in user
            const { receiverId, content } = req.body; // Receiver ID and message content from the request body

            // Step 1: Check if a chat room already exists between the two users
            let chatRoom = await ChatServices.getChatRooms(senderId, receiverId);

            // Step 2: If no chat room exists, create a new one
            if (!chatRoom) {
                chatRoom = await ChatServices.createChatRoom(senderId, receiverId);
            }

            // Step 3: Create the message in the chat room
            const chat = await ChatServices.createRoomMessages(
                content,
                senderId,
                receiverId,
                chatRoom.id
            );

            // Step 4: Return the chat room ID and the created message
            return res.status(201).json({
                chatRoomId: chatRoom.id,
                message: chat,
            });
        } catch (error) {
            console.error('Error in createChatRoomAndMessage:', error);
            return res.status(500).json({ message: 'Internal server error' });
        }
    }
  
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

            // Step 1: Find the chat room between the two users
            const chatRoom = await ChatServices.getChatRooms(senderId, receiverId);

            if (!chatRoom) {
                return res.status(404).json({ message: 'Chat room not found' });
            }

            // Step 2: Retrieve all messages in the chat room, sorted by createdAt
            const messages = await ChatServices.getChatRoomMessages( chatRoom.id,);

            // Step 3: Return the messages
            return res.status(200).json({
                chatRoomId: chatRoom.id,
                messages,
            });
        } catch (error) {
            return res.status(500).json({ message: 'Internal server error' });
        }
    };
    
}


export default new ChatMessageAuth()