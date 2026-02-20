import { Response } from 'express';
import { CustomRequest } from '../../utils/types';
import { asyncHandler } from '../../utils/asyncHandler';
import { ApiResponse } from '../../utils/ApiResponse';
import { ApiError } from '../../utils/ApiError';
import { prismaClient } from '../..';
import InspectionService from '../../services/inspection.services';
import InspectionCertificateService from '../../services/inspectionCertificate.service';

class TenantInspectionController {
  /**
   * Get all inspections for the authenticated tenant
   */
  getTenantInspections = asyncHandler(async (req: CustomRequest, res: Response) => {
    const userId = req.user.id;
    const { status } = req.query;

    // Get tenant record for this user
    const tenant = await prismaClient.tenants.findFirst({
      where: {
        userId: userId,
        isCurrentLease: true,
      },
    });

    if (!tenant) {
      return res.status(200).json(
        ApiResponse.success(
          { inspections: [] },
          'No active tenant found'
        )
      );
    }

    // Build where clause
    const whereClause: any = {
      tenantId: tenant.id,
    };

    // Filter by status if provided
    if (status) {
      whereClause.status = status;
    }

    const inspections = await prismaClient.inspection.findMany({
      where: whereClause,
      include: {
        property: {
          select: {
            id: true,
            name: true,
            address: true,
            propertyType: true,
          },
        },
        acknowledgment: {
          include: {
            tenant: {
              select: {
                id: true,
                userId: true,
              },
            },
          },
        },
        sections: {
          include: {
            items: {
              include: {
                photos: true,
              },
            },
            photos: true,
          },
        },
        certificates: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return res.status(200).json(
      ApiResponse.success(
        { inspections },
        'Tenant inspections retrieved successfully'
      )
    );
  });

  /**
   * Get inspection statistics for tenant
   */
  getTenantInspectionStats = asyncHandler(async (req: CustomRequest, res: Response) => {
    const userId = req.user.id;

    // Get tenant record
    const tenant = await prismaClient.tenants.findFirst({
      where: {
        userId: userId,
        isCurrentLease: true,
      },
    });

    if (!tenant) {
      return res.status(200).json(
        ApiResponse.success(
          {
            total: 0,
            pending: 0,
            completed: 0,
            needsAcknowledgment: 0,
            withDisputes: 0,
          },
          'No active tenant found'
        )
      );
    }

    // Get all inspections for this tenant
    const inspections = await prismaClient.inspection.findMany({
      where: {
        tenantId: tenant.id,
      },
      include: {
        acknowledgment: true,
      },
    });

    const stats = {
      total: inspections.length,
      pending: inspections.filter((i) => i.status === 'Scheduled' || i.status === 'In Progress').length,
      completed: inspections.filter((i) => i.status === 'Completed').length,
      needsAcknowledgment: inspections.filter(
        (i) => i.acknowledgment && !i.acknowledgment.acknowledged
      ).length,
      withDisputes: inspections.filter(
        (i) => i.acknowledgment && i.acknowledgment.hasDisputes === true
      ).length,
    };

    return res.status(200).json(
      ApiResponse.success(
        { stats },
        'Inspection statistics retrieved successfully'
      )
    );
  });

  /**
   * Get inspection by ID (tenant must be assigned to it)
   */
  getInspectionById = asyncHandler(async (req: CustomRequest, res: Response) => {
    const userId = req.user.id;
    const { id } = req.params;

    // Get tenant record
    const tenant = await prismaClient.tenants.findFirst({
      where: {
        userId: userId,
        isCurrentLease: true,
      },
    });

    if (!tenant) {
      throw ApiError.badRequest('No active tenant found');
    }

    // Get inspection with full details
    const inspection = await InspectionService.getCompleteInspection(id);

    if (!inspection) {
      throw ApiError.notFound('Inspection not found');
    }

    // Verify tenant has access to this inspection
    if (inspection.tenantId !== tenant.id) {
      throw ApiError.forbidden('You do not have access to this inspection');
    }

    return res.status(200).json(
      ApiResponse.success(
        { inspection },
        'Inspection retrieved successfully'
      )
    );
  });

  /**
   * Acknowledge inspection (tenant signs off)
   */
  acknowledgeInspection = asyncHandler(async (req: CustomRequest, res: Response) => {
    const userId = req.user.id;
    const { id } = req.params;
    const { signature, comments, hasDisputes } = req.body;

    // Get tenant record
    const tenant = await prismaClient.tenants.findFirst({
      where: {
        userId: userId,
        isCurrentLease: true,
      },
    });

    if (!tenant) {
      throw ApiError.badRequest('No active tenant found');
    }

    // Get inspection
    const inspection = await InspectionService.getInspectionById(id);

    if (!inspection) {
      throw ApiError.notFound('Inspection not found');
    }

    // Verify tenant has access
    if (inspection.tenantId !== tenant.id) {
      throw ApiError.forbidden('You do not have access to this inspection');
    }

    // Check if acknowledgment exists
    const existingAcknowledgment = await prismaClient.inspectionAcknowledgment.findUnique({
      where: { inspectionId: id },
    });

    if (!existingAcknowledgment) {
      throw ApiError.badRequest('Inspection has not been shared with you yet');
    }

    if (existingAcknowledgment.acknowledged) {
      throw ApiError.badRequest('Inspection already acknowledged');
    }

    // Update acknowledgment
    const updatedAcknowledgment = await prismaClient.inspectionAcknowledgment.update({
      where: { inspectionId: id },
      data: {
        acknowledged: true,
        acknowledgedAt: new Date(),
        signature: signature || null,
        comments: comments || null,
        hasDisputes: hasDisputes || false,
      },
      include: {
        tenant: {
          include: {
            user: {
              select: {
                email: true,
                profile: {
                  select: {
                    fullname: true,
                    firstName: true,
                    lastName: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    return res.status(200).json(
      ApiResponse.success(
        {
          message: 'Inspection acknowledged successfully',
          acknowledgment: updatedAcknowledgment,
        },
        'Inspection acknowledged successfully'
      )
    );
  });

  /**
   * Get inspection certificate
   */
  getInspectionCertificate = asyncHandler(async (req: CustomRequest, res: Response) => {
    const userId = req.user.id;
    const { id } = req.params;
    const { type = 'tenant' } = req.query;

    // Get tenant record
    const tenant = await prismaClient.tenants.findFirst({
      where: {
        userId: userId,
        isCurrentLease: true,
      },
    });

    if (!tenant) {
      throw ApiError.badRequest('No active tenant found');
    }

    // Get inspection
    const inspection = await InspectionService.getInspectionById(id);

    if (!inspection) {
      throw ApiError.notFound('Inspection not found');
    }

    // Verify tenant has access
    if (inspection.tenantId !== tenant.id) {
      throw ApiError.forbidden('You do not have access to this inspection');
    }

    // Generate or get certificate
    const certificate = await InspectionCertificateService.generateCertificate(
      id,
      type as 'tenant' | 'landlord',
      userId
    );

    return res.status(200).json(
      ApiResponse.success(
        { certificate },
        'Certificate retrieved successfully'
      )
    );
  });
}

export default new TenantInspectionController();
