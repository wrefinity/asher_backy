import { prismaClient } from "..";
import { PrismaClient, Event } from '@prisma/client';
import { CreateEventDTO, UpdateEventDTO, EventResponseDTO, VendorAvailabilityDTO } from '../validations/interfaces/events.interface';
import { ApiError } from '../utils/ApiError';


class EventService {
  private prisma: PrismaClient;

  constructor() {
    this.prisma = prismaClient;
  }

  async createEvent(vendorId: string, eventData: CreateEventDTO): Promise<EventResponseDTO> {
    // Check for time conflicts
    const conflictingEvent = await this.prisma.event.findFirst({
      where: {
        vendorId,
        OR: [
          {
            startTime: { lt: eventData.endTime },
            endTime: { gt: eventData.startTime }
          }
        ]
      }
    });

    if (conflictingEvent) {
      throw ApiError.badRequest('Time conflict with existing event');
    }

    const event = await this.prisma.event.create({
      data: {
        ...eventData,
        vendorId,
        date: new Date(eventData.date.setHours(0, 0, 0, 0))
      },
      include: {
        vendor: {
          include: {
            user: {
              select: {
                id: true,
                email: true
              }
            }
          }
        }
      }
    });

    return this.mapEventToDTO(event);
  }

  async getEventsByVendor(vendorId: string, startDate?: Date, endDate?: Date): Promise<EventResponseDTO[]> {
    const where: any = { vendorId };

    if (startDate && endDate) {
      where.startTime = {
        gte: startDate,
        lte: endDate
      };
    }

    const events = await this.prisma.event.findMany({
      where,
      include: {
        vendor: {
          include: {
            user: {
              select: {
                id: true,
                email: true
              }
            }
          }
        }
      },
      orderBy: { startTime: 'asc' }
    });

    return events.map(event => this.mapEventToDTO(event));
  }

  // async getEventsByDateRange(vendorId: string, startDate: Date, endDate: Date): Promise<EventsByDateResponse[]> {
  //   const events = await this.prisma.event.findMany({
  //     where: {
  //       vendorId,
  //       date: {
  //         gte: startDate,
  //         lte: endDate
  //       }
  //     },
  //     include: {
  //       vendor: {
  //         include: {
  //           user: {
  //             select: {
  //               id: true,
  //               email: true
  //             }
  //           }
  //         }
  //       }
  //     },
  //     orderBy: { startTime: 'asc' }
  //   });

  //   // Group events by date
  //   const eventsByDate = events.reduce((acc, event) => {
  //     const dateStr = event.date.toISOString().split('T')[0];
  //     if (!acc[dateStr]) {
  //       acc[dateStr] = [];
  //     }
  //     acc[dateStr].push(this.mapEventToDTO(event));
  //     return acc;
  //   }, {} as Record<string, EventResponseDTO[]>);

  //   return Object.entries(eventsByDate).map(([date, events]) => ({
  //     date,
  //     events
  //   }));
  // }

  async getEventById(eventId: string, vendorId: string): Promise<EventResponseDTO> {
    const event = await this.prisma.event.findFirst({
      where: {
        id: eventId,
        vendorId
      },
      include: {
        vendor: {
          include: {
            user: {
              select: {
                id: true,
                email: true
              }
            }
          }
        }
      }
    });

    if (!event) {
      throw ApiError.notFound('Event not found');
    }

    return this.mapEventToDTO(event);
  }

  async updateEvent(eventId: string, vendorId: string, updates: UpdateEventDTO): Promise<EventResponseDTO> {
    // Check if event exists and belongs to vendor
    const existingEvent = await this.prisma.event.findFirst({
      where: { id: eventId, vendorId }
    });

    if (!existingEvent) {
      throw ApiError.notFound('Event not found');
    }

    // Check for time conflicts (excluding current event)
    if (updates.startTime || updates.endTime) {
      const startTime = updates.startTime || existingEvent.startTime;
      const endTime = updates.endTime || existingEvent.endTime;

      const conflictingEvent = await this.prisma.event.findFirst({
        where: {
          vendorId,
          id: { not: eventId },
          OR: [
            {
              startTime: { lt: endTime },
              endTime: { gt: startTime }
            }
          ]
        }
      });

      if (conflictingEvent) {
        throw ApiError.badRequest('Time conflict with existing event');
      }
    }

    const updatedEvent = await this.prisma.event.update({
      where: { id: eventId },
      data: {
        ...updates,
        ...(updates.date && { date: new Date(updates.date.setHours(0, 0, 0, 0)) })
      },
      include: {
        vendor: {
          include: {
            user: {
              select: {
                id: true,
                email: true
              }
            }
          }
        }
      }
    });

    return this.mapEventToDTO(updatedEvent);
  }

  async deleteEvent(eventId: string, vendorId: string): Promise<void> {
    const event = await this.prisma.event.findFirst({
      where: { id: eventId, vendorId }
    });

    if (!event) {
      throw ApiError.notFound('Event not found');
    }

    await this.prisma.event.delete({
      where: { id: eventId }
    });
  }

  async setVendorAvailability(vendorId: string, availability: VendorAvailabilityDTO[]): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      // Delete existing availability
      await tx.vendorAvailability.deleteMany({
        where: { vendorId }
      });

      // Create new availability
      await tx.vendorAvailability.createMany({
        data: availability.map(avail => ({
          ...avail,
          vendorId
        }))
      });
    });
  }

  async getVendorAvailability(vendorId: string): Promise<VendorAvailabilityDTO[]> {
    const availability = await this.prisma.vendorAvailability.findMany({
      where: { vendorId },
      orderBy: { dayOfWeek: 'asc' }
    });

    return availability.map(avail => ({
      dayOfWeek: avail.dayOfWeek,
      startTime: avail.startTime,
      endTime: avail.endTime,
      isActive: avail.isActive
    }));
  }

  private mapEventToDTO(event: Event & any): EventResponseDTO {
    return {
      id: event.id,
      title: event.title,
      description: event.description,
      startTime: event.startTime.toISOString(),
      endTime: event.endTime.toISOString(),
      date: event.date.toISOString(),
      vendorId: event.vendorId,
      createdAt: event.createdAt.toISOString(),
      updatedAt: event.updatedAt.toISOString()
    };
  }
}

export default new EventService();