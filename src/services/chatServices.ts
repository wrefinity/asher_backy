import { prismaClient, serverInstance } from "..";

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
        const [userA, userB] = [user1Id, user2Id].sort();

        // check if the room already exists
        const existingRoom = await prismaClient.chatRoom.findFirst({
            where: {
                user1Id: userA,
                user2Id: userB,
            },
        });

        if (existingRoom) return existingRoom;
        return await prismaClient.chatRoom.create({
            data: {
                user1Id: userA,
                user2Id: userB,
            },
        });
    }

    // getChatRooms = async (user1Id: string, user2Id: string) => {
    //     // check if a conversation exist between the users
    //     return await prismaClient.chatRoom.findFirst({
    //         where: {
    //             OR: [
    //                 { user1Id: user1Id, user2Id: user2Id },
    //                 { user1Id: user2Id, user2Id: user1Id },
    //             ],
    //         },
    //     });
    // }

    getChatRooms = async (user1Id: string, user2Id: string) => {
        const [userA, userB] = [user1Id, user2Id].sort();
        return await prismaClient.chatRoom.findFirst({
            where: {
                user1Id: userA,
                user2Id: userB,
            },
        });
    };



    createRoomMessages = async (
        content: string,
        senderId: string,
        receiverId: string,
        chatRoomId: string,
        images: string[],
        videos: string[],
        files: string[],
        audios: string[]
    ) => {
        // Save the message in DB
        const message = await prismaClient.message.create({
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

        // Real-time emit to the receiver using Socket.IO
        const payload = {
            id: message.id,
            chatRoomId: message.chatRoomId,
            content: message.content,
            senderId: message.senderId,
            receiverId: message.receiverId,
            createdAt: message?.createdAt,
            images: message?.images,
            videos: message?.videos,
            files: message?.files,
            audios: message?.audios
        };
        // Emit message to both sender and receiver personal rooms
        serverInstance.io.to(senderId).emit("privateMessage", payload);
        serverInstance.io.to(receiverId).emit("privateMessage", payload);
        console.log(`📤 Message sent from ${senderId} to ${receiverId}`);
        return message;
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

