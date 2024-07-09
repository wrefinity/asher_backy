import { Router } from "express";
import ChatControls from '../webuser/controllers/chats';
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
        this.router.post('/room/:receiverId',  this.authenticateService.authorize, ChatControls.createChatRoom.bind(ChatControls));
        this.router.post('/room/message/:chatRoomId/:receiverId',  this.authenticateService.authorize, ChatControls.createMessage.bind(ChatControls));
        this.router.get('/room/:chatRoomId',  this.authenticateService.authorize, ChatControls.getChatRoomMessage, ChatControls.getChatRoomMessage.bind(ChatControls));
    }

   
}

export default new ChatRoutes().router;
