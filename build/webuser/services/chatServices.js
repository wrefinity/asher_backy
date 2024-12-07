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
const __1 = require("../..");
class ChatServices {
    constructor() {
        this.createChatRoom = (user1Id, user2Id) => __awaiter(this, void 0, void 0, function* () {
            return yield __1.prismaClient.chatRoom.create({
                data: {
                    user1Id,
                    user2Id,
                },
            });
        });
        this.getChatRooms = (user1Id, user2Id) => __awaiter(this, void 0, void 0, function* () {
            // check if a conversation exist between the users
            return yield __1.prismaClient.chatRoom.findFirst({
                where: {
                    OR: [
                        { user1Id: user1Id, user2Id: user2Id },
                        { user1Id: user2Id, user2Id: user1Id },
                    ],
                },
            });
        });
        this.createRoomMessages = (content, senderId, receiverId, chatRoomId) => __awaiter(this, void 0, void 0, function* () {
            return yield __1.prismaClient.message.create({
                data: {
                    content,
                    senderId,
                    receiverId,
                    chatRoomId,
                },
            });
        });
        this.getChatRoomMessages = (chatRoomId) => __awaiter(this, void 0, void 0, function* () {
            return yield __1.prismaClient.message.findMany({
                where: {
                    chatRoomId: chatRoomId,
                },
                orderBy: {
                    createdAt: 'asc',
                },
            });
        });
    }
}
exports.default = new ChatServices();