import { prismaClient } from "../..";

class ChatServices {


    createChatRoom = async (user1Id: number, user2Id: number) => { 
        return await prismaClient.chatRoom.create({
            data: {
                user1Id,
                user2Id,
            },
        });
    }

    getChatRooms = async (user1Id: number, user2Id: number) =>{
        // check if a conversation exist between the users
        return await prismaClient.chatRoom.findFirst({
            where: {
                OR: [
                    { user1Id: user1Id, user2Id: user2Id },
                    { user1Id: user2Id, user2Id: user1Id },
                ],
            },
        });
    }

    createRoomMessages = async (content: string, senderId: number, receiverId: number, chatRoomId: number) => {
        return await prismaClient.message.create({
            data: {
                content,
                senderId,
                receiverId,
                chatRoomId,
            },
        });
    }

    getChatRoomMessages = async (chatRoomId:number)=>{
        return await prismaClient.message.findMany({
            where: {
                chatRoomId: Number(chatRoomId),
            },
            orderBy: {
                createdAt: 'asc',
            },
        });
    }

}

export default new ChatServices();