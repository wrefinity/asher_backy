import { chatType } from "@prisma/client";
import { prismaClient, serverInstance } from "..";
import {
    getUserPrivacyPrefs,
    sanitizeUserForViewer,
} from "../utils/publicProfilePrivacy";

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
        audios: string[],
        messageChatType: chatType | null = null
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
                audios,
                chatType: messageChatType ?? undefined,
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
            audios: message?.audios,
            chatType: message.chatType,
        };
        // Both clients join `user:${id}` rooms (and, for backward compatibility,
        // the bare-id room). Emitting to only one scheme per recipient avoids
        // delivering the same message twice to an already-connected client.
        serverInstance.io.to(`user:${senderId}`).emit("privateMessage", payload);
        serverInstance.io.to(`user:${receiverId}`).emit("privateMessage", payload);
        console.log(`📤 Message sent from ${senderId} to ${receiverId}`);

        try {
            const sender = await prismaClient.users.findUnique({
                where: { id: senderId },
                include: {
                    profile: { select: { fullname: true, firstName: true, lastName: true } },
                },
            });
            const senderName =
                sender?.profile?.fullname ||
                [sender?.profile?.firstName, sender?.profile?.lastName].filter(Boolean).join(' ') ||
                'New message';
            const preview = (content || '').trim().slice(0, 160) || 'You have a new message';

            const [NotificationService, expoPushService] = await Promise.all([
                import('./notification.service').then(({ default: service }) => service),
                import('./expoPush.service').then(({ default: service }) => service),
            ]);
            const deliveryResults = await Promise.allSettled([
                NotificationService.createNotification(
                    {
                        sourceId: senderId,
                        destId: receiverId,
                        title: 'New message',
                        message: `${senderName}: ${preview}`,
                        notificationType: 'chat_message',
                        route: `/chats/${senderId}`,
                        skipPush: true,
                    },
                    'COMMUNICATION'
                ),
                expoPushService.sendChatToUser(receiverId, {
                    title: senderName,
                    body: preview,
                    data: {
                        type: 'chat_message',
                        route: `/chats/${senderId}`,
                        senderId,
                    },
                }),
            ]);

            deliveryResults.forEach((result, index) => {
                if (result.status === 'rejected') {
                    const channel = index === 0 ? 'in-app notification' : 'push notification';
                    console.error(`Failed to send chat ${channel}:`, result.reason);
                }
            });
        } catch (notifyError) {
            console.error('Failed to send chat notification:', notifyError);
        }

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

    private async sanitizeChatParticipant<T extends { id: string }>(
        participant: T | null,
        viewerId: string
    ): Promise<T | null> {
        if (!participant) return participant;
        const prefs = await getUserPrivacyPrefs(participant.id);
        return sanitizeUserForViewer(participant, viewerId, prefs) as T;
    }

    getChatRoomsForUser = async (userId: string) => {
        const rooms = await prismaClient.chatRoom.findMany({
            where: {
                OR: [
                    { user1Id: userId },
                    { user2Id: userId },
                ],
            },
            orderBy: {
                updatedAt: 'desc', // chat list sorted by recent activity
            },
            include: {
                user1: {
                    select: {
                        id: true,
                        email: true,
                        onlineStatus: true,
                        profile: {
                            select: {
                                id: true,
                                fullname: true,
                                firstName: true,
                                lastName: true,
                                profileUrl: true,
                                phoneNumber: true,
                                city: true,
                                country: true,
                            },
                        },
                    },
                },
                user2: {
                    select: {
                        id: true,
                        email: true,
                        onlineStatus: true,
                        profile: {
                            select: {
                                id: true,
                                fullname: true,
                                firstName: true,
                                lastName: true,
                                profileUrl: true,
                                phoneNumber: true,
                                city: true,
                                country: true,
                            },
                        },
                    },
                },
                messages: {
                    take: 1, // latest message only (chat list UX)
                    orderBy: {
                        createdAt: 'desc',
                    },
                    select: {
                        id: true,
                        content: true,
                        createdAt: true,
                        senderId: true,
                        receiverId: true,
                        chatType: true,
                        images: true,
                        videos: true,
                    },
                },
            },
        });

        return Promise.all(
            rooms.map(async (room) => {
                const [user1, user2] = await Promise.all([
                    this.sanitizeChatParticipant(room.user1, userId),
                    this.sanitizeChatParticipant(room.user2, userId),
                ]);

                return {
                    ...room,
                    user1,
                    user2,
                };
            })
        );
    };


}

export default new ChatServices();
