import { BookingStatus } from ".prisma/client";
import { prismaClient } from "..";
import { IUnitConfiguration } from "../validations/interfaces/properties.interface";

class BookingService {
  private userInclusion = {
    email: true,
    profile: true,
    id: true,
  };

  private propertySpecificationInclusion = {
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

  private bookingInclusion = {
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

  public async createBooking(data: {
    shortletId?: string;
    unitConfigurationId?: string;
    roomDetailId?: string;
    userId: string;
    checkInDate: Date;
    checkOutDate: Date;
    guestCount: number;
    guestName: string;
    guestEmail: string;
    guestPhone: string;
    specialRequests?: string;
    paymentStatus?: string;
    paymentMethod?: string;
    transactionReference?: string;
  }) {
    const { shortletId, unitConfigurationId, roomDetailId } = data;

    // Enforce only one target
    const targets = [shortletId, unitConfigurationId, roomDetailId].filter(Boolean);
    if (targets.length !== 1) {
      throw new Error("You must provide exactly one of shortletId, unitConfigurationId, or roomDetailId.");
    }

    let basePrice = 0;
    let maxGuests = 0;
    let availability: { availableFrom?: Date; availableTo?: Date } = {};

    if (shortletId) {
      const property = await prismaClient.shortletProperty.findUnique({ where: { id: shortletId } });
      if (!property) throw new Error("Shortlet property not found");
      basePrice = Number(property.basePrice);
      maxGuests = property.maxGuests ?? 0;
      availability = { availableFrom: property.availableFrom ?? undefined, availableTo: property.availableTo ?? undefined };
    } else if (unitConfigurationId) {
      const unit = await prismaClient.unitConfiguration.findUnique({ where: { id: unitConfigurationId } });
      if (!unit) throw new Error("Unit configuration not found");
      basePrice = Number(unit.price);
    } else if (roomDetailId) {
      const room = await prismaClient.roomDetail.findUnique({ where: { id: roomDetailId } });
      if (!room) throw new Error("Room detail not found");
      basePrice = Number(room.price);
    }

    // Availability check
    if (
      (availability.availableFrom && data.checkInDate < availability.availableFrom) ||
      (availability.availableTo && data.checkOutDate > availability.availableTo)
    ) {
      throw new Error("Selected dates are outside the availability range.");
    }

    if (maxGuests > 0 && data.guestCount > maxGuests) {
      throw new Error("Guest count exceeds the maximum allowed.");
    }

    // Conflict check
    const conflict = await prismaClient.booking.findFirst({
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

    if (conflict) throw new Error("This unit is already booked for the selected dates.");

    const nights = Math.ceil(
      (data.checkOutDate.getTime() - data.checkInDate.getTime()) / (1000 * 60 * 60 * 24)
    );
    const totalAmount = Number((basePrice * nights).toFixed(2));

    const booking = await prismaClient.booking.create({
      data: {
        property: {
            connect: {id: shortletId}
        },
        unitConfiguration: {
            connect: {id: unitConfigurationId}
        },
        roomDetail: {connect:{id: roomDetailId}},
        user: { connect: {id: data.userId}},
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
  }

  public async getAllBookings() {
    return await prismaClient.booking.findMany({
      include: this.bookingInclusion,
    });
  }

  public async getBookingById(id: string) {
    const booking = await prismaClient.booking.findUnique({
      where: { id },
      include: this.bookingInclusion,
    });

    if (!booking) {
      throw new Error("Booking not found");
    }

    return booking;
  }

  public async cancelBooking(id: string) {
    const booking = await prismaClient.booking.update({
      where: { id },
      data: {
        status: BookingStatus.CANCELLED,
      },
    });

    return booking;
  }

  public async updatePaymentStatus(id: string, status: string) {
    return await prismaClient.booking.update({
      where: { id },
      data: {
        paymentStatus: status,
      },
    });
  }
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

export default new BookingService();
