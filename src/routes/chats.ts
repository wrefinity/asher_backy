import { Router } from "express";
import ChatControls from '../controllers/chats';
import { Authorize } from "../middlewares/authorize";
import { uploadToCloudinary } from '../middlewares/multerCloudinary';
import upload from "../configs/multer";

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
        this.router.post('/room/message',   upload.array('files'), uploadToCloudinary,  this.authenticateService.authorize, ChatControls.createChatRoomAndMessage.bind(ChatControls));
        this.router.get('/room/:receiverId',  this.authenticateService.authorize, ChatControls.getChatsBetweenUsers.bind(ChatControls),);
        this.router.get('/rooms/',  this.authenticateService.authorize, ChatControls.getAllChatRoomsForUser.bind(ChatControls),);
    }

   
}

export default new ChatRoutes().router;
