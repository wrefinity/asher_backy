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
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require(".prisma/client");
const __1 = require("..");
class BookingService {
    constructor() {
        this.userInclusion = {
            email: true,
            profile: true,
            id: true,
        };
        this.propertySpecificationInclusion = {
            property: {
                include: {
                    landlord: true,
                    state: true,
                    images: true,
                    virtualTours: true,
                    propertyDocument: true,
                    tenants: true,
                    ratings: true,
                    reviews: true,
                    taskManagement: true,
                    maintenanceWhitelist: true,
                    transactions: true,
                    settings: true,
                    violation: true,
                },
            },
        };
        this.bookingInclusion = {
            property: {
                include: {
                    seasonalPricing: true,
                    additionalRules: true,
                    unavailableDates: true,
                    hostLanguages: true,
                    roomDetails: true,
                    sharedFacilities: true,
                    PropertySpecification: {
                        include: this.propertySpecificationInclusion,
                    },
                },
            },
            user: {
                select: this.userInclusion,
            },
        };
        //   getAllLandlordBookings = async  (landlordId: string) =>{
        //     const bookings = await prismaClient.booking.findMany({
        //       where: {
        //         OR: [
        //           {
        //             // Booking made directly on a shortlet property
        //             shortlet: {
        //               propertySpecification: {
        //                 property: {
        //                   landlordId,
        //                 },
        //               },
        //             },
        //           },
        //           {
        //             // Booking made on a unit configuration
        //             unitConfiguration: {
        //               residentialProperty: {
        //                 specification: {
        //                   some: {
        //                     property: {
        //                       landlordId,
        //                     },
        //                   },
        //                 },
        //               },
        //             },
        //           },
        //           {
        //             // Booking made on a room detail
        //             roomDetail: {
        //               residentialProperty: {
        //                 specification: {
        //                   some: {
        //                     property: {
        //                       landlordId,
        //                     },
        //                   },
        //                 },
        //               },
        //             },
        //           },
        //         ],
        //       },
        //       include: {
        //         shortlet: true,
        //         unitConfiguration: true,
        //         roomDetail: true,
        //         user: true, // customer info
        //       },
        //     });
        //     return bookings;
        //   }
    }
    createBooking(data) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a, _b, _c;
            const { shortletId, unitConfigurationId, roomDetailId } = data;
            // Enforce only one target
            const targets = [shortletId, unitConfigurationId, roomDetailId].filter(Boolean);
            if (targets.length !== 1) {
                throw new Error("You must provide exactly one of shortletId, unitConfigurationId, or roomDetailId.");
            }
            let basePrice = 0;
            let maxGuests = 0;
            let availability = {};
            if (shortletId) {
                const property = yield __1.prismaClient.shortletProperty.findUnique({ where: { id: shortletId } });
                if (!property)
                    throw new Error("Shortlet property not found");
                basePrice = Number(property.basePrice);
                maxGuests = (_a = property.maxGuests) !== null && _a !== void 0 ? _a : 0;
                availability = { availableFrom: (_b = property.availableFrom) !== null && _b !== void 0 ? _b : undefined, availableTo: (_c = property.availableTo) !== null && _c !== void 0 ? _c : undefined };
            }
            else if (unitConfigurationId) {
                const unit = yield __1.prismaClient.unitConfiguration.findUnique({ where: { id: unitConfigurationId } });
                if (!unit)
                    throw new Error("Unit configuration not found");
                basePrice = Number(unit.price);
            }
            else if (roomDetailId) {
                const room = yield __1.prismaClient.roomDetail.findUnique({ where: { id: roomDetailId } });
                if (!room)
                    throw new Error("Room detail not found");
                basePrice = Number(room.price);
            }
            // Availability check
            if ((availability.availableFrom && data.checkInDate < availability.availableFrom) ||
                (availability.availableTo && data.checkOutDate > availability.availableTo)) {
                throw new Error("Selected dates are outside the availability range.");
            }
            if (maxGuests > 0 && data.guestCount > maxGuests) {
                throw new Error("Guest count exceeds the maximum allowed.");
            }
            // Conflict check
            const conflict = yield __1.prismaClient.booking.findFirst({
                where: {
                    OR: [
                        { propertyId: shortletId },
                        { unitConfigurationId },
                        { roomDetailId },
                    ],
                    AND: [
                        { checkInDate: { lte: data.checkOutDate } },
                        { checkOutDate: { gte: data.checkInDate } },
                    ],
                },
            });
            if (conflict)
                throw new Error("This unit is already booked for the selected dates.");
            const nights = Math.ceil((data.checkOutDate.getTime() - data.checkInDate.getTime()) / (1000 * 60 * 60 * 24));
            const totalAmount = Number((basePrice * nights).toFixed(2));
            const booking = yield __1.prismaClient.booking.create({
                data: {
                    property: {
                        connect: { id: shortletId }
                    },
                    unitConfiguration: {
                        connect: { id: unitConfigurationId }
                    },
                    roomDetail: { connect: { id: roomDetailId } },
                    user: { connect: { id: data.userId } },
                    checkInDate: data.checkInDate,
                    checkOutDate: data.checkOutDate,
                    guestCount: data.guestCount,
                    guestName: data.guestName,
                    guestEmail: data.guestEmail,
                    guestPhone: data.guestEmail,
                    specialRequests: data.specialRequests,
                    paymentStatus: data.paymentStatus,
                    paymentMethod: data.paymentMethod,
                    transactionReference: data.transactionReference,
                    totalPrice: String(totalAmount),
                },
            });
            return booking;
        });
    }
    getAllBookings() {
        return __awaiter(this, void 0, void 0, function* () {
            return yield __1.prismaClient.booking.findMany({
                include: this.bookingInclusion,
            });
        });
    }
    getBookingById(id) {
        return __awaiter(this, void 0, void 0, function* () {
            const booking = yield __1.prismaClient.booking.findUnique({
                where: { id },
                include: this.bookingInclusion,
            });
            if (!booking) {
                throw new Error("Booking not found");
            }
            return booking;
        });
    }
    cancelBooking(id) {
        return __awaiter(this, void 0, void 0, function* () {
            const booking = yield __1.prismaClient.booking.update({
                where: { id },
                data: {
                    status: client_1.BookingStatus.CANCELLED,
                },
            });
            return booking;
        });
    }
    updatePaymentStatus(id, status) {
        return __awaiter(this, void 0, void 0, function* () {
            return yield __1.prismaClient.booking.update({
                where: { id },
                data: {
                    paymentStatus: status,
                },
            });
        });
    }
}
exports.default = new BookingService();
