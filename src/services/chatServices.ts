import { prismaClient } from "..";

interface UserSelection {
    id: boolean;
    email: boolean;
    isVerified: boolean;
    profileId: boolean;
    stripeCustomerId: boolean;
    profile: boolean;
}

class ChatServices {
    selection: UserSelection;
    constructor() {
        this.selection = Object.freeze({
            id: true,
            email: true,
            isVerified: true,
            profileId: true,
            stripeCustomerId: true,
            profile: true,
        })
    }


    createChatRoom = async (user1Id: string, user2Id: string) => {
        return await prismaClient.chatRoom.create({
            data: {
                user1Id,
                user2Id,
            },
        });
    }



    getChatRooms = async (user1Id: string, user2Id: string) => {
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


    createRoomMessages = async (
        content: string,
        senderId: string,
        receiverId: string,
        chatRoomId: string,
        images: string[],  // Image URLs
        videos: string[],  // Video URLs
        files: string[],   // Document URLs
        audios: string[]   // Audio URLs
    ) => {
        return await prismaClient.message.create({
            data: {
                content,
                senderId,
                receiverId,
                chatRoomId,
                images,
                videos,
                files,
                audios
            },
        });
    };
    

    getChatRoomMessages = async (chatRoomId: string) => {
        return await prismaClient.message.findMany({
            where: {
                chatRoomId: chatRoomId,
            },
            orderBy: {
                createdAt: 'asc',
            },
            include: {
                sender: {
                    select: this.selection,
                },
                receiver: {
                    select: this.selection,
                },
            },
        });
    };

    getChatRoomsForUser = async (userId: string) => {

        // Find chat rooms where user is either user1 or user2
        return await prismaClient.chatRoom.findMany({
            where: {
                OR: [
                    { user1Id: userId },
                    { user2Id: userId },
                ]
            },
            include: {
                user1: true,
                user2: true,
                messages: {
                    // take: 1,  
                    orderBy: { createdAt: 'desc' },
                },
            },
        });
    }

}

export default new ChatServices();

