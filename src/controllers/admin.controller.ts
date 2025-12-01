import { Response } from "express";
import { CustomRequest } from "../utils/types";
import ErrorService from "../services/error.service";
import UserServices from "../services/user.services";
import { createVerificationToken } from "../services/verification_token.service";
import { generateOtp } from "../utils/helpers";
import sendMail from "../utils/emailer";
import { userRoles, TicketStatus, TicketPriority, onlineStatus } from "@prisma/client";
import { FRONTEND_URL } from "../secrets";
import { prismaClient } from "..";
import { subDays, startOfDay, endOfDay, format } from "date-fns";
import { SupportService } from "../services/support.services";
import { logger } from "ethers";

interface InviteLandlordData {
  email: string;
  firstName?: string;
  lastName?: string;
  phoneNumber?: string;
}

class AdminController {
  /**
   * Invite landlord - Creates user without password and sends invitation email
   * User will set password when they click the invitation link
   */
  inviteLandlord = async (req: CustomRequest, res: Response) => {
    try {
      const { email, firstName, lastName, phoneNumber } = req.body as InviteLandlordData;

      if (!email) {
        return res.status(400).json({
          success: false,
          message: "Email is required"
        });
      }

      // Check if user already exists
      const existingUser = await UserServices.findUserByEmail(email);
      if (existingUser) {
        return res.status(400).json({
          success: false,
          message: "User with this email already exists"
        });
      }

      // Create user without password (password will be set via invitation link)
      const newUser = await UserServices.createLandlord({
        email: email.toLowerCase(),
        password: null,
        isVerified: false,

        profile: {
          firstName: firstName || '',
          lastName: lastName || '',
          fullname: `${firstName || ''} ${lastName || ''}`.trim() || email.split('@')[0],
          phoneNumber: phoneNumber || null,
        },

        landlord: {
          isDeleted: false,
        },
      });

      // Create invitation token
      const token = await createVerificationToken(
        { userId: newUser.id, email: email.toLowerCase() },
        generateOtp
      );

      // Generate invitation link
      const invitationLink = `${FRONTEND_URL}/set-password?token=${token}&email=${encodeURIComponent(email.toLowerCase())}`;

      // Send invitation email
      const emailHtml = `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background-color: #B80238; color: white; padding: 20px; text-align: center; border-radius: 5px 5px 0 0; }
            .content { background-color: #f9f9f9; padding: 30px; border-radius: 0 0 5px 5px; }
            .button { display: inline-block; padding: 12px 30px; background-color: #B80238; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
            .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Welcome to Asher Property Management</h1>
            </div>
            <div class="content">
              <p>Hello ${firstName || 'there'},</p>
              <p>You have been invited to join Asher Property Management System as a Landlord.</p>
              <p>Please click the button below to set your password and complete your account setup:</p>
              <div style="text-align: center;">
                <a href="${invitationLink}" class="button">Set Your Password</a>
              </div>
              <p>Or copy and paste this link into your browser:</p>
              <p style="word-break: break-all; color: #666;">${invitationLink}</p>
              <p><strong>This link will expire in 24 hours.</strong></p>
              <p>If you did not request this invitation, please ignore this email.</p>
            </div>
            <div class="footer">
              <p>© ${new Date().getFullYear()} Asher Property Management. All rights reserved.</p>
            </div>
          </div>
        </body>
        </html>
      `;

      await sendMail(email.toLowerCase(), "Welcome to Asher - Set Your Password", emailHtml);

      return res.status(201).json({
        success: true,
        message: "Landlord invitation sent successfully",
        data: {
          userId: newUser.id,
          email: newUser.email,
          invitationLink, // Return link for testing (remove in production)
        },
      });
    } catch (error: any) {
      console.error("Error inviting landlord:", error);
      ErrorService.handleError(error, res);
    }
  };

  /**
   * Set password for invited landlord (first time password setup)
   * Simple flow: validate token, update password, mark as verified
   */
  setLandlordPassword = async (req: CustomRequest, res: Response) => {
    try {
      const { token, email, newPassword } = req.body;

      if (!token || !email || !newPassword) {
        return res.status(400).json({
          success: false,
          message: "Token, email, and new password are required",
        });
      }

      // Validate password strength
      if (newPassword.length < 8) {
        return res.status(400).json({
          success: false,
          message: "Password must be at least 8 characters long",
        });
      }

      // Find user by email
      const user = await UserServices.findUserByEmail(email.toLowerCase());
      if (!user) {
        return res.status(404).json({
          success: false,
          message: "User not found",
        });
      }

      // Verify user is a landlord
      if (!user.role.includes(userRoles.LANDLORD)) {
        return res.status(403).json({
          success: false,
          message: "This invitation is only for landlords",
        });
      }

      // Validate token
      const { validateVerificationToken, deleteVerificationToken } = await import("../services/verification_token.service");

      let verificationToken;
      try {
        // Also try with userId for better matching
        verificationToken = await validateVerificationToken(
          token,
          {
            userId: user.id,
            email: email.toLowerCase()
          },
          false // Look for unused tokens
        );
      } catch (tokenError: any) {
        console.error("Token validation error:", tokenError);

        // Preserve the original status code if it's an ApiError
        const statusCode = tokenError.statusCode || 400;
        const errorMessage = tokenError.message ||
          tokenError.data?.errors?.[0] ||
          "Invalid or expired invitation token";

        return res.status(statusCode).json({
          success: false,
          message: errorMessage,
        });
      }

      if (!verificationToken) {
        return res.status(400).json({
          success: false,
          message: "Invalid or expired invitation token",
        });
      }

      // Simple: Just update password and mark as verified (user already exists in users table with landlord record)
      try {
        await UserServices.updateUserPassword(user.id, newPassword);
        await UserServices.updateUserVerificationStatus(user.id, true);

        // Delete used token
        await deleteVerificationToken(verificationToken.id);
      } catch (updateError: any) {
        console.error("Error updating user password or verification status:", updateError);
        throw updateError; // Re-throw to be caught by outer catch
      }

      return res.status(200).json({
        success: true,
        message: "Password set successfully. You can now login.",
        data: {
          userId: user.id,
          email: user.email,
        },
      });
    } catch (error: any) {
      console.error("Error setting landlord password:", error);
      ErrorService.handleError(error, res);
    }
  };

