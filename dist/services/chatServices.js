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
Object.defineProperty(exports, "__esModule", { value: true });
const __1 = require("..");
class ChatServices {
    constructor() {
        this.createChatRoom = (user1Id, user2Id) => __awaiter(this, void 0, void 0, function* () {
            const [userA, userB] = [user1Id, user2Id].sort();
            // check if the room already exists
            const existingRoom = yield __1.prismaClient.chatRoom.findFirst({
                where: {
                    user1Id: userA,
                    user2Id: userB,
                },
            });
            if (existingRoom)
                return existingRoom;
            return yield __1.prismaClient.chatRoom.create({
                data: {
                    user1Id: userA,
                    user2Id: userB,
                },
            });
        });
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
        this.getChatRooms = (user1Id, user2Id) => __awaiter(this, void 0, void 0, function* () {
            const [userA, userB] = [user1Id, user2Id].sort();
            return yield __1.prismaClient.chatRoom.findFirst({
                where: {
                    user1Id: userA,
                    user2Id: userB,
                },
            });
        });
        this.createRoomMessages = (content, senderId, receiverId, chatRoomId, images, videos, files, audios) => __awaiter(this, void 0, void 0, function* () {
            // Save the message in DB
            const message = yield __1.prismaClient.message.create({
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
                createdAt: message === null || message === void 0 ? void 0 : message.createdAt,
                images: message === null || message === void 0 ? void 0 : message.images,
                videos: message === null || message === void 0 ? void 0 : message.videos,
                files: message === null || message === void 0 ? void 0 : message.files,
                audios: message === null || message === void 0 ? void 0 : message.audios
            };
            // Emit message to both sender and receiver personal rooms
            __1.serverInstance.io.to(senderId).emit("privateMessage", payload);
            __1.serverInstance.io.to(receiverId).emit("privateMessage", payload);
            console.log(`📤 Message sent from ${senderId} to ${receiverId}`);
            return message;
        });
        this.getChatRoomMessages = (chatRoomId) => __awaiter(this, void 0, void 0, function* () {
            return yield __1.prismaClient.message.findMany({
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
        });
        this.getChatRoomsForUser = (userId) => __awaiter(this, void 0, void 0, function* () {
            // Find chat rooms where user is either user1 or user2
            return yield __1.prismaClient.chatRoom.findMany({
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
        });
        this.selection = Object.freeze({
            id: true,
            email: true,
            isVerified: true,
            profileId: true,
            stripeCustomerId: true,
            profile: true,
        });
    }
}
exports.default = new ChatServices();
