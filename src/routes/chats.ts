import { Router } from "express";
import ChatControls from '../controllers/chats';
import { Authorize } from "../middlewares/authorize";

class ChatRoutes {
    public router: Router;
    protected authenticateService: Authorize

    constructor() {
        this.router = Router();
        this.initializeRoutes = this.initializeRoutes.bind(this);
        this.authenticateService = new Authorize();
        this.initializeRoutes();
    }

    private initializeRoutes(): void {
        this.router.post('/room/message',  this.authenticateService.authorize, ChatControls.createChatRoomAndMessage.bind(ChatControls));
        this.router.get('/room/:receiverId',  this.authenticateService.authorize, ChatControls.getChatsBetweenUsers.bind(ChatControls),);
    }

   
}

export default new ChatRoutes().router;
