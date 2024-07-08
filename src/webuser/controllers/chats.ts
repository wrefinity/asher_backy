import { Request, Response } from 'express';
import ChatServices from '../services/chatServices';

class ChatMessageAuth {
    createChatRoom = async (req: Request, res: Response) => {
        const { user1Id, user2Id } = req.body;
        try {
            const chatRoomExist = await ChatServices.getChatRooms(user1Id, user2Id);
            let chatRoom = null;
            if(!chatRoomExist) {
                chatRoom = await ChatServices.createChatRoom(user1Id, user2Id);
                return res.status(201).json({chatRoom});
            }
            return res.status(201).json({chatRoom:chatRoomExist});
        } catch (error) {
            console.error('Error creating chat room:', error);
            return res.status(500).json({ message: 'Internal server error' });
        }
    }
    createMessage = async (req: Request, res: Response) => {
        const { content, senderId, receiverId } = req.body;
        const {chatRoomId} = req.params;
        try {
            const message = await ChatServices.createRoomMessages(content, senderId, receiverId, chatRoomId);
            return res.status(201).json(message);
        } catch (error) {
            console.error('Error sending message:', error);
            res.status(500).json({ message: 'Internal server error' });
        }
    }

    getChatRoomMessage = async (req: Request, res: Response) => {
        const { chatRoomId } = req.query;
        try {
            const messages = await ChatServices.getChatRoomMessages(Number(chatRoomId));
            res.json(messages);
        } catch (error) {
            console.error('Error getting chat rooms:', error);
            res.status(500).json({ message: 'Internal server error' });
        }
    }
}


export default new ChatMessageAuth()