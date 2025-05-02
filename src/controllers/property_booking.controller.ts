import { Response } from "express";
import ErrorService from "../services/error.service";
import BookingService from "../services/booking.services";
import { CustomRequest } from "../utils/types";

class PropertyBookingController {
    constructor() { }


    createBooking = async (req: CustomRequest, res: Response) => {
        try {
            const {
                propertyId,
                guestName,
                guestEmail,
                guestPhone,
                checkInDate,
                checkOutDate,
                guestCount,
                specialRequests,
                paymentStatus,
                paymentMethod,
                transactionReference,
            } = req.body;

            if (
                !propertyId || !guestName || !guestEmail ||
                !checkInDate || !checkOutDate || !guestCount
            ) {
                return res.status(400).json({ message: "Missing required booking information." });
            }

            const booking = await BookingService.createBooking({
                shortletId: propertyId,
                userId: req.user?.id,
                guestName,
                guestEmail,
                guestPhone,
                checkInDate: new Date(checkInDate),
                checkOutDate: new Date(checkOutDate),
                guestCount: Number(guestCount),
                specialRequests,
                paymentStatus,
                paymentMethod,
                transactionReference,
            });

            return res.status(201).json({ message: "Booking successful", data: booking });

        } catch (error: any) {
            ErrorService.handleError(error, res);
        }
    }

    getAllBookings = async (req: CustomRequest, res: Response) => {
        try {
            const bookings = await BookingService.getAllBookings();
            res.status(200).json({ success: true, data: bookings });
        } catch (error) {
            res.status(500).json({ success: false, message: error.message });
        }
    }

    getBookingById = async (req: CustomRequest, res: Response) => {
        try {
            const { id } = req.params;
            const booking = await BookingService.getBookingById(id);
            res.status(200).json({ success: true, data: booking });
        } catch (error) {
            res.status(404).json({ success: false, message: error.message });
        }
    }

    cancelBooking = async (req: CustomRequest, res: Response) => {
        try {
            const { id } = req.params;
            const booking = await BookingService.cancelBooking(id);
            res.status(200).json({ success: true, data: booking });
        } catch (error) {
            res.status(400).json({ success: false, message: error.message });
        }
    }

    updatePaymentStatus = async (req: CustomRequest, res: Response) => {
        try {
            const { id } = req.params;
            const { paymentStatus } = req.body;
            const updated = await BookingService.updatePaymentStatus(id, paymentStatus);
            res.status(200).json({ success: true, data: updated });
        } catch (error) {
            res.status(400).json({ success: false, message: error.message });
        }
    }
}

export default new PropertyBookingController()