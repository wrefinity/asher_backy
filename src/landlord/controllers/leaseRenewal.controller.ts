import { Response } from 'express';
import { CustomRequest } from '../../utils/types';
import LeaseRenewalService from '../../services/leaseRenewal.service';
import { ApiResponse } from '../../utils/ApiResponse';
import { ApiError } from '../../utils/ApiError';
import { asyncHandler } from '../../utils/asyncHandler';
import Joi from 'joi';
import { prismaClient } from '../..';

class LandlordLeaseRenewalController {
  constructor() {}

  /**
   * Initiate lease renewal proposal
   */
  initiateLeaseRenewal = asyncHandler(async (req: CustomRequest, res: Response) => {
    const userId = req.user.id;
    const { tenantId, propertyId, currentRent, proposedRent, renewalTerms, message } = req.body;

    // Validation schema
    const renewalSchema = Joi.object({
      tenantId: Joi.string().required(),
      propertyId: Joi.string().required(),
      currentRent: Joi.number().positive().required(),
      proposedRent: Joi.number().positive().required(),
      renewalTerms: Joi.object({
        duration: Joi.string().valid('WEEKLY', 'MONTHLY', 'ANNUAL').required(),
        startDate: Joi.date().required(),
        endDate: Joi.date().required()
      }).required(),
      message: Joi.string().optional()
    });

    const { error } = renewalSchema.validate(req.body);
    if (error) {
      throw ApiError.badRequest(error.details[0].message);
    }

    // Verify landlord owns this property
    const property = await prismaClient.properties.findFirst({
      where: {
        id: propertyId,
        landlord: {
          userId: userId
        }
      }
    });

    if (!property) {
      throw ApiError.badRequest("Property not found or you don't have permission to manage it");
    }

    // Verify tenant exists and is associated with this property
    const tenant = await prismaClient.tenants.findFirst({
      where: {
        id: tenantId,
        propertyId: propertyId,
        isCurrentLease: true
      }
    });

    if (!tenant) {
      throw ApiError.badRequest("Tenant not found or not associated with this property");
    }

    // Create lease renewal proposal
    const renewalProposal = await LeaseRenewalService.initiateLeaseRenewal({
      tenantId,
      propertyId,
      currentRent,
      proposedRent,
      renewalTerms,
      message
    });

    return res.status(201).json(
      ApiResponse.success(
        renewalProposal,
        "Lease renewal proposal sent successfully"
      )
    );
  });

