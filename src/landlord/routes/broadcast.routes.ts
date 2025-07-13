import { Router } from "express";
import { Authorize } from "../../middlewares/authorize";
import broadcastController from "../controllers/broadcast.controller";

class BroadcastRouter {
    public router: Router;
    authenticateService: Authorize

    constructor() {
        this.router = Router();
        this.authenticateService = new Authorize();
        this.initializeRoutes();
    }

    private initializeRoutes() {
        this.router.use(this.authenticateService.authorize)
        
        // BROADCAST CATEGORY ROUTES
        this.router.post('/categories', broadcastController.createBroadcastCategory);
        this.router.get('/categories', broadcastController.getBroadcastCategories);
        this.router.get('/categories/:categoryId', broadcastController.getBroadcastCategoryById);
        this.router.put('/categories/:categoryId', broadcastController.updateBroadcastCategory);
        this.router.delete('/categories/:categoryId', broadcastController.deleteBroadcastCategory);
        
        // CATEGORY MEMBERS ROUTES
        this.router.post('/categories/:categoryId/members', broadcastController.addMembersToCategory);
        this.router.delete('/categories/:categoryId/members', broadcastController.removeMembersFromCategory);
        this.router.get('/categories/:categoryId/members', broadcastController.getCategoryMembers);
        
        // BROADCAST ROUTES
        this.router.post('/create-and-send', broadcastController.createAndSendBroadcast);
        this.router.post('/', broadcastController.createBroadcast);
        this.router.get('/drafts', broadcastController.getDraftBroadcasts);
        this.router.put('/drafts/:broadcastId', broadcastController.updateDraftBroadcast);
        this.router.post('/drafts/:broadcastId/send', broadcastController.sendDraftBroadcast);
        this.router.get('/scheduled', broadcastController.getScheduledBroadcasts);
        this.router.post('/:broadcastId/send', broadcastController.sendBroadcast);
        this.router.post('/:broadcastId/send-scheduled', broadcastController.sendScheduledBroadcast);
        this.router.delete('/:broadcastId/cancel', broadcastController.cancelScheduledBroadcast);
        
        this.router.get('/category/:categoryId', broadcastController.getBroadcastsByCategory);
        this.router.get('/:broadcastId', broadcastController.getBroadcastById);
        this.router.get('/', broadcastController.getBroadcastsByLandlord);
    }
}

export default new BroadcastRouter().router;