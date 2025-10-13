import { Response } from 'express';
import { CustomRequest } from '../../utils/types';
import LeaseRenewalService from '../../services/leaseRenewal.service';
import { ApiResponse } from '../../utils/ApiResponse';
import { ApiError } from '../../utils/ApiError';
import { asyncHandler } from '../../utils/asyncHandler';
import Joi from 'joi';
import { prismaClient } from '../..';


class TenantLeaseRenewalController {
  constructor() {}

  /**
   * Get lease renewal proposals for tenant
   */
  getLeaseRenewals = asyncHandler(async (req: CustomRequest, res: Response) => {
    const userId = req.user.id;
    const { status } = req.query;

    // Get tenant's current lease
    const tenant = await prismaClient.tenants.findFirst({
      where: {
        userId: userId,
        isCurrentLease: true
      }
    });

    if (!tenant) {
      throw ApiError.badRequest("No active lease found for this tenant");
    }

    // Build where clause
    const whereClause: any = {
      tenantId: tenant.id
    };

    if (status) {
      whereClause.status = status;
    }

    const renewals = await prismaClient.leaseRenewal.findMany({
      where: whereClause,
      include: {
        property: {
          include: {
            landlord: {
              include: {
                user: true
              }
            }
          }
        }
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

    // Verify tenant has permission to respond to this proposal
    const proposal = await prismaClient.leaseRenewal.findUnique({
      where: { id: proposalId },
      include: {
        tenant: true
      }
    });

    if (!proposal || proposal.tenant.userId !== userId) {
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
   * Get current lease information with renewal status
   */
  getCurrentLeaseInfo = asyncHandler(async (req: CustomRequest, res: Response) => {
    const userId = req.user.id;

    // Get tenant's current lease
    const tenant = await prismaClient.tenants.findFirst({
      where: {
        userId: userId,
        isCurrentLease: true
      },
      include: {
        property: {
          include: {
            landlord: {
              include: {
                user: true
              }
            }
          }
        },
        user: true
      }
    });

    if (!tenant) {
      throw ApiError.badRequest("No active lease found for this tenant");
    }

    if (!tenant.leaseStartDate || !tenant.leaseEndDate) {
      throw ApiError.badRequest("Lease dates not available");
    }

    // Calculate lease information
    const currentDate = new Date();
    const leaseDuration = tenant.leaseEndDate.getTime() - tenant.leaseStartDate.getTime();
    const days = Math.ceil(leaseDuration / (1000 * 60 * 60 * 24));
    
    let frequency: 'WEEKLY' | 'MONTHLY' | 'ANNUAL';
    if (days <= 10) {
      frequency = 'WEEKLY';
    } else if (days <= 35) {
      frequency = 'MONTHLY';
    } else {
      frequency = 'ANNUAL';
    }

    const daysUntilExpiry = Math.ceil((tenant.leaseEndDate.getTime() - currentDate.getTime()) / (1000 * 60 * 60 * 24));
    const percentageRemaining = Math.max(0, (daysUntilExpiry / days) * 100);

    const config = {
      thresholds: { first: 50, second: 25, final: 10 }
    };

    const reminderDates = {
      first: new Date(tenant.leaseEndDate.getTime() - (days * 0.5) * 24 * 60 * 60 * 1000),
      second: new Date(tenant.leaseEndDate.getTime() - (days * 0.25) * 24 * 60 * 60 * 1000),
      final: new Date(tenant.leaseEndDate.getTime() - (days * 0.1) * 24 * 60 * 60 * 1000),
    };

    let reminderStatus = 'NONE';
    if (percentageRemaining <= config.thresholds.final) {
      reminderStatus = 'FINAL_REMINDER';
    } else if (percentageRemaining <= config.thresholds.second) {
      reminderStatus = 'SECOND_REMINDER';
    } else if (percentageRemaining <= config.thresholds.first) {
      reminderStatus = 'FIRST_REMINDER';
    }

    // Get any pending renewal proposals
    const pendingRenewals = await prismaClient.leaseRenewal.findMany({
      where: {
        tenantId: tenant.id,
        status: 'PENDING'
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    const leaseInfo = {
      ...tenant,
      frequency,
      daysUntilExpiry,
      percentageRemaining: Math.round(percentageRemaining),
      reminderStatus,
      reminderDates,
      config,
      pendingRenewals
    };

    return res.status(200).json(
      ApiResponse.success(
        leaseInfo,
        "Current lease information retrieved successfully"
      )
    );
  });

  /**
   * Request lease renewal (tenant-initiated)
   */
  requestLeaseRenewal = asyncHandler(async (req: CustomRequest, res: Response) => {
    const userId = req.user.id;
    const { proposedRent, renewalTerms, message } = req.body;

    // Validation schema
    const requestSchema = Joi.object({
      proposedRent: Joi.number().positive().required(),
      renewalTerms: Joi.object({
        duration: Joi.string().valid('WEEKLY', 'MONTHLY', 'ANNUAL').required(),
        startDate: Joi.date().required(),
        endDate: Joi.date().required()
      }).required(),
      message: Joi.string().optional()
    });

    const { error } = requestSchema.validate(req.body);
    if (error) {
      throw ApiError.badRequest(error.details[0].message);
    }

    // Get tenant's current lease
    const tenant = await prismaClient.tenants.findFirst({
      where: {
        userId: userId,
        isCurrentLease: true
      },
      include: {
        property: true
      }
    });

    if (!tenant) {
      throw ApiError.badRequest("No active lease found for this tenant");
    }

    // Get current rent from property
    const currentRent = tenant.property.price || 0;

    // Create lease renewal proposal
    const renewalProposal = await LeaseRenewalService.initiateLeaseRenewal({
      tenantId: tenant.id,
      propertyId: tenant.propertyId,
      currentRent: currentRent as any,
      proposedRent,
      renewalTerms,
      message
    });

    return res.status(201).json(
      ApiResponse.success(
        renewalProposal,
        "Lease renewal request sent successfully"
      )
    );
  });
}

export default new TenantLeaseRenewalController();
