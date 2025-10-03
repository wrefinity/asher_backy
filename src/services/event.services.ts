import { prismaClient } from "..";
import { PrismaClient, Event } from '@prisma/client';
import { CreateEventDTO, UpdateEventDTO, EventResponseDTO, VendorAvailabilityDTO } from '../validations/interfaces/events.interface';
import { ApiError } from '../utils/ApiError';

class EventService {


  createEvent = async (vendorId: string, eventData: CreateEventDTO): Promise<EventResponseDTO> => {
    try {
      console.log('Creating event with data:', { vendorId, eventData });
      
      // Check for time conflicts
      const conflictingEvent = await prismaClient.event.findFirst({
        where: {
          vendorId,
          OR: [
            {
              startTime: { lt: new Date(eventData.endTime) },
              endTime: { gt: new Date(eventData.startTime) }
            }
          ]
        }
      });

      if (conflictingEvent) {
        throw ApiError.badRequest('Time conflict with existing event');
      }

      // Ensure date is properly formatted (set to start of day)
      const eventDate = new Date(eventData.date);
      eventDate.setHours(0, 0, 0, 0);

      const event = await prismaClient.event.create({
        data: {
          title: eventData.title,
          description: eventData.description,
          startTime: new Date(eventData.startTime),
          endTime: new Date(eventData.endTime),
          date: eventDate,
          vendorId: vendorId,
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

      console.log('Event created successfully:', event.id);
      return this.mapEventToDTO(event);
    } catch (error: any) {
      console.error('Error creating event:', error);
      if (error instanceof ApiError) {
        throw error;
      }
      throw ApiError.internal('Failed to create event: ' + error.message);
    }
  }

  async getEventsByVendor(vendorId: string, startDate?: Date, endDate?: Date): Promise<EventResponseDTO[]> {
    try {
      const where: any = { vendorId };

      if (startDate && endDate) {
        where.startTime = {
          gte: startDate,
          lte: endDate
        };
      }

      const events = await prismaClient.event.findMany({
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
    } catch (error: any) {
      console.error('Error fetching vendor events:', error);
      throw ApiError.internal('Failed to fetch events: ' + error.message);
    }
  }

  async getEventsByDateRange(vendorId: string, startDate: Date, endDate: Date): Promise<any[]> {
    try {
      const events = await prismaClient.event.findMany({
        where: {
          vendorId,
          date: {
            gte: startDate,
            lte: endDate
          }
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
        },
        orderBy: { startTime: 'asc' }
      });

      // Group events by date
      const eventsByDate = events.reduce((acc, event) => {
        const dateStr = event.date.toISOString().split('T')[0];
        if (!acc[dateStr]) {
          acc[dateStr] = [];
        }
        acc[dateStr].push(this.mapEventToDTO(event));
        return acc;
      }, {} as Record<string, EventResponseDTO[]>);

      return Object.entries(eventsByDate).map(([date, events]) => ({
        date,
        events
      }));
    } catch (error: any) {
      console.error('Error fetching events by date range:', error);
      throw ApiError.internal('Failed to fetch events by date range: ' + error.message);
    }
  }

  async getEventById(eventId: string, vendorId: string): Promise<EventResponseDTO> {
    try {
      const event = await prismaClient.event.findFirst({
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
    } catch (error: any) {
      console.error('Error fetching event by id:', error);
      if (error instanceof ApiError) {
        throw error;
      }
      throw ApiError.internal('Failed to fetch event: ' + error.message);
    }
  }

  async updateEvent(eventId: string, vendorId: string, updates: UpdateEventDTO): Promise<EventResponseDTO> {
    try {
      // Check if event exists and belongs to vendor
      const existingEvent = await prismaClient.event.findFirst({
        where: { id: eventId, vendorId }
      });

      if (!existingEvent) {
        throw ApiError.notFound('Event not found');
      }

      // Check for time conflicts (excluding current event)
      if (updates.startTime || updates.endTime) {
        const startTime = updates.startTime ? new Date(updates.startTime) : existingEvent.startTime;
        const endTime = updates.endTime ? new Date(updates.endTime) : existingEvent.endTime;

        const conflictingEvent = await prismaClient.event.findFirst({
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

      const updateData: any = {
        ...updates
      };

      if (updates.date) {
        updateData.date = new Date(updates.date);
        updateData.date.setHours(0, 0, 0, 0);
      }

      if (updates.startTime) {
        updateData.startTime = new Date(updates.startTime);
      }

      if (updates.endTime) {
        updateData.endTime = new Date(updates.endTime);
      }

      const updatedEvent = await prismaClient.event.update({
        where: { id: eventId },
        data: updateData,
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
    } catch (error: any) {
      console.error('Error updating event:', error);
      if (error instanceof ApiError) {
        throw error;
      }
      throw ApiError.internal('Failed to update event: ' + error.message);
    }
  }

  async deleteEvent(eventId: string, vendorId: string): Promise<void> {
    try {
      const event = await prismaClient.event.findFirst({
        where: { id: eventId, vendorId }
      });

      if (!event) {
        throw ApiError.notFound('Event not found');
      }

      await prismaClient.event.delete({
        where: { id: eventId }
      });
    } catch (error: any) {
      console.error('Error deleting event:', error);
      if (error instanceof ApiError) {
        throw error;
      }
      throw ApiError.internal('Failed to delete event: ' + error.message);
    }
  }

  async setVendorAvailability(vendorId: string, availability: VendorAvailabilityDTO[]): Promise<void> {
    try {
      await prismaClient.$transaction(async (tx) => {
        // Delete existing availability
        await tx.vendorAvailability.deleteMany({
          where: { vendorId }
        });

        // Create new availability
        await tx.vendorAvailability.createMany({
          data: availability.map(avail => ({
            dayOfWeek: avail.dayOfWeek,
            startTime: avail.startTime,
            endTime: avail.endTime,
            isActive: avail.isActive,
            vendorId
          }))
        });
      });
    } catch (error: any) {
      console.error('Error setting vendor availability:', error);
      throw ApiError.internal('Failed to set availability: ' + error.message);
    }
  }

  async getVendorAvailability(vendorId: string): Promise<VendorAvailabilityDTO[]> {
    try {
      const availability = await prismaClient.vendorAvailability.findMany({
        where: { vendorId },
        orderBy: { dayOfWeek: 'asc' }
      });

      return availability.map(avail => ({
        dayOfWeek: avail.dayOfWeek,
        startTime: avail.startTime,
        endTime: avail.endTime,
        isActive: avail.isActive
      }));
    } catch (error: any) {
      console.error('Error fetching vendor availability:', error);
      throw ApiError.internal('Failed to fetch availability: ' + error.message);
    }
  }

  private mapEventToDTO(event: any): EventResponseDTO {
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