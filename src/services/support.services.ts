import { prismaClient } from "..";
import { TicketStatus } from "@prisma/client";
import openRouterService from './openrouter.service';

export class SupportService {
  /**
   * Generate ticket code: [2 initials][1 random letter]-[DDMMYYHHMM]
   * Example: LJA-2311251200 (for landlord "John" created on 23/11/25 at 12:00)
   */
  static async generateTicketCode(landlordId?: string | null, tenantId?: string | null): Promise<string> {
    let initials = 'ADM'; // Default for admin-created tickets

    if (landlordId) {
      // Get landlord's user profile
      const landlord = await prismaClient.landlords.findUnique({
        where: { id: landlordId },
        include: {
          user: {
            include: {
              profile: {
                select: {
                  firstName: true,
                  lastName: true,
                  fullname: true,
                },
              },
            },
          },
        },
      });

      if (landlord?.user?.profile) {
        const firstName = landlord.user.profile.firstName || '';
        const lastName = landlord.user.profile.lastName || '';

        // Extract first letter of first name and last name
        const firstInitial = firstName.charAt(0).toUpperCase() || 'L';
        const lastInitial = lastName.charAt(0).toUpperCase() || 'D';
        initials = `${firstInitial}${lastInitial}`;
      }
    } else if (tenantId) {
      // Get tenant's user profile
      const tenant = await prismaClient.tenants.findUnique({
        where: { id: tenantId },
        include: {
          user: {
            include: {
              profile: {
                select: {
                  firstName: true,
                  lastName: true,
                },
              },
            },
          },
        },
      });

      if (tenant?.user?.profile) {
        const firstName = tenant.user.profile.firstName || '';
        const lastName = tenant.user.profile.lastName || '';

        const firstInitial = firstName.charAt(0).toUpperCase() || 'T';
        const lastInitial = lastName.charAt(0).toUpperCase() || 'N';
        initials = `${firstInitial}${lastInitial}`;
      } else {
        initials = 'TNT'; // Default for tenant without profile
      }
    }

    // Add random letter (A-Z)
    const randomLetter = String.fromCharCode(65 + Math.floor(Math.random() * 26));

    // Format date/time: DDMMYYHHMM
    const now = new Date();
    const day = String(now.getDate()).padStart(2, '0');
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const year = String(now.getFullYear()).slice(-2);
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');

    const dateTime = `${day}${month}${year}${hours}${minutes}`;

    const ticketCode = `${initials}${randomLetter}-${dateTime}`;

    // Ensure uniqueness by checking if code exists
    const existing = await prismaClient.supportTicket.findUnique({
      where: { ticketCode },
    });

    if (existing) {
      // If exists, add a random number suffix
      const randomSuffix = Math.floor(Math.random() * 100).toString().padStart(2, '0');
      return `${initials}${randomLetter}-${dateTime}${randomSuffix}`;
    }

    return ticketCode;
  }

  // Create ticket — expect landlord ID now
  static async createTicket({ landlordId, tenantId, payload }: {
    landlordId?: string | null,
    tenantId?: string | null,
    payload: any
  }) {
    // Generate ticket code
    const ticketCode = await this.generateTicketCode(landlordId, tenantId);

    return prismaClient.supportTicket.create({
      data: {
        ticketCode,
        raisedById: landlordId ?? undefined,
        raisedByTenantId: tenantId ?? undefined,
        subject: payload.subject,
        type: payload.type,
        description: payload.description,
        priority: payload.priority,
        attachments: payload.attachments || [],
      },
    });
  }

  static async getTenantSupportTicketsForLandlord(
    landlordId: string,
    page: number,
    limit: number,
    search: string
  ) {
    const skip = (page - 1) * limit;

    const [tickets, totalCount] = await Promise.all([
      prismaClient.supportTicket.findMany({
        where: {
          raisedByTenant: {
            landlordId: landlordId,
            user: {
              OR: [
                { email: { contains: search, mode: 'insensitive' } },
                { profile: { firstName: { contains: search, mode: 'insensitive' } } },
              ],
            },
          },
        },
        include: {
          raisedByTenant: {
            include: {
              user: {
                select: {
                  id: true,
                  email: true,
                  profile: true,
                },
              },
              property: true,
            },
          },
          assignedTo: true,
        },
        orderBy: {
          createdAt: 'desc',
        },
        skip,
        take: limit,
      }),

      prismaClient.supportTicket.count({
        where: {
          raisedByTenant: {
            landlordId: landlordId,
            user: {
              OR: [
                { email: { contains: search, mode: 'insensitive' } },
                { profile: { firstName: { contains: search, mode: 'insensitive' } } },
              ],
            },
          },
        },
      }),
    ]);

    return {
      data: tickets,
      currentPage: page,
      totalPages: Math.ceil(totalCount / limit),
      totalItems: totalCount,
    };
  };


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