  /**
   * Get system-wide statistics for Rent Management System (FE)
   */
  getSystemStats = async (req: CustomRequest, res: Response) => {
    try {
      const [
        totalLandlords,
        totalTenants,
        totalProperties,
        totalTickets,
        openTickets,
        resolvedTickets,
        totalEmails,
        unreadEmails,
        totalDocuments,
        activeUsers,
      ] = await Promise.all([
        // Total landlords
        prismaClient.landlords.count({ where: { isDeleted: false } }),
        // Total tenants
        prismaClient.tenants.count({ where: { isCurrentLease: true } }),
        // Total properties
        prismaClient.properties.count({ where: { isDeleted: false } }),
        // Total tickets
        prismaClient.supportTicket.count(),
        // Open tickets
        prismaClient.supportTicket.count({ where: { status: TicketStatus.OPEN } }),
        // Resolved tickets
        prismaClient.supportTicket.count({ where: { status: TicketStatus.RESOLVED } }),
        // Total emails
        prismaClient.email.count(),
        // Unread emails
        prismaClient.email.count({ where: { isReadByReceiver: false } }),
        // Total documents
        prismaClient.propertyDocument.count(),
        // Active users (online in last 24 hours)
        prismaClient.users.count({
          where: {
            role: { has: userRoles.LANDLORD },
            onlineStatus: onlineStatus.online,
          },
        }),
      ]);

      // Calculate growth (last 7 days vs previous 7 days)
      const sevenDaysAgo = subDays(new Date(), 7);
      const fourteenDaysAgo = subDays(new Date(), 14);

      const [newUsersThisWeek, newUsersLastWeek] = await Promise.all([
        prismaClient.users.count({
          where: {
            role: { has: userRoles.LANDLORD },
            createdAt: { gte: sevenDaysAgo },
          },
        }),
        prismaClient.users.count({
          where: {
            role: { has: userRoles.LANDLORD },
            createdAt: { gte: fourteenDaysAgo, lt: sevenDaysAgo },
          },
        }),
      ]);

      const userGrowth = newUsersLastWeek > 0
        ? ((newUsersThisWeek - newUsersLastWeek) / newUsersLastWeek) * 100
        : newUsersThisWeek > 0 ? 100 : 0;

      return res.status(200).json({
        success: true,
        data: {
          totalUsers: totalLandlords,
          totalTenants,
          totalProperties,
          openTickets,
          resolvedTickets,
          totalTickets,
          totalEmails,
          unreadEmails,
          totalDocuments,
          activeUsers,
          userGrowth: Math.round(userGrowth),
        },
      });
    } catch (error: any) {
      console.error("Error getting system stats:", error);
      ErrorService.handleError(error, res);
    }
  };

  /**
   * Get activity data for charts (last 7 days)
   */
  getActivityData = async (req: CustomRequest, res: Response) => {
    try {
      const days = 7;
      const activityData = [];

      for (let i = days - 1; i >= 0; i--) {
        const date = subDays(new Date(), i);
        const dayStart = startOfDay(date);
        const dayEnd = endOfDay(date);
        const dayName = format(date, 'EEE');

        const [users, tickets] = await Promise.all([
          // Users active on this day (logged in)
          prismaClient.users.count({
            where: {
              role: { has: userRoles.LANDLORD },
              updatedAt: { gte: dayStart, lte: dayEnd },
            },
          }),
          // Tickets created on this day
          prismaClient.supportTicket.count({
            where: {
              createdAt: { gte: dayStart, lte: dayEnd },
            },
          }),
        ]);

        activityData.push({
          name: dayName,
          users,
          tickets,
        });
      }

      return res.status(200).json({
        success: true,
        data: activityData,
      });
    } catch (error: any) {
      console.error("Error getting activity data:", error);
      ErrorService.handleError(error, res);
    }
  };

  /**
   * Get system health for Rent Management System
   */
  getSystemHealth = async (req: CustomRequest, res: Response) => {
    try {
      // Calculate uptime (based on recent activity)
      const last24Hours = subDays(new Date(), 1);
      const recentActivity = await prismaClient.users.count({
        where: {
          role: { has: userRoles.LANDLORD },
          updatedAt: { gte: last24Hours },
        },
      });

      const totalLandlords = await prismaClient.landlords.count({ where: { isDeleted: false } });
      const uptime = totalLandlords > 0 ? (recentActivity / totalLandlords) * 100 : 100;

      // Get active users count
      const activeUsers = await prismaClient.users.count({
        where: {
          role: { has: userRoles.LANDLORD },
          onlineStatus: onlineStatus.online,
        },
      });

      return res.status(200).json({
        success: true,
        data: {
          name: 'Rent Mgmt System',
          type: 'Web App',
          status: uptime > 90 ? 'OPERATIONAL' : uptime > 70 ? 'DEGRADED' : 'DOWN',
          uptime: Math.min(100, Math.max(0, uptime)),
          activeUsers,
          lastCheck: 'Just now',
          version: 'v3.1.0',
        },
      });
    } catch (error: any) {
      console.error("Error getting system health:", error);
      ErrorService.handleError(error, res);
    }
  };

