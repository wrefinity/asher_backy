"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const error_service_1 = __importDefault(require("../services/error.service"));
const booking_services_1 = __importDefault(require("../services/booking.services"));
class PropertyBookingController {
    constructor() {
        this.createBooking = (req, res) => __awaiter(this, void 0, void 0, function* () {
            var _a;
            try {
                const { propertyId, guestName, guestEmail, guestPhone, checkInDate, checkOutDate, guestCount, specialRequests, paymentStatus, paymentMethod, transactionReference, } = req.body;
                if (!propertyId || !guestName || !guestEmail ||
                    !checkInDate || !checkOutDate || !guestCount) {
                    return res.status(400).json({ message: "Missing required booking information." });
                }
                const booking = yield booking_services_1.default.createBooking({
                    shortletId: propertyId,
                    userId: (_a = req.user) === null || _a === void 0 ? void 0 : _a.id,
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
            }
            catch (error) {
                error_service_1.default.handleError(error, res);
            }
        });
        this.getAllBookings = (req, res) => __awaiter(this, void 0, void 0, function* () {
            try {
                const bookings = yield booking_services_1.default.getAllBookings();
                res.status(200).json({ success: true, data: bookings });
            }
            catch (error) {
                res.status(500).json({ success: false, message: error.message });
            }
        });
        this.getBookingById = (req, res) => __awaiter(this, void 0, void 0, function* () {
            try {
                const { id } = req.params;
                const booking = yield booking_services_1.default.getBookingById(id);
                res.status(200).json({ success: true, data: booking });
            }
            catch (error) {
                res.status(404).json({ success: false, message: error.message });
            }
        });
        this.cancelBooking = (req, res) => __awaiter(this, void 0, void 0, function* () {
            try {
                const { id } = req.params;
                const booking = yield booking_services_1.default.cancelBooking(id);
                res.status(200).json({ success: true, data: booking });
            }
            catch (error) {
                res.status(400).json({ success: false, message: error.message });
            }
        });
        this.updatePaymentStatus = (req, res) => __awaiter(this, void 0, void 0, function* () {
            try {
                const { id } = req.params;
                const { paymentStatus } = req.body;
                const updated = yield booking_services_1.default.updatePaymentStatus(id, paymentStatus);
                res.status(200).json({ success: true, data: updated });
            }
            catch (error) {
                res.status(400).json({ success: false, message: error.message });
            }
        });
    }
}
exports.default = new PropertyBookingController();
