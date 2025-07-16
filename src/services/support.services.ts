import { prismaClient } from "..";
import { TicketStatus } from "@prisma/client";
export class SupportService {
  // Create ticket — expect landlord ID now
  static async createTicket(landlordId: string, payload: any) {
    return prismaClient.supportTicket.create({
      data: {
        raisedById: landlordId,
        subject: payload.subject,
        type: payload.type,
        description: payload.description,
        priority: payload.priority,
        attachments: payload.attachments || [],
      },
    });
  }

  // Fetch all tickets by a landlord
  static async getLandlordTickets(
    landlordId: string,
    page = 1,
    limit = 10,
    search = ""
  ) {
    const currentPage = Math.max(1, Math.floor(page));
    const itemsPerPage = Math.max(1, Math.min(limit, 100));
    const skip = (currentPage - 1) * itemsPerPage;

    // Build the base query
    const where: any = {
      raisedById: landlordId,
    };

    // Add search filter if applicable
    if (search.trim() !== "") {
      where.OR = [
        { subject: { contains: search, mode: "insensitive" } },
        { description: { contains: search, mode: "insensitive" } },
        { status: { equals: search.toUpperCase() } }, // Optional: status filter
        { type: { equals: search.toUpperCase() } },   // Optional: type filter
      ];
    }

    // Get total count
    const totalItems = await prismaClient.supportTicket.count({ where });

    // Get paginated data
    const tickets = await prismaClient.supportTicket.findMany({
      where,
      skip,
      take: itemsPerPage,
      orderBy: { createdAt: "desc" },
      include: {
        raisedBy: {
          include: {
            user: {
              select: {
                id: true,
                email: true,
                profile: true,
              },
            },
          },
        },
        assignedTo: {
          select: {
            id: true,
            email: true,
            profile: true,
          },
        },
      },
    });

    const totalPages = Math.ceil(totalItems / itemsPerPage);

    return {
      data: tickets,
      pagination: {
        totalItems,
        totalPages,
        currentPage,
        itemsPerPage,
        hasNextPage: currentPage < totalPages,
        hasPreviousPage: currentPage > 1,
      },
    };
  }

  // update ticket
  static async getTicketById(ticketId: string) {
    return prismaClient.supportTicket.findUnique({
      where: { id: ticketId },

      include: {
        raisedBy: {
          include: {
            user: {
              select: {
                id: true,
                email: true,
                profile: true,
              },
            },
          },
        },
        assignedTo: {
          select: {
            id: true,
            email: true,
            profile: true,
          },
        },
      },
    });
  }


  // Admin: fetch all tickets with raisedBy (landlord.user) & assignedTo (user)
  static async getAllTicketsForAdmin(
    page = 1,
    limit = 10,
    search = ""
  ) {
    const currentPage = Math.max(1, Math.floor(page));
    const itemsPerPage = Math.max(1, Math.min(limit, 100));
    const skip = (currentPage - 1) * itemsPerPage;

    // Build base filter
    const where: any = {};

    if (search.trim() !== "") {
      where.OR = [
        { subject: { contains: search, mode: "insensitive" } },
        { description: { contains: search, mode: "insensitive" } },
        { status: { equals: search.toUpperCase() } },
        { type: { equals: search.toUpperCase() } },
        {
          raisedBy: {
            user: {
              profile: {
                fullName: { contains: search, mode: "insensitive" },
              },
            },
          },
        },
        {
          assignedTo: {
            email: { contains: search, mode: "insensitive" },
          },
        },
      ];
    }

    const totalItems = await prismaClient.supportTicket.count({ where });

    const tickets = await prismaClient.supportTicket.findMany({
      where,
      skip,
      take: itemsPerPage,
      orderBy: { createdAt: "desc" },
      include: {
        raisedBy: {
          include: {
            user: {
              select: {
                id: true,
                email: true,
                profile: true,
              },
            },
          },
        },
        assignedTo: {
          select: {
            id: true,
            email: true,
            profile: true,
          },
        },
      },
    });

    const totalPages = Math.ceil(totalItems / itemsPerPage);

    return {
      data: tickets,
      pagination: {
        totalItems,
        totalPages,
        currentPage,
        itemsPerPage,
        hasNextPage: currentPage < totalPages,
        hasPreviousPage: currentPage > 1,
      },
    };
  }


  // Admin updates status of ticket
  static async updateTicketStatus(ticketId: string, status: TicketStatus) {
    return prismaClient.supportTicket.update({
      where: { id: ticketId },
      data: { status },
    });
  }
  // update ticket
  static async updateTicket(ticketId: string, data: any) {
    return prismaClient.supportTicket.update({
      where: { id: ticketId },
      data,
    });
  }

  // Admin assigns ticket to support user
  static async assignTicket(ticketId: string, supportUserId: string) {
    return prismaClient.supportTicket.update({
      where: { id: ticketId },
      data: {
        assignedToId: supportUserId,
        status: TicketStatus.IN_PROGRESS, // Automatically set to in-progress when assigned
      },
    });
  }
}
