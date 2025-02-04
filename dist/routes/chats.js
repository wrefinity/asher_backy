"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const chats_1 = __importDefault(require("../controllers/chats"));
const authorize_1 = require("../middlewares/authorize");
class ChatRoutes {
    constructor() {
        this.router = (0, express_1.Router)();
        this.initializeRoutes = this.initializeRoutes.bind(this);
        this.authenticateService = new authorize_1.Authorize();
        this.initializeRoutes();
    }
    initializeRoutes() {
        this.router.post('/room/message', this.authenticateService.authorize, chats_1.default.createChatRoomAndMessage.bind(chats_1.default));
        this.router.get('/room/:receiverId', this.authenticateService.authorize, chats_1.default.getChatsBetweenUsers.bind(chats_1.default));
        this.router.get('/rooms/', this.authenticateService.authorize, chats_1.default.getAllChatRoomsForUser.bind(chats_1.default));
    }
}
exports.default = new ChatRoutes().router;
