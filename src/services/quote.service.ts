import { maintenanceStatus, vendorAvailability } from "@prisma/client";
import { prismaClient } from "..";
import { ApiError } from '../utils/ApiError';
import ServiceServices from "../vendor/services/vendor.services";

export interface CreateQuoteInput {
  maintenanceId: string;
  vendorId: string;
  amount: number;
  description?: string;
  breakdown?: Array<{
    item: string;
    description: string;
    cost: number;
    quantity: number;
  }>;
  attachments: string[];
}

export interface UpdateQuoteInput {
  amount?: number;
  description?: string;
  breakdown?: Array<{
    item: string;
    description: string;
    cost: number;
    quantity: number;
  }>;
  attachments?: string[];
}

class QuoteService {
  // Create a new quote
  createQuote = async (input: CreateQuoteInput) => {
    const { maintenanceId, vendorId, amount, description, breakdown, attachments } = input;

    try {
      // Check if maintenance exists and is handled by landlord
      const maintenance = await prismaClient.maintenance.findUnique({
        where: { id: maintenanceId },
        include: { vendor: true }
      });

      if (!maintenance) {
        throw ApiError.notFound('Maintenance request not found');
      }

      // if (!maintenance.handleByLandlord) {
      //   throw ApiError.badRequest('This maintenance is not handled by landlord');
      // }

      if (maintenance.status !== maintenanceStatus.UNASSIGNED ) {
        throw ApiError.badRequest('maintenance assigned to a vendor already');
      }

      // Check if vendor has already submitted a quote
      const existingQuote = await prismaClient.maintenanceQuote.findUnique({
        where: {
          maintenanceId_vendorId: {
            maintenanceId,
            vendorId
          }
        }
      });

      if (existingQuote) {
        throw ApiError.badRequest('You have already submitted a quote for this maintenance');
      }

      // Create the quote
      const quote = await prismaClient.maintenanceQuote.create({
        data: {
          maintenanceId,
          vendorId,
          amount,
          description,
          breakdown: breakdown || [],
          attachments,
          status: 'PENDING'
        },
        include: {
          vendor: true,
          maintenance: {
            select: {
              id: true,
              description: true,
              status: true,
              landlordId: true,
              landlord: {
                select: { userId: true, user: { select: { id: true } } },
              },
            }
          }
        }
      });

      try {
        const landlordUserId =
          quote.maintenance?.landlord?.user?.id ||
          quote.maintenance?.landlord?.userId;
        if (landlordUserId) {
          const NotificationService = (await import('./notification.service')).default;
          await NotificationService.createNotification(
            {
              destId: landlordUserId,
              title: 'New Maintenance Quote',
              message: `A vendor submitted a quote of ${amount} for your maintenance request.`,
              notificationType: 'maintenance_new_invoice',
              route: `/service/maintenance/landlord/${maintenanceId}`,
              emitRealtime: true,
              type: 'info',
            },
            'MAINTENANCE_REQUESTS'
          );
        }
      } catch (notifyError) {
        console.error('Failed to notify landlord of new quote:', notifyError);
      }

      return quote;
    } catch (error) {
      console.error('Error creating quote:', error);
      throw error;
    }
  }



