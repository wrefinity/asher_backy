import { Response } from 'express';
import { CustomRequest } from "../../utils/types";
import ChatServices from '../services/chatServices';
import {String} from "../../utils/helpers";
class ChatMessageAuth {
    createChatRoom = async (req: CustomRequest, res: Response) => {

        try {
            const senderId = String(req.user.id); // sender is the current logged in user
            const receiverId = req.params.receiverId;
            const chatRoomExist = await ChatServices.getChatRooms(senderId, receiverId);
            let chatRoom = null;
            if(!chatRoomExist) {
                chatRoom = await ChatServices.createChatRoom(senderId, receiverId);
                return res.status(201).json({chatRoom: String(chatRoom)});
            }
            return res.status(201).json({chatRoom:String(chatRoomExist)});
        } catch (error) {
            console.error('Error creating chat room:', error);
            return res.status(500).json({ message: 'Internal server error' });
        }
    }
    
    createMessage = async (req: CustomRequest, res: Response) => {
        const { content  } = req.body;
        const {chatRoomId, receiverId} = req.params;
        try {
            const senderId = String(req.user.id); // sender is the current logged in user
        
            const chat = await ChatServices.createRoomMessages(
                content,
                senderId,
                receiverId,
                chatRoomId
            );
            return res.status(201).json({chat: String(chat)});
        } catch (error) {
            console.error('Error sending message:', error);
            res.status(500).json({ message: 'Internal server error' });
        }
    }

    getChatRoomMessage = async (req: CustomRequest, res: Response) => {
        const { chatRoomId } = req.params;
        try {
            const chat = await ChatServices.getChatRoomMessages(chatRoomId);
            res.json({chat: String(chat)});
        } catch (error) {
            console.error('Error getting chat rooms:', error);
            res.status(500).json({ message: 'Internal server error' });
        }
    }
}


export default new ChatMessageAuth()