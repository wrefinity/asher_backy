"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const property_booking_controller_1 = __importDefault(require("../controllers/property_booking.controller"));
const authorize_1 = require("../middlewares/authorize");
class BookingRoutes {
    constructor() {
        this.router = (0, express_1.Router)();
        this.authenticateService = new authorize_1.Authorize(); // Moved before initializeRoutes
        this.initializeRoutes();
    }
    initializeRoutes() {
        // Create a new booking
        this.router.post("/", this.authenticateService.authorize, property_booking_controller_1.default.createBooking);
        // Get all bookings
        this.router.get("/", this.authenticateService.authorize, property_booking_controller_1.default.getAllBookings);
        // Get booking by ID
        this.router.get("/:id", this.authenticateService.authorize, property_booking_controller_1.default.getBookingById);
        // Cancel a booking
        this.router.patch("/:id/cancel", this.authenticateService.authorize, property_booking_controller_1.default.cancelBooking);
        // Update payment status
        this.router.patch("/:id/payment-status", this.authenticateService.authorize, property_booking_controller_1.default.updatePaymentStatus);
    }
}
exports.default = new BookingRoutes().router;