  /**
   * Get lease renewal proposals for landlord's properties
   */
  getLeaseRenewals = asyncHandler(async (req: CustomRequest, res: Response) => {
    const userId = req.user.id;
    const { status, propertyId } = req.query;

    // Get landlord's properties
    const landlordProperties = await prismaClient.properties.findMany({
      where: {
        landlord: {
          userId: userId
        }
      },
      select: { id: true }
    });

    const propertyIds = landlordProperties.map(p => p.id);

    // Build where clause
    const whereClause: any = {
      propertyId: {
        in: propertyIds
      }
    };

    if (propertyId) {
      whereClause.propertyId = propertyId;
    }

    if (status) {
      whereClause.status = status;
    }

    const renewals = await prismaClient.leaseRenewal.findMany({
      where: whereClause,
      include: {
        tenant: {
          include: {
            user: true
          }
        },
        property: true
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    return res.status(200).json(
      ApiResponse.success(
        renewals,
        "Lease renewals retrieved successfully"
      )
    );
  });

  /**
   * Respond to lease renewal proposal
   */
  respondToRenewalProposal = asyncHandler(async (req: CustomRequest, res: Response) => {
    const userId = req.user.id;
    const { proposalId } = req.params;
    const { response, counterOffer } = req.body;

    // Validation schema
    const responseSchema = Joi.object({
      response: Joi.string().valid('ACCEPTED', 'REJECTED', 'COUNTER_OFFER').required(),
      counterOffer: Joi.object({
        proposedRent: Joi.number().positive().optional(),
        renewalTerms: Joi.object().optional(),
        message: Joi.string().optional()
      }).when('response', {
        is: 'COUNTER_OFFER',
        then: Joi.required(),
        otherwise: Joi.optional()
      })
    });

    const { error } = responseSchema.validate(req.body);
    if (error) {
      throw ApiError.badRequest(error.details[0].message);
    }

    // Verify landlord has permission to respond to this proposal
    const proposal = await prismaClient.leaseRenewal.findUnique({
      where: { id: proposalId },
      include: {
        property: {
          include: {
            landlord: true
          }
        }
      }
    });

    if (!proposal || proposal.property.landlord.userId !== userId) {
      throw ApiError.badRequest("Proposal not found or you don't have permission to respond");
    }

    // Respond to proposal
    const updatedProposal = await LeaseRenewalService.respondToRenewalProposal(
      proposalId,
      userId,
      response,
      counterOffer
    );

    return res.status(200).json(
      ApiResponse.success(
        updatedProposal,
        "Renewal proposal response sent successfully"
      )
    );
  });

  /**
   * Get lease expiry report with percentage-based reminders
   */
  getLeaseExpiryReport = asyncHandler(async (req: CustomRequest, res: Response) => {
    const userId = req.user.id;
    const currentDate = new Date();

    // Get all active leases for landlord's properties
    const activeLeases = await prismaClient.tenants.findMany({
      where: {
        isCurrentLease: true,
        leaseEndDate: {
          gte: currentDate
        },
        property: {
          landlord: {
            userId: userId
          }
        }
      },
      include: {
        user: true,
        property: true
      }
    });

    // Calculate renewal reminder status for each lease
    const leaseReports = activeLeases.map(lease => {
      if (!lease.leaseStartDate || !lease.leaseEndDate) {
        return null;
      }

      const leaseDuration = lease.leaseEndDate.getTime() - lease.leaseStartDate.getTime();
      const days = Math.ceil(leaseDuration / (1000 * 60 * 60 * 24));
      
      let frequency: 'WEEKLY' | 'MONTHLY' | 'ANNUAL';
      if (days <= 10) {
        frequency = 'WEEKLY';
      } else if (days <= 35) {
        frequency = 'MONTHLY';
      } else {
        frequency = 'ANNUAL';
      }

      const config = {
        thresholds: { first: 50, second: 25, final: 10 }
      };

      const totalDays = Math.ceil((lease.leaseEndDate.getTime() - lease.leaseStartDate.getTime()) / (1000 * 60 * 60 * 24));
      
      const reminderDates = {
        first: new Date(lease.leaseEndDate.getTime() - (totalDays * 0.5) * 24 * 60 * 60 * 1000),
        second: new Date(lease.leaseEndDate.getTime() - (totalDays * 0.25) * 24 * 60 * 60 * 1000),
        final: new Date(lease.leaseEndDate.getTime() - (totalDays * 0.1) * 24 * 60 * 60 * 1000),
      };

      const daysUntilExpiry = Math.ceil((lease.leaseEndDate.getTime() - currentDate.getTime()) / (1000 * 60 * 60 * 24));
      const percentageRemaining = Math.max(0, (daysUntilExpiry / totalDays) * 100);

      let reminderStatus = 'NONE';
      if (percentageRemaining <= config.thresholds.final) {
        reminderStatus = 'FINAL_REMINDER';
      } else if (percentageRemaining <= config.thresholds.second) {
        reminderStatus = 'SECOND_REMINDER';
      } else if (percentageRemaining <= config.thresholds.first) {
        reminderStatus = 'FIRST_REMINDER';
      }

      return {
        ...lease,
        frequency,
        daysUntilExpiry,
        percentageRemaining: Math.round(percentageRemaining),
        reminderStatus,
        reminderDates,
        config
      };
    }).filter(Boolean);

    return res.status(200).json(
      ApiResponse.success(
        leaseReports,
        "Lease expiry report generated successfully"
      )
    );
  });

  /**
   * Check and send renewal reminders (admin endpoint)
   */
  checkRenewalReminders = asyncHandler(async (req: CustomRequest, res: Response) => {
    await LeaseRenewalService.checkRenewalReminders();

    return res.status(200).json(
      ApiResponse.success(
        null,
        "Renewal reminders checked and sent successfully"
      )
    );
  });
}

export default new LandlordLeaseRenewalController();
