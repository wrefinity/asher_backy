import { Router } from "express";
import { Authorize } from "../../middlewares/authorize";
import SupportController from "../controllers/support.controller";
import upload from "../../configs/multer";
import { uploadToCloudinary } from "../../middlewares/multerCloudinary";
class SupportRouter {
    public router: Router;
    authenticateService: Authorize

    constructor() {
        this.router = Router();
        this.authenticateService = new Authorize();
        this.initializeRoutes();
    }

    private initializeRoutes() {
        this.router.use(this.authenticateService.authorize)
        this.router.post("/", upload.array("files"), uploadToCloudinary, SupportController.createTicket);
        this.router.post("/assign/:ticketId", SupportController.assignTicket);
        this.router.get("/user-tickets", SupportController.getLandlordTickets);
        this.router.get("/tenants-tickets", SupportController.getLandlordTenantTickets);
        this.router.get("/:ticketId", SupportController.getTicket);
        this.router.get("/all-tickets", SupportController.getAllTickets);
        this.router.patch("/:ticketId", upload.array("files"), uploadToCloudinary, SupportController.updateTicket);
        this.router.patch("/status/:ticketId", SupportController.updateTicketStatus);
        this.router.post("/assign/:ticketId", SupportController.assignTicket);
    }
}

export default new SupportRouter().router;