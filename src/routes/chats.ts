import { Router } from "express";
import ChatControls from '../webuser/controllers/chats';

class ChatRoutes {
    public router: Router;

    constructor() {
        this.router = Router();
        this.initializeRoutes();
    }

    private initializeRoutes(): void {
        this.router.post('/room', ChatControls.createChatRoom.bind(ChatControls));
        this.router.post('/room/:chatRoomId/message', ChatControls.createMessage.bind(ChatControls));
        this.router.get('/room/:chatRoomId', ChatControls.getChatRoomMessage);
    }
}

export default new ChatRoutes().router;