  /**
   * Get all landlords (users) for Rent Management System
   * Admin can see ALL landlords in the database
   */
  getAllLandlords = async (req: CustomRequest, res: Response) => {
    try {
      const { page = 1, limit = 1000, search = '' } = req.query; // Increased limit to show all
      const skip = (Number(page) - 1) * Number(limit);

      const where: any = {
        role: { has: userRoles.LANDLORD },
      };

      if (search) {
        where.OR = [
          { email: { contains: search as string, mode: 'insensitive' } },
          { profile: { firstName: { contains: search as string, mode: 'insensitive' } } },
          { profile: { lastName: { contains: search as string, mode: 'insensitive' } } },
          { profile: { fullname: { contains: search as string, mode: 'insensitive' } } },
        ];
      }

      const [users, total] = await Promise.all([
        prismaClient.users.findMany({
          where,
          skip,
          take: Number(limit),
          include: {
            profile: true,
            landlords: {
              select: {
                id: true,
                isDeleted: false,
              },
            },
          },
          orderBy: { createdAt: 'desc' },
        }),
        prismaClient.users.count({ where }),
      ]);

      // Get ticket counts for each user
      const userIds = users.map(u => u.id);
      const ticketCounts = await prismaClient.supportTicket.groupBy({
        by: ['raisedById'],
        where: {
          raisedById: { in: userIds },
        },
        _count: true,
      });

      const ticketCountMap = new Map(ticketCounts.map(t => [t.raisedById, t._count]));

      return res.status(200).json({
        success: true,
        data: users.map(user => ({
          id: user.id,
          name: user.profile?.fullname ||
            (user.profile?.firstName && user.profile?.lastName
              ? `${user.profile.firstName} ${user.profile.lastName}`.trim()
              : user.profile?.firstName || user.email.split('@')[0]),
          email: user.email,
          role: 'Landlord',
          systemId: '4', // Rent Mgmt System
          status: user.isVerified ? 'Active' : 'Pending',
          lastActive: user.onlineStatus === onlineStatus.online ? 'Online' : 'Offline',
          ticketsRaised: ticketCountMap.get(user.id) || 0,
          phone: user.profile?.phoneNumber || '',
          createdAt: user.createdAt,
        })),
        total,
        page: Number(page),
        limit: Number(limit),
      });
    } catch (error: any) {
      console.error("Error getting all landlords:", error);
      ErrorService.handleError(error, res);
    }
  };

  /**
   * Get all admin users for chat selection (public endpoint for landlords)
   * Returns all admin users with their online status
   */
  getAllAdminUsers = async (req: CustomRequest, res: Response) => {
    try {
      const users = await prismaClient.users.findMany({
        where: {
          role: { has: userRoles.ADMIN },
        },
        include: {
          profile: true,
        },
        orderBy: { createdAt: 'desc' },
      });

      return res.status(200).json({
        success: true,
        data: users.map(user => ({
          id: user.id,
          userId: user.id, // For chat compatibility
          name: user.profile?.fullname ||
            (user.profile?.firstName && user.profile?.lastName
              ? `${user.profile.firstName} ${user.profile.lastName}`.trim()
              : user.profile?.firstName || user.email.split('@')[0]),
          email: user.email,
          role: 'Admin Support',
          status: user.onlineStatus === onlineStatus.online ? 'online' :
            user.onlineStatus === onlineStatus.offline ? 'away' :
              user.onlineStatus === onlineStatus.offline ? 'busy' : 'offline',
          avatar: user.profile?.profileUrl,
          lastSeen: user.onlineStatus !== onlineStatus.online
            ? 'Recently'
            : undefined,
          profile: {
            fullname: user.profile?.fullname,
            firstName: user.profile?.firstName,
            lastName: user.profile?.lastName,
            profileUrl: user.profile?.profileUrl,
            phoneNumber: user.profile?.phoneNumber,
          },
        })),
      });
    } catch (error: any) {
      console.error("Error getting all admin users:", error);
      ErrorService.handleError(error, res);
    }
  };

  /**
   * Get ALL emails in the system (admin view - see everything)
   */
  getAllEmails = async (req: CustomRequest, res: Response) => {
    try {
      const { page = 1, limit = 100, search = '' } = req.query;
      const skip = (Number(page) - 1) * Number(limit);

      const where: any = {
        isDeleted: false,
      };

      if (search) {
        where.OR = [
          { subject: { contains: search as string, mode: 'insensitive' } },
          { body: { contains: search as string, mode: 'insensitive' } },
          { senderEmail: { contains: search as string, mode: 'insensitive' } },
          { receiverEmail: { contains: search as string, mode: 'insensitive' } },
        ];
      }

      const [emails, total] = await Promise.all([
        prismaClient.email.findMany({
          where,
          skip,
          take: Number(limit),
          include: {
            sender: {
              select: {
                id: true,
                email: true,
                profile: true,
              },
            },
            receiver: {
              select: {
                id: true,
                email: true,
                profile: true,
              },
            },
          },
          orderBy: { createdAt: 'desc' },
        }),
        prismaClient.email.count({ where }),
      ]);

      return res.status(200).json({
        success: true,
        data: emails,
        total,
        page: Number(page),
        limit: Number(limit),
      });
    } catch (error: any) {
      console.error("Error getting all emails:", error);
      ErrorService.handleError(error, res);
    }
  };

