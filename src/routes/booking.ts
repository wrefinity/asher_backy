import { Router } from "express";
import BookingController from "../controllers/property_booking.controller";
import { Authorize } from "../middlewares/authorize";

class BookingRoutes {
    public router: Router;
    private authenticateService: Authorize;

    constructor() {
        this.router = Router();
        this.authenticateService = new Authorize(); // Moved before initializeRoutes
        this.initializeRoutes();
    }

    private initializeRoutes(): void {
        // Create a new booking
        this.router.post(
            "/",
            this.authenticateService.authorize,
            BookingController.createBooking
        );

        // Get all bookings
        this.router.get(
            "/",
            this.authenticateService.authorize,
            BookingController.getAllBookings
        );

        // Get booking by ID
        this.router.get(
            "/:id",
            this.authenticateService.authorize,
            BookingController.getBookingById
        );

        // Cancel a booking
        this.router.patch(
            "/:id/cancel",
            this.authenticateService.authorize,
            BookingController.cancelBooking
        );

        // Update payment status
        this.router.patch(
            "/:id/payment-status",
            this.authenticateService.authorize,
            BookingController.updatePaymentStatus
        );
    }
}

export default new BookingRoutes().router;