  // Get tickets by userId (for admin viewing user's tickets)
  static async getTicketsByUserId(
    userId: string,
    page = 1,
    limit = 100,
    search = ""
  ) {
    const currentPage = Math.max(1, Math.floor(page));
    const itemsPerPage = Math.max(1, Math.min(limit, 100));
    const skip = (currentPage - 1) * itemsPerPage;

    // First, find the landlord associated with this userId
    const landlord = await prismaClient.landlords.findFirst({
      where: { userId },
      select: { id: true },
    });

    // Build the base query - tickets raised by this landlord OR by tenants of this landlord
    const where: any = {};

    if (landlord) {
      where.OR = [
        { raisedById: landlord.id },
        {
          raisedByTenant: {
            landlordId: landlord.id,
          },
        },
      ];
    } else {
      // If no landlord found, return empty (user might not be a landlord)
      return {
        data: [],
        pagination: {
          totalItems: 0,
          totalPages: 0,
          currentPage,
          itemsPerPage,
          hasNextPage: false,
          hasPreviousPage: false,
        },
      };
    }

    // Add search filter if applicable
    if (search.trim() !== "") {
      const searchConditions = [
        { subject: { contains: search, mode: "insensitive" } },
        { description: { contains: search, mode: "insensitive" } },
        { status: { equals: search.toUpperCase() } },
        { type: { equals: search.toUpperCase() } },
      ];

      // Combine with existing OR conditions
      if (where.OR) {
        where.AND = [
          { OR: where.OR },
          { OR: searchConditions },
        ];
        delete where.OR;
      } else {
        where.OR = searchConditions;
      }
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
        raisedByTenant: {
          include: {
            user: {
              select: {
                id: true,
                email: true,
                profile: true,
              },
            },
            landlord: {
              include: {
                user: {
                  select: {
                    id: true,
                  },
                },
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
        messages: {
          include: {
            sender: {
              select: {
                id: true,
                email: true,
                profile: true,
                role: true,
              },
            },
          },
          orderBy: { createdAt: "asc" },
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
        raisedByTenant: {
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
        messages: {
          include: {
            sender: {
              select: {
                id: true,
                email: true,
                profile: true,
                role: true,
              },
            },
          },
          orderBy: {
            createdAt: 'asc',
          },
        },
      },
    });
  }

  // Get ticket by ticketCode (for frontend compatibility)
  static async getTicketByCode(ticketCode: string) {
    return prismaClient.supportTicket.findUnique({
      where: { ticketCode },
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
        raisedByTenant: {
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
        messages: {
          include: {
            sender: {
              select: {
                id: true,
                email: true,
                profile: true,
                role: true,
              },
            },
          },
          orderBy: {
            createdAt: 'asc',
          },
        },
      },
    });
  }

  // Add message to ticket
  static async addMessageToTicket(ticketId: string, senderId: string, content: string, attachments: string[] = [], isInternal: boolean = false) {
    // Verify ticket exists and get landlord info
    const ticket = await prismaClient.supportTicket.findUnique({
      where: { id: ticketId },
      include: {
        raisedBy: {
          include: {
            user: {
              select: {
                id: true,
              },
            },
          },
        },
        raisedByTenant: {
          include: {
            user: {
              select: {
                id: true,
              },
            },
            landlord: {
              include: {
                user: {
                  select: {
                    id: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!ticket) {
      throw new Error("Ticket not found");
    }

    // Create message
    const message = await prismaClient.ticketMessage.create({
      data: {
        ticketId,
        senderId,
        content,
        attachments,
        isInternal,
      },
      include: {
        sender: {
          select: {
            id: true,
            email: true,
            profile: true,
            role: true,
          },
        },
      },
    });

    // Update ticket's updatedAt timestamp
    await prismaClient.supportTicket.update({
      where: { id: ticketId },
      data: { updatedAt: new Date() },
    });

    // Emit Socket.IO event to landlord if message is not internal
    if (!isInternal) {
      try {
        const { serverInstance } = await import("../index");
        let landlordUserId: string | null = null;

        // Get landlord's userId
        if (ticket.raisedById && ticket.raisedBy?.user?.id) {
          landlordUserId = ticket.raisedBy.user.id;
        } else if (ticket.raisedByTenantId && ticket.raisedByTenant?.landlord?.user?.id) {
          landlordUserId = ticket.raisedByTenant.landlord.user.id;
        }

        if (landlordUserId) {
          // Get full ticket with messages for the notification
          const updatedTicket = await this.getTicketById(ticketId);

          const eventData = {
            ticketId: ticket.id,
            ticketCode: ticket.ticketCode,
            message,
            ticket: updatedTicket,
            timestamp: new Date(),
          };

          // Emit to user room
          serverInstance.io.to(`user:${landlordUserId}`).emit("ticket_message_added", eventData);

          // Also emit to ticket-specific room for real-time updates
          serverInstance.io.to(`ticket:${ticket.id}`).emit("ticket_message_added", eventData);
          serverInstance.io.to(`ticket:${ticket.ticketCode}`).emit("ticket_message_added", eventData);

          console.log(`📩 Ticket message notification sent to landlord: ${landlordUserId} for ticket ${ticket.ticketCode}`);
        }
      } catch (socketError) {
        // Log error but don't fail the message creation
        console.error("Error sending Socket.IO notification for ticket message:", socketError);
      }
    }

    return message;
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
          raisedByTenant: {
            user: {
              profile: {
                fullName: { contains: search, mode: "insensitive" },
              },
            },
          },
        },
        {
          raisedByTenant: {
            tenantWebUserEmail: { contains: search, mode: "insensitive" },
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
        raisedByTenant: {
          include: {
            user: {
              select: {
                id: true,
                email: true,
                profile: true,
              },
            },
            property: {
              select: {
                id: true,
                address: true,
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
        messages: {
          include: {
            sender: {
              select: {
                id: true,
                email: true,
                profile: true,
                role: true,
              },
            },
          },
          orderBy: {
            createdAt: 'asc',
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
    // Get ticket with landlord info before updating
    const ticketBeforeUpdate = await prismaClient.supportTicket.findUnique({
      where: { id: ticketId },
      include: {
        raisedBy: {
          include: {
            user: {
              select: {
                id: true,
              },
            },
          },
        },
        raisedByTenant: {
          include: {
            user: {
              select: {
                id: true,
              },
            },
            landlord: {
              include: {
                user: {
                  select: {
                    id: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!ticketBeforeUpdate) {
      throw new Error("Ticket not found");
    }

    // Update ticket status
    console.log(`📝 Updating ticket ${ticketId} status to: ${status}`);
    const updatedTicket = await prismaClient.supportTicket.update({
      where: { id: ticketId },
      data: { status },
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
        raisedByTenant: {
          include: {
            user: {
              select: {
                id: true,
                email: true,
                profile: true,
              },
            },
            property: {
              select: {
                id: true,
                address: true,
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
        messages: {
          include: {
            sender: {
              select: {
                id: true,
                email: true,
                profile: true,
                role: true,
              },
            },
          },
          orderBy: {
            createdAt: 'asc',
          },
        },
      },
    });

    // Emit Socket.IO event to landlord
    try {
      const { serverInstance } = await import("../index");
      let landlordUserId: string | null = null;

      // Get landlord's userId
      if (ticketBeforeUpdate.raisedById && ticketBeforeUpdate.raisedBy?.user?.id) {
        landlordUserId = ticketBeforeUpdate.raisedBy.user.id;
      } else if (ticketBeforeUpdate.raisedByTenantId && ticketBeforeUpdate.raisedByTenant?.landlord?.user?.id) {
        landlordUserId = ticketBeforeUpdate.raisedByTenant.landlord.user.id;
      }

      if (landlordUserId) {
        const eventData = {
          ticketId: updatedTicket.id,
          ticketCode: updatedTicket.ticketCode,
          status,
          ticket: updatedTicket,
          timestamp: new Date(),
        };

        // Emit to user room
        serverInstance.io.to(`user:${landlordUserId}`).emit("ticket_status_updated", eventData);

        // Also emit to ticket-specific room for real-time updates
        serverInstance.io.to(`ticket:${updatedTicket.id}`).emit("ticket_status_updated", eventData);
        serverInstance.io.to(`ticket:${updatedTicket.ticketCode}`).emit("ticket_status_updated", eventData);

        console.log(`📢 Ticket status update notification sent to landlord: ${landlordUserId} for ticket ${updatedTicket.ticketCode}`);
      }
    } catch (socketError) {
      // Log error but don't fail the status update
      console.error("Error sending Socket.IO notification for ticket status update:", socketError);
    }

    return updatedTicket;
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


  /**
   * Analyze support ticket with AI
   */
  static async analyzeTicketWithAI(ticketId: string) {
    try {
      const ticket = await prismaClient.supportTicket.findUnique({
        where: { id: ticketId },
        include: {
          messages: {
            orderBy: { createdAt: 'desc' },
            take: 10,
          },
        },
      });

      if (!ticket) {
        throw new Error('Ticket not found');
      }

      const analysis = await openRouterService.analyzeTicket({
        subject: ticket.subject,
        description: ticket.description,
        status: ticket.status,
        priority: ticket.priority,
        messages: ticket.messages,
      });

      // Optionally update ticket with AI suggestions
      await prismaClient.supportTicket.update({
        where: { id: ticketId },
        data: {
          priority: analysis.priority as any,
          // category: analysis.category,
        },
      });

      return analysis;
    } catch (error) {
      console.error('Error analyzing ticket with AI:', error);
      throw new Error('Failed to analyze ticket with AI');
    }
  }

  /**
   * Generate smart reply suggestions for ticket
   */
  /**
   * Generate smart reply suggestions for ticket
   */
  static async generateSmartRepliesForTicket(ticketId: string) {
    try {
      const ticket = await prismaClient.supportTicket.findUnique({
        where: { id: ticketId },
        include: {
          messages: {
            where: {
              isInternal: false, // ignore internal notes
            },
            orderBy: { createdAt: 'asc' },
            include: {
              sender: {
                select: {
                  role: true,
                  email: true,
                  profile: {
                    select: {
                      fullname: true,
                    },
                  },
                },
              },
            },
          },
        },
      });

      if (!ticket) {
        throw new Error('Ticket not found');
      }

      const conversationHistory = ticket.messages.map((msg) => {
        const isAdmin = msg.sender?.role?.includes('ADMIN');

        return {
          sender: isAdmin ? 'Support Agent' : 'User',
          message: msg.content,
          date: msg.createdAt,
        };
      });

      const replies = await openRouterService.generateSmartReplies({
        conversationHistory,
        context: `
        Support Ticket Context
        -----------------------
        Subject: ${ticket.subject}
        Priority: ${ticket.priority}
        Status: ${ticket.status}
        Description: ${ticket.description}
      `,
      });

      return replies;
    } catch (error) {
      console.error('Error generating smart replies for ticket:', error);
      return [];
    }
  }

  /**
   * Analyze ticket sentiment
   */
  static async analyzeTicketSentiment(ticketId: string) {
    try {
      const ticket = await prismaClient.supportTicket.findUnique({
        where: { id: ticketId },
        include: {
          messages: {
            orderBy: { createdAt: 'desc' },
            take: 1,
          },
        },
      });

      if (!ticket) {
        throw new Error('Ticket not found');
      }

      const latestMessage = ticket.messages[0]?.content || ticket.description;
      const sentiment = await openRouterService.analyzeSentiment(latestMessage);

      // If escalation is recommended, update ticket priority
      if (sentiment.escalationRecommended) {
        await prismaClient.supportTicket.update({
          where: { id: ticketId },
          data: {
            priority: 'HIGH',
          },
        });
      }

      return sentiment;
    } catch (error) {
      console.error('Error analyzing ticket sentiment:', error);
      return {
        sentiment: 'neutral' as const,
        score: 0,
        escalationRecommended: false,
      };
    }
  }
}
