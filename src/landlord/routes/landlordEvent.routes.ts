import { Router } from "express";
import LandlordEventController from "../controllers/landlordEvent.controller";
import { Authorize } from "../../middlewares/authorize";
import { userRoles } from "@prisma/client";
import { validateBody } from "../../middlewares/validation";
import { EventSchema, UpdateEventSchema } from "../../validations/schemas/event.schema";

class LandlordEventRouter {
    public router: Router;
    authenticateService: Authorize;

    constructor() {
        this.router = Router();
        this.authenticateService = new Authorize();
        this.initializeRoutes();
    }

    private initializeRoutes(): void {
        // Apply authentication and landlord role authorization
        this.router.use(this.authenticateService.authorize);
        this.router.use(this.authenticateService.authorizeRole(userRoles.LANDLORD));

        // Event routes
        this.router.post('/', validateBody(EventSchema), LandlordEventController.createEvent);
        this.router.get('/', LandlordEventController.getLandlordEvents);
        this.router.get('/:eventId', LandlordEventController.getEventById);
        this.router.put('/:eventId', validateBody(UpdateEventSchema), LandlordEventController.updateEvent);
        this.router.delete('/:eventId', LandlordEventController.deleteEvent);
    }
}

export default new LandlordEventRouter().router;
