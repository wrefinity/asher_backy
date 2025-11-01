import { maintenanceStatus } from "@prisma/client";
import { prismaClient } from "..";
import { ApiError } from '../utils/ApiError';

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
              status: true
            }
          }
        }
      });

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

    // Start transaction to update quote and maintenance
    const result = await prismaClient.$transaction(async (tx) => {
      // Update the accepted quote
      const updatedQuote = await tx.maintenanceQuote.update({
        where: { id: quoteId },
        data: { status: 'ACCEPTED' }
      });

      // Update maintenance with vendor and amount
      await tx.maintenance.update({
        where: { id: quote.maintenanceId },
        data: {
          vendorId: quote.vendorId,
          amount: quote.amount,
          status: 'ASSIGNED'
        }
      });

      // Reject all other quotes for this maintenance
      await tx.maintenanceQuote.updateMany({
        where: {
          maintenanceId: quote.maintenanceId,
          id: { not: quoteId },
          status: 'PENDING'
        },
        data: { status: 'REJECTED' }
      });

      // Create assignment history
      await tx.maintenanceAssignmentHistory.create({
        data: {
          maintenanceId: quote.maintenanceId,
          vendorId: quote.vendorId,
          assignedAt: new Date(),
          state: 'ASSIGNED'
        }
      });

      return updatedQuote;
    });

    return result;
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