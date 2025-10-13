import { prismaClient } from "..";


export interface CreateLandlordEventDTO {
  title: string;
  description?: string;
  startTime: Date;
  endTime: Date;
  date: Date;
  color?: string;
}

export interface UpdateLandlordEventDTO {
  title?: string;
  description?: string;
  startTime?: Date;
  endTime?: Date;
  date?: Date;
  color?: string;
}

export interface LandlordEventResponseDTO {
  id?: string;
  title: string;
  description?: string;
  startTime: Date;
  endTime: Date;
  date: Date;
  color?: string;
  landlordId?: string;
  vendorId?: string;
  createdAt: Date;
  updatedAt: Date;
}

class LandlordEventService {
   async createEvent(landlordId: string, eventData: CreateLandlordEventDTO): Promise<LandlordEventResponseDTO> {
    return await prismaClient.event.create({
      data: {
        ...eventData,
        landlords: { connect: { id: landlordId } },
        // vendor: { connect: { id: eventData.vendorId } },
      }
    });
  }

  async getEventsByLandlord(landlordId: string, startDate?: Date, endDate?: Date): Promise<LandlordEventResponseDTO[]> {
    const whereClause: any = {
      landlordId,
    };

    if (startDate && endDate) {
      whereClause.date = {
        gte: startDate,
        lte: endDate,
      };
    }

    const events = await prismaClient.event.findMany({
      where: whereClause,
      orderBy: {
        date: 'asc',
      },
    });

    return events.map(event => ({
      id: event.id,
      title: event.title,
      description: event.description,
      startTime: event.startTime,
      endTime: event.endTime,
      date: event.date,
      color: event.color,
      landlordId: event.landlordId,
      createdAt: event.createdAt,
      updatedAt: event.updatedAt,
    }));
  }

  async getEventById(eventId: string, landlordId: string): Promise<LandlordEventResponseDTO | null> {
    const event = await prismaClient.event.findFirst({
      where: {
        id: eventId,
        landlordId,
      },
    });

    if (!event) {
      return null;
    }

    return {
      id: event.id,
      title: event.title,
      description: event.description,
      startTime: event.startTime,
      endTime: event.endTime,
      date: event.date,
      color: event.color,
      landlordId: event.landlordId,
      createdAt: event.createdAt,
      updatedAt: event.updatedAt,
    };
  }

  async updateEvent(eventId: string, landlordId: string, eventData: UpdateLandlordEventDTO): Promise<LandlordEventResponseDTO | null> {
    const event = await prismaClient.event.findFirst({
      where: {
        id: eventId,
        landlordId,
      },
    });

    if (!event) {
      return null;
    }

    const updatedEvent = await prismaClient.event.update({
      where: { id: eventId },
      data: eventData,
    });

    return {
      id: updatedEvent.id,
      title: updatedEvent.title,
      description: updatedEvent.description,
      startTime: updatedEvent.startTime,
      endTime: updatedEvent.endTime,
      date: updatedEvent.date,
      color: updatedEvent.color,
      landlordId: updatedEvent.landlordId,
      createdAt: updatedEvent.createdAt,
      updatedAt: updatedEvent.updatedAt,
    };
  }

  async deleteEvent(eventId: string, landlordId: string): Promise<boolean> {
    const event = await prismaClient.event.findFirst({
      where: {
        id: eventId,
        landlordId,
      },
    });

    if (!event) {
      return false;
    }

    await prismaClient.event.delete({
      where: { id: eventId },
    });

    return true;
  }
}

export default new LandlordEventService();
