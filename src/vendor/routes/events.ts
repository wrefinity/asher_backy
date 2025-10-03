import { Router } from "express";
import EventController from "../controllers/events.controller";

class EventRouter {
    public router: Router;

    constructor() {
        this.router = Router();
        this.initializeRoutes();
    }

    private initializeRoutes() {
    

        // Event routes
        this.router.post('/', EventController.createEvent);
        this.router.get('/', EventController.getVendorEvents);
        // this.router.get('/range', EventController.getEventsByDateRange);
        this.router.get('/:eventId', EventController.getEventById);
        this.router.put('/:eventId', EventController.updateEvent);
        this.router.delete('/:eventId', EventController.deleteEvent);

        // Availability routes
        this.router.post('/availability', EventController.setAvailability);
        this.router.get('/availability', EventController.getAvailability);

    }
}

export default new EventRouter().router;