import { Response } from 'express';
import { CustomRequest } from '../../utils/types';
import { asyncHandler } from '../../utils/asyncHandler';
import { ApiResponse } from '../../utils/ApiResponse';
import { ApiError } from '../../utils/ApiError';
import { CreateSupportTicketSchema } from '../../landlord/validations/schema/supportSchema';
import { SupportService } from '../../services/support.services';
import { prismaClient } from '../..';

class TenantSupportController {
  createTicket = asyncHandler(async (req: CustomRequest, res: Response) => {
    const tenantId = req.user?.tenant?.id;
    if (!tenantId) {
      throw ApiError.forbidden('Tenant context is required');
    }

    const { error, value } = CreateSupportTicketSchema.validate(req.body);
    if (error) {
      throw ApiError.badRequest(error.details[0].message);
    }

    const ticket = await SupportService.createTicket({
      tenantId,
      payload: value,
    });

    return res.status(201).json(ApiResponse.success(ticket, 'Support ticket created'));
  });

  getMyTickets = asyncHandler(async (req: CustomRequest, res: Response) => {
    const tenantId = req.user?.tenant?.id;
    if (!tenantId) {
      throw ApiError.forbidden('Tenant context is required');
    }

    const tickets = await prismaClient.supportTicket.findMany({
      where: { raisedByTenantId: tenantId },
      orderBy: { createdAt: 'desc' },
      include: {
        messages: {
          orderBy: { createdAt: 'asc' },
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
        },
      },
    });

    return res.status(200).json(ApiResponse.success(tickets, 'Support tickets retrieved'));
  });

  getTicket = asyncHandler(async (req: CustomRequest, res: Response) => {
    const tenantId = req.user?.tenant?.id;
    const { ticketId } = req.params;
    if (!tenantId) {
      throw ApiError.forbidden('Tenant context is required');
    }

    const ticket = await SupportService.getTicketById(ticketId);
    if (!ticket || ticket.raisedByTenantId !== tenantId) {
      throw ApiError.notFound('Support ticket not found');
    }

    return res.status(200).json(ApiResponse.success(ticket, 'Support ticket retrieved'));
  });

  addMessage = asyncHandler(async (req: CustomRequest, res: Response) => {
    const tenantId = req.user?.tenant?.id;
    const { ticketId } = req.params;
    const { content, attachments = [] } = req.body;

    if (!tenantId) {
      throw ApiError.forbidden('Tenant context is required');
    }
    if (!content?.trim()) {
      throw ApiError.badRequest('Message content is required');
    }

    const ticket = await SupportService.getTicketById(ticketId);
    if (!ticket || ticket.raisedByTenantId !== tenantId) {
      throw ApiError.notFound('Support ticket not found');
    }

    const message = await SupportService.addMessageToTicket(
      ticketId,
      req.user.id,
      content.trim(),
      attachments,
      false,
    );

    return res.status(201).json(ApiResponse.success(message, 'Message sent'));
  });
}

export default new TenantSupportController();