  /**
   * Get ALL chat rooms in the system (admin view - see everything)
   */
  getAllChatRooms = async (req: CustomRequest, res: Response) => {
    try {
      const chatRooms = await prismaClient.chatRoom.findMany({
        include: {
          user1: {
            select: {
              id: true,
              email: true,
              profile: {
                select: {
                  firstName: true,
                  lastName: true,
                  fullname: true,
                },
              },
            },
          },
          user2: {
            select: {
              id: true,
              email: true,
              profile: {
                select: {
                  firstName: true,
                  lastName: true,
                  fullname: true,
                },
              },
            },
          },
          messages: {
            take: 1,
            orderBy: { createdAt: 'desc' },
            include: {
              sender: {
                select: {
                  id: true,
                  email: true,
                  profile: {
                    select: {
                      firstName: true,
                      lastName: true,
                      fullname: true,
                    },
                  },
                },
              },
              receiver: {
                select: {
                  id: true,
                  email: true,
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
          },
        },
        orderBy: { updatedAt: 'desc' },
      });

      return res.status(200).json({
        success: true,
        data: chatRooms,
        total: chatRooms.length,
      });
    } catch (error: any) {
      console.error("Error getting all chat rooms:", error);
      ErrorService.handleError(error, res);
    }
  };

  /**
   * Get messages for a specific chat room (admin view)
   */
  getChatRoomMessages = async (req: CustomRequest, res: Response) => {
    try {
      const { chatRoomId } = req.params;

      const messages = await prismaClient.message.findMany({
        where: {
          chatRoomId: chatRoomId,
        },
        orderBy: {
          createdAt: 'asc',
        },
        include: {
          sender: {
            select: {
              id: true,
              email: true,
              profile: {
                select: {
                  firstName: true,
                  lastName: true,
                  fullname: true,
                },
              },
            },
          },
          receiver: {
            select: {
              id: true,
              email: true,
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

      return res.status(200).json({
        success: true,
        data: messages,
        total: messages.length,
      });
    } catch (error: any) {
      console.error("Error getting chat room messages:", error);
      ErrorService.handleError(error, res);
    }
  };

  /**
   * Get all support tickets (admin view)
   */
  getAllTickets = async (req: CustomRequest, res: Response) => {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 50;
      const search = req.query.search?.toString() || "";

      const result = await SupportService.getAllTicketsForAdmin(page, limit, search);

      return res.status(200).json({
        success: true,
        ...result,
      });
    } catch (error: any) {
      console.error("Error getting all tickets:", error);
      ErrorService.handleError(error, res);
    }
  };

  /**
   * Get ticket by ID (admin view)
   */
  getTicketById = async (req: CustomRequest, res: Response) => {
    try {
      const { ticketId } = req.params;
      const ticket = await SupportService.getTicketById(ticketId);

      if (!ticket) {
        return res.status(404).json({
          success: false,
          message: "Ticket not found",
        });
      }

      return res.status(200).json({
        success: true,
        data: ticket,
      });
    } catch (error: any) {
      console.error("Error getting ticket by ID:", error);
      ErrorService.handleError(error, res);
    }
  };

  /**
   * Get tickets by user ID (admin view - for viewing a specific user's tickets)
   */
  getTicketsByUserId = async (req: CustomRequest, res: Response) => {
    try {
      const { userId } = req.params;
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 100;
      const search = req.query.search?.toString() || "";

      const result = await SupportService.getTicketsByUserId(userId, page, limit, search);

      return res.status(200).json({
        success: true,
        ...result,
      });
    } catch (error: any) {
      console.error("Error getting tickets by user ID:", error);
      ErrorService.handleError(error, res);
    }
  };

  /**
   * Update ticket status (admin)
   */
  updateTicketStatus = async (req: CustomRequest, res: Response) => {
    try {
      const { ticketId } = req.params;
      const { status } = req.body;

      console.log(`🔄 Admin updating ticket ${ticketId} status to: ${status}`);

      if (!status || !Object.values(TicketStatus).includes(status)) {
        return res.status(400).json({
          success: false,
          message: "Valid status is required",
        });
      }

      const updatedTicket = await SupportService.updateTicketStatus(ticketId, status);

      console.log(`✅ Ticket status updated successfully. New status: ${updatedTicket.status}`);

      return res.status(200).json({
        success: true,
        data: updatedTicket,
        message: "Ticket status updated successfully",
      });
    } catch (error: any) {
      console.error("Error updating ticket status:", error);
      ErrorService.handleError(error, res);
    }
  };

  /**
   * Assign ticket to support user (admin)
   */
  assignTicket = async (req: CustomRequest, res: Response) => {
    try {
      const { ticketId } = req.params;
      const { assignedToId } = req.body;

      if (!assignedToId) {
        return res.status(400).json({
          success: false,
          message: "assignedToId is required",
        });
      }

      // Verify the user exists
      const user = await UserServices.findAUserById(assignedToId);
      if (!user) {
        return res.status(404).json({
          success: false,
          message: "User not found",
        });
      }

      const ticket = await prismaClient.supportTicket.update({
        where: { id: ticketId },
        data: { assignedToId },
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
        },
      });

      return res.status(200).json({
        success: true,
        data: ticket,
        message: "Ticket assigned successfully",
      });
    } catch (error: any) {
      console.error("Error assigning ticket:", error);
      ErrorService.handleError(error, res);
    }
  };

  /**
   * Update ticket (admin)
   */
  updateTicket = async (req: CustomRequest, res: Response) => {
    try {
      const { ticketId } = req.params;
      const updateData = req.body;

      // Remove fields that shouldn't be updated directly
      delete updateData.id;
      delete updateData.createdAt;
      delete updateData.updatedAt;

      const ticket = await prismaClient.supportTicket.update({
        where: { id: ticketId },
        data: updateData,
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
        },
      });

      return res.status(200).json({
        success: true,
        data: ticket,
        message: "Ticket updated successfully",
      });
    } catch (error: any) {
      console.error("Error updating ticket:", error);
      ErrorService.handleError(error, res);
    }
  };

  /**
   * Add message to ticket (admin)
   */
  addMessageToTicket = async (req: CustomRequest, res: Response) => {
    try {
      const { ticketId } = req.params;
      const { content, attachments = [], isInternal = false } = req.body;

      if (!content || !content.trim()) {
        return res.status(400).json({
          success: false,
          message: "Message content is required",
        });
      }

      const senderId = req.user.id;
      const message = await SupportService.addMessageToTicket(
        ticketId,
        senderId,
        content.trim(),
        attachments,
        isInternal
      );

      // Get updated ticket with all messages
      const updatedTicket = await SupportService.getTicketById(ticketId);

      return res.status(201).json({
        success: true,
        data: message,
        ticket: updatedTicket,
        message: "Message added successfully",
      });
    } catch (error: any) {
      console.error("Error adding message to ticket:", error);
      ErrorService.handleError(error, res);
    }
  };

  /**
   * Create ticket (admin can create tickets on behalf of users)
   */
  createTicket = async (req: CustomRequest, res: Response) => {
    try {
      const { subject, description, type, priority, raisedById, raisedByTenantId, raisedByUserId, assignedToId } = req.body;

      if (!subject || !description || !type) {
        return res.status(400).json({
          success: false,
          message: "Subject, description, and type are required",
        });
      }

      // If raisedByUserId is provided, find the landlordId from userId
      let landlordId = raisedById || null;
      if (raisedByUserId && !landlordId) {
        const landlord = await prismaClient.landlords.findFirst({
          where: { userId: raisedByUserId },
          select: { id: true },
        });
        if (landlord) {
          landlordId = landlord.id;
        }
      }

      // Validate that either landlordId or raisedByTenantId is provided
      if (!landlordId && !raisedByTenantId) {
        return res.status(400).json({
          success: false,
          message: "Either raisedById (landlordId), raisedByUserId (userId), or raisedByTenantId must be provided",
        });
      }

      const ticket = await SupportService.createTicket({
        landlordId: landlordId || null,
        tenantId: raisedByTenantId || null,
        payload: {
          subject,
          description,
          type,
          priority: priority || TicketPriority.MEDIUM,
          attachments: req.body.attachments || [],
        },
      });

      // If assignedToId is provided, assign the ticket
      if (assignedToId) {
        await prismaClient.supportTicket.update({
          where: { id: ticket.id },
          data: { assignedToId },
        });
      }

      // Fetch the complete ticket with relations
      const completeTicket = await SupportService.getTicketById(ticket.id);

      return res.status(201).json({
        success: true,
        data: completeTicket,
        message: "Ticket created successfully",
      });
    } catch (error: any) {
      console.error("Error creating ticket:", error);
      ErrorService.handleError(error, res);
    }
  };

  /**
   * Create document for admin (no landlord role required)
   */
  createDocument = async (req: CustomRequest, res: Response) => {
    try {
      console.log('📄 Creating document - Request received');
      console.log('📄 Request body:', JSON.stringify(req.body, null, 2));
      console.log('📄 Request files:', req.files ? 'Files present' : 'No files');

      const userId = req.user.id;
      console.log('📄 User ID:', userId);

      // Handle different file upload formats
      // Multer puts files in req.files when using upload.array()
      let files: Express.Multer.File[] = [];

      // Check req.files (from multer)
      if ((req as any).files && Array.isArray((req as any).files)) {
        files = (req as any).files;
      } else if (req.files) {
        if (Array.isArray(req.files)) {
          files = req.files;
        } else if (typeof req.files === 'object') {
          files = Object.values(req.files).flat();
        }
      }

      console.log('📄 Files found:', files.length);

      if (!files?.length) {
        console.error('❌ No files provided');
        return res.status(400).json({
          success: false,
          error: "No files provided. Please select a file to upload."
        });
      }

      // Normalize metadata
      const documentNames = Array.isArray(req.body.documentName)
        ? req.body.documentName : [req.body.documentName];
      const docTypes = Array.isArray(req.body.docType)
        ? req.body.docType : [req.body.docType];
      const systemIds = Array.isArray(req.body.systemId)
        ? req.body.systemId : [req.body.systemId];
      const isPublished = req.body.isPublished === 'true' || req.body.isPublished === true;

      console.log('📄 Document names:', documentNames);
      console.log('📄 Doc types:', docTypes);
      console.log('📄 System IDs:', systemIds);
      console.log('📄 Is published:', isPublished);

      // Validate metadata length
      if (documentNames.length !== files.length || docTypes.length !== files.length) {
        console.error('❌ Metadata length mismatch:', {
          documentNames: documentNames.length,
          docTypes: docTypes.length,
          files: files.length
        });
        return res.status(400).json({
          success: false,
          error: "documentName/docType length must match files count"
        });
      }

      let uploadDocsCloudinary;
      let documentUploadSchema;

      try {
        const multerCloudinary = require('../middlewares/multerCloudinary');
        uploadDocsCloudinary = multerCloudinary.uploadDocsCloudinary;
        console.log('✅ uploadDocsCloudinary loaded');
      } catch (err: any) {
        console.error('❌ Error loading uploadDocsCloudinary:', err);
        throw new Error(`Failed to load Cloudinary upload function: ${err.message}`);
      }

      try {
        const propertiesSchema = require('../validations/schemas/properties.schema');
        documentUploadSchema = propertiesSchema.documentUploadSchema;
        console.log('✅ documentUploadSchema loaded');
      } catch (err: any) {
        console.error('❌ Error loading documentUploadSchema:', err);
        throw new Error(`Failed to load validation schema: ${err.message}`);
      }

      const results = await Promise.allSettled(
        files.map(async (file, index) => {
          try {
            console.log(`📄 Processing file ${index + 1}/${files.length}: ${file.originalname}`);

            const documentData = {
              documentName: documentNames[index],
              type: file.mimetype || 'application/octet-stream',
              size: String(file.size || '0'),
              docType: docTypes[index] || 'OTHER',
              propertyId: undefined // Admin documents don't have propertyId
            };

            console.log(`📄 Document data for file ${index + 1}:`, documentData);

            // Validate with actual data (propertyId is optional for admin documents)
            const { error } = documentUploadSchema.validate(documentData, {
              allowUnknown: true,
              stripUnknown: false
            });
            if (error) {
              console.error(`❌ Validation error for file ${index + 1}:`, error.message);
              console.error(`❌ Validation error details:`, error.details);
              throw new Error(`Document ${index + 1}: ${error.message}`);
            }

            console.log(`📄 Uploading file ${index + 1} to Cloudinary...`);
            const uploadResult: any = await uploadDocsCloudinary(file);
            console.log(`📄 Cloudinary upload result for file ${index + 1}:`, {
              hasSecureUrl: !!uploadResult?.secure_url,
              publicId: uploadResult?.public_id
            });

            if (!uploadResult?.secure_url) {
              console.error(`❌ Upload failed for file ${index + 1}: No secure_url returned`);
              throw new Error("Upload failed: No secure URL returned from Cloudinary");
            }

            console.log(`📄 Creating database record for file ${index + 1}...`);
            const createdDoc = await prismaClient.propertyDocument.create({
              data: {
                documentName: documentNames[index],
                documentUrl: [uploadResult.secure_url],
                type: documentData.type,
                size: documentData.size,
                docType: documentData.docType as any,
                // systemId: systemIds[index] || null,
                isPublished: isPublished,
                users: {
                  connect: {
                    id: userId
                  }
                }
              }
            });

            console.log(`✅ Successfully created document ${index + 1}:`, createdDoc.id);
            return createdDoc;
          } catch (err: any) {
            console.error(`❌ Error processing file ${index + 1} (${file.originalname}):`, err);
            console.error('Error stack:', err.stack);
            return {
              error: err.message,
              file: file.originalname,
              stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
            };
          }
        })
      );

      const successful = results.filter(r => r.status === 'fulfilled' && !r.value);
      const failed = results.filter(r => r.status === 'rejected' || r.value);

      console.log('📄 Upload results:', {
        total: results.length,
        successful: successful.length,
        failed: failed.length,
        failedDetails: failed.map(r => ({
          status: r.status,
          error: r.status === 'fulfilled' ? r.value : r.reason?.message,
          file: r.status === 'fulfilled' ? r.value : 'unknown'
        }))
      });

      // If all failed, return error
      if (successful.length === 0 && failed.length > 0) {
        const firstError = failed[0];
        const errorMessage = firstError.status === 'fulfilled'
          ? firstError.value
          : firstError.reason?.message || 'Failed to create documents';

        console.error('❌ All document uploads failed');
        return res.status(500).json({
          success: false,
          error: errorMessage,
          details: process.env.NODE_ENV === 'development' ? failed : undefined
        });
      }

      return res.status(201).json({
        success: true,
        message: `${successful.length} document(s) created successfully${failed.length > 0 ? `, ${failed.length} failed` : ''}`,
        data: successful.map(r => r.status === 'fulfilled' ? r.value : r),
        errors: failed.length > 0 ? failed.map(r => ({
          error: r.status === 'fulfilled' ? r.value : r.reason?.message,
          file: r.status === 'fulfilled' ? r.value : 'unknown',
        })) : undefined
      });
    } catch (error: any) {
      console.error("❌ Critical error in createDocument:", error);
      console.error("❌ Error stack:", error.stack);
      console.error("❌ Error details:", {
        message: error.message,
        code: error.code,
        name: error.name,
        meta: error.meta,
        response: error.response?.data
      });
      console.error("❌ Request body:", JSON.stringify(req.body, null, 2));
      console.error("❌ Request files:", req.files ? 'Files present' : 'No files');
      if (req.files) {
        console.error("❌ Files details:", Array.isArray(req.files)
          ? req.files.map((f: any) => ({ name: f.originalname, size: f.size, mimetype: f.mimetype }))
          : Object.keys(req.files)
        );
      }
      console.error("❌ User ID:", req.user?.id);

      // Return a more detailed error response
      const errorMessage = error.message || 'An unexpected error occurred while creating the document';
      const statusCode = error.statusCode || error.status || 500;

      return res.status(statusCode).json({
        success: false,
        error: errorMessage,
        details: process.env.NODE_ENV === 'development' ? {
          message: error.message,
          stack: error.stack,
          code: error.code,
          name: error.name
        } : undefined
      });
    }
  };

  /**
   * Create rich text document (no file upload)
   * Saves HTML content directly to database or as HTML file
   */
  createRichTextDocument = async (req: CustomRequest, res: Response) => {
    try {
      console.log('📝 Creating rich text document - Request received');
      console.log('📝 Request body:', JSON.stringify(req.body, null, 2));

      const userId = req.user.id;
      const { documentName, content, docType, systemId, isPublished } = req.body;

      // Validation
      if (!documentName || !documentName.trim()) {
        return res.status(400).json({
          success: false,
          error: "Document name is required"
        });
      }

      if (!content || !content.trim()) {
        return res.status(400).json({
          success: false,
          error: "Content is required"
        });
      }

      console.log('📝 Document name:', documentName);
      console.log('📝 Content length:', content.length);
      console.log('📝 Doc type:', docType);
      console.log('📝 System ID:', systemId);
      console.log('📝 Is published:', isPublished);

      // Upload HTML content to Cloudinary as raw HTML file
      let uploadDocsCloudinary;
      try {
        const multerCloudinary = require('../middlewares/multerCloudinary');
        uploadDocsCloudinary = multerCloudinary.uploadDocsCloudinary;
        console.log('✅ uploadDocsCloudinary loaded');
      } catch (err: any) {
        console.error('❌ Error loading uploadDocsCloudinary:', err);
        throw new Error(`Failed to load Cloudinary upload function: ${err.message}`);
      }

      // Convert HTML content to a buffer that can be uploaded
      const htmlBuffer = Buffer.from(content, 'utf-8');
      const fileName = `${documentName.replace(/[^a-z0-9]/gi, '_')}_${Date.now()}.html`;

      // Create a mock file object that Cloudinary can handle
      const mockFile = {
        buffer: htmlBuffer,
        originalname: fileName,
        mimetype: 'text/html',
        size: htmlBuffer.length
      };

      console.log('📝 Uploading HTML content to Cloudinary...');
      const uploadResult: any = await uploadDocsCloudinary(mockFile);
      console.log('📝 Cloudinary upload result:', {
        hasSecureUrl: !!uploadResult?.secure_url,
        publicId: uploadResult?.public_id
      });

      if (!uploadResult?.secure_url) {
        console.error('❌ Upload failed: No secure_url returned');
        throw new Error("Upload failed: No secure URL returned from Cloudinary");
      }

      // Create database record
      logger.info('Creating database record...');
      const createdDoc = await prismaClient.propertyDocument.create({
        data: {
          documentName: documentName.trim(),
          documentUrl: [uploadResult.secure_url],
          type: 'text/html',
          size: String(htmlBuffer.length),
          docType: docType || 'OTHER',
          systemId: systemId || null,
          isPublished: isPublished === true || isPublished === 'true',
          users: {
            connect: {
              id: userId
            }
          }
        }
      });

      console.log('✅ Successfully created rich text document:', createdDoc.id);

      return res.status(201).json({
        success: true,
        message: "Rich text document created successfully",
        data: createdDoc
      });
    } catch (error: any) {
      console.error("Error creating rich text document:", error);
      console.error("Error stack:", error.stack);
      ErrorService.handleError(error, res);
    }
  };

  /**
   * Get published documents (public endpoint - for frontend consumption)
   * Only returns published documents, filtered by systemId
   */
  getPublishedDocuments = async (req: CustomRequest, res: Response) => {
    try {
      const { systemId, search } = req.query;

      // Build where clause - only published documents
      const where: any = {
        isPublished: true, // Only published documents
      };

      // Only filter by systemId if it's provided
      if (systemId && systemId !== 'undefined' && systemId !== 'null') {
        where.systemId = systemId as string;
      }

      // Search filter
      if (search && search !== 'undefined' && search !== 'null') {
        where.OR = [
          { documentName: { contains: search as string, mode: 'insensitive' } },
          { docType: { contains: search as string, mode: 'insensitive' } },
        ];
      }

      // Get documents - simplified query (no user relation needed for public endpoint)
      let documents;
      try {
        documents = await prismaClient.propertyDocument.findMany({
          where,
          orderBy: { createdAt: 'desc' },
        });
      } catch (error: any) {
        console.error("❌ Error fetching published documents:", error);
        console.error("Error details:", {
          code: error.code,
          meta: error.meta,
          message: error.message,
          stack: error.stack
        });

        // Check if it's a schema issue
        if (error.code === 'P2021' || error.message?.includes('does not exist') ||
          error.message?.includes('column') || error.message?.includes('table')) {
          return res.status(500).json({
            success: false,
            message: "Database schema error: Required columns or tables are missing. Please run database migrations.",
            error: process.env.NODE_ENV === 'development' ? error.message : undefined,
            data: []
          });
        }

        return res.status(500).json({
          success: false,
          message: "Database error: Unable to fetch documents. Please check database schema and migrations.",
          error: process.env.NODE_ENV === 'development' ? error.message : undefined,
          data: []
        });
      }

      return res.status(200).json({
        success: true,
        data: documents,
        total: documents.length,
      });
    } catch (error: any) {
      console.error("Error getting published documents:", error);
      console.error("Error details:", {
        message: error.message,
        code: error.code,
        meta: error.meta,
        stack: error.stack
      });
      ErrorService.handleError(error, res);
    }
  };

  /**
   * Get all documents (admin view - all documents in system)
   */
  getAllDocuments = async (req: CustomRequest, res: Response) => {
    try {
      const { systemId, isPublished, search } = req.query;

      // Build where clause - only include fields that exist
      const where: any = {};

      // Only filter by systemId if it's provided and column exists
      if (systemId && systemId !== 'undefined' && systemId !== 'null') {
        where.systemId = systemId as string;
      }

      // Only filter by isPublished if it's provided and column exists
      if (isPublished !== undefined && isPublished !== 'undefined' && isPublished !== 'null') {
        where.isPublished = isPublished === 'true' || Boolean(isPublished) === true;
      }

      // Search filter
      if (search && search !== 'undefined' && search !== 'null') {
        where.OR = [
          { documentName: { contains: search as string, mode: 'insensitive' } },
          { docType: { contains: search as string, mode: 'insensitive' } },
        ];
      }

      // Get documents - simplified query to avoid relation issues
      let documents;
      try {
        // First try with full relation
        documents = await prismaClient.propertyDocument.findMany({
          where,
          orderBy: { createdAt: 'desc' },
          include: {
            users: {
              select: {
                id: true,
                email: true,
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
      } catch (relationError: any) {
        console.warn("⚠️ Error including users relation, fetching without relation:", relationError.message);
        console.warn("Relation error details:", {
          code: relationError.code,
          meta: relationError.meta,
          message: relationError.message
        });

        // Fallback: fetch without user relation
        try {
          documents = await prismaClient.propertyDocument.findMany({
            where,
            orderBy: { createdAt: 'desc' },
          });
          // Add null users to maintain consistent structure
          documents = documents.map((doc: any) => ({ ...doc, users: null }));
        } catch (fallbackError: any) {
          console.error("❌ Even fallback query failed:", fallbackError);
          console.error("Fallback error details:", {
            code: fallbackError.code,
            meta: fallbackError.meta,
            message: fallbackError.message,
            stack: fallbackError.stack
          });

          // Check if it's a schema issue (missing columns)
          if (fallbackError.code === 'P2021' || fallbackError.message?.includes('does not exist') ||
            fallbackError.message?.includes('column') || fallbackError.message?.includes('table')) {
            return res.status(500).json({
              success: false,
              message: "Database schema error: Required columns or tables are missing. Please run database migrations.",
              error: process.env.NODE_ENV === 'development' ? fallbackError.message : undefined,
              data: []
            });
          }

          // Last resort: return empty array with error message
          return res.status(500).json({
            success: false,
            message: "Database error: Unable to fetch documents. Please check database schema and migrations.",
            error: process.env.NODE_ENV === 'development' ? fallbackError.message : undefined,
            data: []
          });
        }
      }

      return res.status(200).json({
        success: true,
        data: documents,
        total: documents.length,
      });
    } catch (error: any) {
      console.error("❌ Error getting all documents:", error);
      console.error("Error details:", {
        message: error.message,
        code: error.code,
        meta: error.meta,
        stack: error.stack
      });
      ErrorService.handleError(error, res);
    }
  };

  /**
   * Update document publish status
   */
  updateDocumentStatus = async (req: CustomRequest, res: Response) => {
    try {
      const { documentId } = req.params;
      const { isPublished, systemId } = req.body;

      const updateData: any = {};
      if (isPublished !== undefined) updateData.isPublished = isPublished;
      if (systemId !== undefined) updateData.systemId = systemId;

      const document = await prismaClient.propertyDocument.update({
        where: { id: documentId },
        data: updateData
      });

      return res.status(200).json({
        success: true,
        data: document
      });
    } catch (error: any) {
      console.error("Error updating document status:", error);
      ErrorService.handleError(error, res);
    }
  };

  /**
   * Track document view
   */
  trackDocumentView = async (req: CustomRequest, res: Response) => {
    try {
      const { documentId } = req.params;

      await prismaClient.propertyDocument.update({
        where: { id: documentId },
        data: { views: { increment: 1 } }
      });

      return res.status(200).json({
        success: true,
        message: "Document view tracked"
      });
    } catch (error: any) {
      console.error("Error tracking document view:", error);
      ErrorService.handleError(error, res);
    }
  };

  /**
   * Test email configuration - Send a test email to verify SMTP settings
   * POST /api/admin/test-email
   * Body: { to: string, subject?: string }
   */
  testEmail = async (req: CustomRequest, res: Response) => {
    try {
      const { to, subject } = req.body;

      if (!to) {
        return res.status(400).json({
          success: false,
          message: "Recipient email address is required",
        });
      }

      // Validate email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(to)) {
        return res.status(400).json({
          success: false,
          message: "Invalid email address format",
        });
      }

      const testSubject = subject || "Test Email from Asher Admin";
      const testHtml = `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background-color: #B80238; color: white; padding: 20px; text-align: center; border-radius: 5px 5px 0 0; }
            .content { background-color: #f9f9f9; padding: 30px; border-radius: 0 0 5px 5px; }
            .success { color: #28a745; font-weight: bold; }
            .info { background-color: #e7f3ff; padding: 15px; border-left: 4px solid #2196F3; margin: 20px 0; }
            .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>✅ Email Test Successful!</h1>
            </div>
            <div class="content">
              <p class="success">Your Hostinger email configuration is working correctly!</p>
              
              <div class="info">
                <p><strong>Test Details:</strong></p>
                <ul>
                  <li>Sent from: Asher Admin Email System</li>
                  <li>Recipient: ${to}</li>
                  <li>Time: ${new Date().toLocaleString()}</li>
                  <li>SMTP Server: ${process.env.MAIL_HOST || 'smtp.hostinger.com'}</li>
                </ul>
              </div>
              
              <p>If you received this email, it means:</p>
              <ul>
                <li>✅ SMTP connection is working</li>
                <li>✅ Authentication is successful</li>
                <li>✅ Email delivery is functioning</li>
              </ul>
              
              <p>You can now use the Email System in your Asher Admin panel to send emails to users.</p>
            </div>
            <div class="footer">
              <p>This is an automated test email from Asher Property Management System</p>
            </div>
          </div>
        </body>
        </html>
      `;

      console.log(`📧 Sending test email to: ${to}`);
      console.log(`📧 Using SMTP: ${process.env.MAIL_HOST || 'smtp.hostinger.com'}:${process.env.MAIL_PORT || 587}`);
      console.log(`📧 From email: ${process.env.MAIL_USERNAME || process.env.FROM_EMAIL || 'Not set'}`);

      // Send the test email
      const emailResult = await sendMail(to, testSubject, testHtml);
      console.log('✅ Email sent successfully:', emailResult);

      return res.status(200).json({
        success: true,
        message: "Test email sent successfully! Please check your inbox (and spam folder).",
        data: {
          to,
          subject: testSubject,
          sentAt: new Date().toISOString(),
          smtpHost: process.env.MAIL_HOST || 'smtp.hostinger.com',
          smtpPort: process.env.MAIL_PORT || 587,
        },
      });
    } catch (error: any) {
      console.error("Error sending test email:", error);
      console.error("Error details:", {
        message: error.message,
        code: error.code,
        command: error.command,
        response: error.response,
      });

      // Provide helpful error messages
      let errorMessage = "Failed to send test email";
      if (error.code === "EAUTH") {
        errorMessage = "Authentication failed. Please check your email and password in .env file.";
      } else if (error.code === "ECONNECTION" || error.code === "ETIMEDOUT") {
        errorMessage = "Connection failed. Please check your SMTP host and port settings.";
      } else if (error.message?.includes("Invalid login")) {
        errorMessage = "Invalid email credentials. Please verify your MAIL_USERNAME and MAIL_PASSWORD.";
      } else if (error.message) {
        errorMessage = error.message;
      }

      return res.status(500).json({
        success: false,
        message: errorMessage,
        error: process.env.NODE_ENV === 'development' ? error.message : undefined,
      });
    }
  };
}

export default new AdminController();