  // Get quotes for a maintenance
  async getMaintenanceQuotes(maintenanceId: string) {
    const quotes = await prismaClient.maintenanceQuote.findMany({
      where: {
        maintenanceId,
        isDeleted: false
      },
      include: {
        vendor:true
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    return quotes;
  }

  // Get vendor's quotes
  async getVendorQuotes(vendorId: string) {
    const quotes = await prismaClient.maintenanceQuote.findMany({
      where: {
        vendorId,
        isDeleted: false
      },
      include: {
        maintenance: {
          select: {
            id: true,
            description: true,
            status: true,
            handleByLandlord: true,
            property: {
              select: {
                name: true,
                address: true
              }
            },
            tenant: {
              select: {
                user: {
                  select: {
                    email: true,
                    profile: {
                      select:{
                        firstName: true,
                        lastName: true
                      }
                    }
                  }
                }
              }
            }
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    return quotes;
  }

  // Update a quote
  async updateQuote(quoteId: string, vendorId: string, input: UpdateQuoteInput) {
    const quote = await prismaClient.maintenanceQuote.findFirst({
      where: {
        id: quoteId,
        vendorId,
        isDeleted: false
      }
    });

    if (!quote) {
      throw ApiError.notFound('Quote not found');
    }

    if (quote.status !== 'PENDING') {
      throw ApiError.badRequest('Cannot update a quote that is not pending');
    }

    const updatedQuote = await prismaClient.maintenanceQuote.update({
      where: { id: quoteId },
      data: input,
      include: {
        vendor: true
      }
    });

    return updatedQuote;
  }

  // Delete a quote (soft delete)
  async deleteQuote(quoteId: string, vendorId: string) {
    const quote = await prismaClient.maintenanceQuote.findFirst({
      where: {
        id: quoteId,
        vendorId,
        isDeleted: false
      }
    });

    if (!quote) {
      throw ApiError.notFound('Quote not found');
    }

    if (quote.status !== 'PENDING') {
      throw ApiError.badRequest('Cannot delete a quote that is not pending');
    }

    await prismaClient.maintenanceQuote.update({
      where: { id: quoteId },
      data: { isDeleted: true }
    });

    return { message: 'Quote deleted successfully' };
  }

  // Landlord accepts a quote
  async acceptQuote(quoteId: string, landlordId: string) {
    const quote = await prismaClient.maintenanceQuote.findFirst({
      where: {
        id: quoteId,
        isDeleted: false,
        status: 'PENDING'
      },
      include: {
        maintenance: true
      }
    });

    if (!quote) {
      throw ApiError.notFound('Quote not found');
    }

    // Verify landlord owns the property
    const maintenance = await prismaClient.maintenance.findFirst({
      where: {
        id: quote.maintenanceId,
        property: {
          landlordId
        }
      }
    });

    if (!maintenance) {
      throw ApiError.unauthorized('You are not authorized to accept quotes for this maintenance');
    }

    // Courtesy pre-check so the landlord doesn't pick a vendor who can't
    // take the job. The authoritative cap check re-runs when the vendor
    // confirms (respondToAcceptedQuote), since capacity can change between
    // the two consents.
    const vendorService = await ServiceServices.getSpecificVendorService(quote.vendorId, maintenance.categoryId);
    if (!vendorService) {
      throw ApiError.badRequest('Vendor is no longer subscribed to this service category');
    }
    if (vendorService.availability === vendorAvailability.NO) {
      throw ApiError.badRequest('Vendor is not available');
    }
    if (vendorService.currentJobs >= 2) {
      throw ApiError.badRequest('Vendor has reached the maximum number of active jobs');
    }

    // Second vendor consent gate (Part 16 of VENDOR_APP_FLOW_SPEC.md):
    // landlord acceptance no longer assigns the job. The quote is marked
    // ACCEPTED awaiting the vendor's explicit confirm/decline; assignment,
    // job-count increment, and sibling-quote rejection all happen in
    // respondToAcceptedQuote. Sibling quotes stay PENDING so the landlord
    // can re-pick if this vendor declines.
    const updated = await prismaClient.maintenanceQuote.update({
      where: { id: quoteId },
      data: { status: 'ACCEPTED', vendorAccepted: null, vendorRespondedAt: null },
      include: {
        vendor: { select: { userId: true } },
        maintenance: { select: { id: true, description: true } },
      },
    });

    try {
      if (updated.vendor?.userId) {
        const NotificationService = (await import('./notification.service')).default;
        await NotificationService.createNotification(
          {
            destId: updated.vendor.userId,
            title: 'You have been picked',
            message:
              'A landlord accepted your quote. Confirm or decline the job in the Vendor app.',
            notificationType: 'maintenance_status_change',
            route: '/(app)/(tabs)',
            emitRealtime: true,
            type: 'success',
          },
          'MAINTENANCE_REQUESTS'
        );
      }
    } catch (notifyError) {
      console.error('Failed to notify vendor of quote acceptance:', notifyError);
    }

    return updated;
  }

  // Vendor responds to a landlord-accepted quote ("You have been picked" -
  // Accept/Decline). Accepting performs the actual assignment; declining
  // releases the job back to the landlord's remaining PENDING quotes.
  async respondToAcceptedQuote(quoteId: string, vendorId: string, accept: boolean) {
    const quote = await prismaClient.maintenanceQuote.findFirst({
      where: {
        id: quoteId,
        vendorId,
        isDeleted: false,
        status: 'ACCEPTED',
        vendorAccepted: null,
      },
      include: { maintenance: true },
    });

    if (!quote) {
      throw ApiError.notFound('No accepted quote awaiting your response was found');
    }

    if (!accept) {
      const declined = await prismaClient.maintenanceQuote.update({
        where: { id: quoteId },
        data: {
          status: 'REJECTED',
          vendorAccepted: false,
          vendorRespondedAt: new Date(),
        },
      });

      try {
        const landlord = quote.maintenance.landlordId
          ? await prismaClient.landlords.findUnique({
              where: { id: quote.maintenance.landlordId },
              select: { userId: true },
            })
          : null;
        if (landlord?.userId) {
          const NotificationService = (await import('./notification.service')).default;
          await NotificationService.createNotification(
            {
              destId: landlord.userId,
              title: 'Vendor Declined Job',
              message:
                'A picked vendor declined the job. You can accept another pending quote.',
              notificationType: 'maintenance_status_change',
              route: `/service/maintenance/landlord/${quote.maintenanceId}`,
              emitRealtime: true,
              type: 'warning',
            },
            'MAINTENANCE_REQUESTS'
          );
        }
      } catch (notifyError) {
        console.error('Failed to notify landlord of vendor decline:', notifyError);
      }

      return declined;
    }

    // Reputation gate (Part 5): blocked vendors can't take the job even if
    // the landlord picked their quote before the block took effect.
    const { getVendorReputation } = await import('./vendorReputation.service');
    if ((await getVendorReputation(vendorId)).zone === 'BLOCKED') {
      throw ApiError.forbidden('Your rating is below the minimum to receive jobs right now.');
    }

    // Authoritative cap/availability check at the moment of assignment.
    const vendorService = await ServiceServices.getSpecificVendorService(vendorId, quote.maintenance.categoryId);
    if (!vendorService) {
      throw ApiError.badRequest('You are no longer subscribed to this service category');
    }
    if (vendorService.availability === vendorAvailability.NO) {
      throw ApiError.badRequest('Your service is currently marked unavailable');
    }
    if (vendorService.currentJobs >= 2) {
      throw ApiError.badRequest('You have reached the maximum number of active jobs - complete one first');
    }

    const assigned = await prismaClient.$transaction(async (tx) => {
      const updatedQuote = await tx.maintenanceQuote.update({
        where: { id: quoteId },
        data: { vendorAccepted: true, vendorRespondedAt: new Date() }
      });

      await tx.maintenance.update({
        where: { id: quote.maintenanceId },
        data: {
          vendorId,
          serviceId: vendorService.id,
          amount: quote.amount,
          status: 'ASSIGNED'
        }
      });

      // Mirrors assignMaintenance's increment on the tenant-direct path.
      await tx.services.update({
        where: { id: vendorService.id },
        data: { currentJobs: { increment: 1 } }
      });

      await tx.maintenanceQuote.updateMany({
        where: {
          maintenanceId: quote.maintenanceId,
          id: { not: quoteId },
          status: 'PENDING'
        },
        data: { status: 'REJECTED' }
      });

      await tx.maintenanceAssignmentHistory.create({
        data: {
          maintenanceId: quote.maintenanceId,
          vendorId,
          assignedAt: new Date(),
          state: 'ASSIGNED'
        }
      });

      return updatedQuote;
    });

    try {
      const MaintenanceService = (await import('./maintenance.service')).default;
      const full = await MaintenanceService.getMaintenanceById(quote.maintenanceId);
      if (full) {
        const { notifyTenantMaintenanceUpdate } = await import(
          './maintenanceNotification.service'
        );
        const fullTenant = (full as any).tenant as { userId?: string | null } | null | undefined;
        const fullLandlord = (full as any).landlord as
          | { userId?: string | null; user?: { id?: string | null } | null }
          | null
          | undefined;
        await notifyTenantMaintenanceUpdate(
          {
            id: quote.maintenanceId,
            status: quote.maintenance.status,
            landlordDecision: quote.maintenance.landlordDecision,
            landlordId: quote.maintenance.landlordId,
            tenantId: quote.maintenance.tenantId,
          },
          {
            id: full.id,
            status: full.status,
            landlordDecision: full.landlordDecision,
            landlordId: full.landlordId,
            tenantId: full.tenantId,
            tenant: fullTenant ? { userId: fullTenant.userId } : null,
            landlord: fullLandlord
              ? {
                  userId: fullLandlord.userId,
                  user: fullLandlord.user
                    ? { id: fullLandlord.user.id }
                    : undefined,
                }
              : null,
          }
        );
      }
    } catch (notifyError) {
      console.error('Failed to notify parties of vendor job acceptance:', notifyError);
    }

    return assigned;
  }

  // Landlord rejects a quote
  async rejectQuote(quoteId: string, landlordId: string) {
    const quote = await prismaClient.maintenanceQuote.findFirst({
      where: {
        id: quoteId,
        isDeleted: false,
        status: 'PENDING'
      },
      include: {
        maintenance: true
      }
    });

    if (!quote) {
      throw ApiError.notFound('Quote not found');
    }

    // Verify landlord owns the property
    const maintenance = await prismaClient.maintenance.findFirst({
      where: {
        id: quote.maintenanceId,
        landlordId
      }
    });

    if (!maintenance) {
      throw ApiError.unauthorized('You are not authorized to reject quotes for this maintenance');
    }

    const updatedQuote = await prismaClient.maintenanceQuote.update({
      where: { id: quoteId },
      data: { status: 'REJECTED' }
    });

    return updatedQuote;
  }

}

export const quoteService = new QuoteService();