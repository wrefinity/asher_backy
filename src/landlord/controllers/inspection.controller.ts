import { Response } from 'express';
import InspectionService  from '../../services/inspection.services';
import InspectionPhotoService from '../../services/inspectionPhoto.service';
import InspectionCertificateService from '../../services/inspectionCertificate.service';
import NotificationService from '../../services/notification.service';
import {
  createInspectionSchema,
  updateInspectionSchema,
} from '../../validations/schemas/inspection.schema';
import { CustomRequest } from '../../utils/types';
import propertyServices from '../../services/propertyServices';
import { prismaClient } from '../..';

class InspectionController {


    createInspection = async (req: CustomRequest, res: Response) => {
    try {
      console.log('📝 Creating inspection with data:', JSON.stringify(req.body, null, 2));
      
      const { error } = createInspectionSchema.validate(req.body);
      if (error) {
        console.error('❌ Validation error:', error.details);
        return res.status(400).json({ error: error.details[0].message });
      }

      // Verify landlord owns the property
      const landlordId = req.user.landlords?.id || req.user.id;
      if (!landlordId) {
        console.error('❌ No landlord ID found for user:', req.user.id);
        return res.status(403).json({ error: 'Landlord not found' });
      }

      const property = await propertyServices.getPropertyById(
        req.body.propertyId
      );
      if (!property) {
        console.error('❌ Property not found:', req.body.propertyId);
        return res.status(404).json({ error: 'Property not found' });
      }
      
      if (property.landlordId !== landlordId) {
        console.error('❌ Unauthorized: Property landlordId:', property.landlordId, 'User landlordId:', landlordId);
        return res.status(403).json({ error: 'Unauthorized: You do not own this property' });
      }

      console.log('✅ Property verified, creating inspection...');
      const inspection = await InspectionService.createInspection(req.body);
      console.log('✅ Inspection created successfully:', inspection.id);

      // Send notification to tenant if inspection is scheduled and tenant is assigned
      if (inspection.tenantId && inspection.status === 'Scheduled') {
        try {
          const tenant = await prismaClient.tenants.findUnique({
            where: { id: inspection.tenantId },
            select: { userId: true },
          });

          if (tenant?.userId) {
            await NotificationService.createNotification({
              destId: tenant.userId,
              title: 'Inspection Scheduled',
              message: `An inspection has been scheduled for ${property.name} on ${inspection.scheduledDate ? new Date(inspection.scheduledDate).toLocaleDateString() : 'TBD'}.`,
              category: 'COMMUNICATION',
            });
          }
        } catch (notifError) {
          console.warn('⚠️ Failed to send notification (non-critical):', notifError);
        }
      }

      res.status(201).json(inspection);
    } catch (error: any) {
      console.error('❌ Error creating inspection:', error);
      console.error('Error stack:', error.stack);
      console.error('Error details:', {
        message: error.message,
        code: error.code,
        meta: error.meta,
        name: error.name,
      });
      res.status(500).json({ 
        error: 'Failed to create inspection',
        message: process.env.NODE_ENV === 'development' ? error.message : undefined,
        details: process.env.NODE_ENV === 'development' ? {
          code: error.code,
          meta: error.meta,
        } : undefined,
      });
    }
  }

  getInspections = async (req: CustomRequest, res: Response) =>{
    try {
      // Check if user has landlord record
      const landlordId = req.user.landlords?.id || req.user.id;
      if (!landlordId) {
        return res.status(403).json({ error: 'Landlord not found' });
      }

      const propertyId = req.query.propertyId as string;

      // If propertyId is provided, get inspections for that property
      if (propertyId) {
        // Verify landlord owns the property EFFICIENTLY
        const property = await prismaClient.properties.findFirst({
            where: { id: propertyId, landlordId: landlordId },
            select: { id: true }
        });
        if (!property) {
          return res.status(403).json({ error: 'Unauthorized or Property not found' });
        }

        const inspections = await InspectionService.getInspectionsByProperty(
          propertyId
        );
        return res.json(inspections);
      }

      // If no propertyId, return all inspections for landlord's properties
      const allProperties = await propertyServices.getLandlordProperties(landlordId);
      const propertyIds = allProperties.map((p: any) => p.id);
      
      if (propertyIds.length === 0) {
        return res.json([]);
      }

      // Fetch all inspections for the landlord's properties in a single query
      const allInspections = await prismaClient.inspection.findMany({
          where: {
              propertyId: {
                  in: propertyIds,
              },
          },
          include: { tenant: true },
      });

      res.json(allInspections);
    } catch (error: any) {
      console.error('Error fetching inspections:', error);
      const errorMessage = error?.message || 'Failed to fetch inspections';
      res.status(500).json({ error: errorMessage });
    }
  }

  getInspectionById = async (req: CustomRequest, res: Response) => {
    try {
      const { id } = req.params;

      const inspection = await InspectionService.getInspectionById(id);
      if (!inspection) {
        return res.status(404).json({ error: 'Inspection not found' });
      }

      // Verify landlord owns the property
      const landlordId = req.user.landlords?.id || req.user.id;
      const property = await propertyServices.getPropertyById(inspection.propertyId);
      if (!property || property.landlordId !== landlordId) {
        return res.status(403).json({ error: 'Unauthorized' });
      }

      res.json(inspection);
    } catch (error) {
      console.error('Error fetching inspection:', error);
      res.status(500).json({ error: 'Failed to fetch inspection' });
    }
  }

  updateInspection = async (req: CustomRequest, res: Response) =>{
    try {
      const { error } = updateInspectionSchema.validate(req.body);
      if (error) {
        return res.status(400).json({ error: error.details[0].message });
      }

      const inspection = await InspectionService.getInspectionById(
        req.params.id
      );
      if (!inspection) {
        return res.status(404).json({ error: 'Inspection not found' });
      }

      // Verify landlord owns the property
      const landlordId = req.user.landlords?.id || req.user.id;
      const property = await propertyServices.getPropertyById(
        inspection.propertyId
      );
      if (!property || property.landlordId !== landlordId) {
        return res.status(403).json({ error: 'Unauthorized' });
      }

      const updatedInspection = await InspectionService.updateInspection(
        req.params.id,
        req.body
      );

      // Send notification when inspection is marked as completed
      if (req.body.status === 'Completed' && inspection.status !== 'Completed') {
        // Notify tenant
        if (updatedInspection.tenantId) {
          const tenant = await prismaClient.tenants.findUnique({
            where: { id: updatedInspection.tenantId },
            select: { userId: true },
          });

          if (tenant?.userId) {
            await NotificationService.createNotification({
              destId: tenant.userId,
              title: 'Inspection Completed',
              message: `The inspection for ${property.name} has been completed. You will receive the report shortly.`,
              category: 'COMMUNICATION',
            });
          }
        }

        // Notify landlord (the user who created/owns the inspection)
        const landlordUser = await prismaClient.landlords.findUnique({
          where: { id: landlordId },
          select: { userId: true },
        });

        if (landlordUser?.userId) {
          await NotificationService.createNotification({
            destId: landlordUser.userId,
            title: 'Inspection Completed',
            message: `The inspection for ${property.name} has been marked as completed.`,
            category: 'COMMUNICATION',
          });
        }
      }

      res.json(updatedInspection);
    } catch (error) {
      res.status(500).json({ error: 'Failed to update inspection' });
    }
  }

  deleteInspection = async (req: CustomRequest, res: Response) =>{
    try {
      const inspection = await InspectionService.getInspectionById(
        req.params.id
      );
      if (!inspection) {
        return res.status(404).json({ error: 'Inspection not found' });
      }
      // Verify landlord owns the property
      const landlordId = req.user.landlords?.id || req.user.id;
      const property = await propertyServices.getPropertyById(
        inspection.propertyId
      );
      if (!property || property.landlordId !== landlordId) {
        return res.status(403).json({ error: 'Unauthorized' });
      }

      await InspectionService.deleteInspection(req.params.id);
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ error: 'Failed to delete inspection' });
    }
  }

  // ============================================
  // NEW METHODS (Enhanced Inspection System)
  // ============================================

  /**
   * Get complete inspection with all details
   */
  getCompleteInspection = async (req: CustomRequest, res: Response) => {
    try {
      const { id } = req.params;

      const inspection = await InspectionService.getCompleteInspection(id);
      if (!inspection) {
        return res.status(404).json({ error: 'Inspection not found' });
      }

      // Verify landlord owns the property
      const landlordId = req.user.landlords?.id || req.user.id;
      const property = await propertyServices.getPropertyById(inspection.propertyId);
      if (!property || property.landlordId !== landlordId) {
        return res.status(403).json({ error: 'Unauthorized' });
      }

      res.json(inspection);
    } catch (error) {
      console.error('Error fetching complete inspection:', error);
      res.status(500).json({ error: 'Failed to fetch complete inspection' });
    }
  }

  /**
   * Save inspection sections with items
   */
  saveSections = async (req: CustomRequest, res: Response) => {
    try {
      const { id } = req.params;
      const { sections } = req.body;

      if (!sections || !Array.isArray(sections)) {
        return res.status(400).json({ error: 'Invalid sections data' });
      }

      // Verify inspection exists and landlord owns it
      const inspection = await InspectionService.getInspectionById(id);
      if (!inspection) {
        return res.status(404).json({ error: 'Inspection not found' });
      }

      const landlordId = req.user.landlords?.id || req.user.id;
      const property = await propertyServices.getPropertyById(inspection.propertyId);
      if (!property || property.landlordId !== landlordId) {
        return res.status(403).json({ error: 'Unauthorized' });
      }

      const savedSections = await InspectionService.saveSections(id, sections);
      res.json(savedSections);
    } catch (error) {
      console.error('Error saving inspection sections:', error);
      res.status(500).json({ error: 'Failed to save inspection sections' });
    }
  }

  /**
   * Upload photo for inspection item or section
   */
  uploadPhoto = async (req: CustomRequest, res: Response) => {
    try {
      const { id } = req.params;
      const { itemId, sectionId, caption } = req.body;

      if (!req.file) {
        return res.status(400).json({ error: 'No file provided' });
      }

      // Verify inspection exists and landlord owns it
      const inspection = await InspectionService.getInspectionById(id);
      if (!inspection) {
        return res.status(404).json({ error: 'Inspection not found' });
      }

      const landlordId = req.user.landlords?.id || req.user.id;
      const property = await propertyServices.getPropertyById(inspection.propertyId);
      if (!property || property.landlordId !== landlordId) {
        return res.status(403).json({ error: 'Unauthorized' });
      }

      const result = await InspectionPhotoService.uploadPhoto(
        req.file,
        itemId,
        sectionId,
        caption
      );

      res.json(result);
    } catch (error) {
      console.error('Error uploading inspection photo:', error);
      res.status(500).json({ error: 'Failed to upload photo' });
    }
  }

  /**
   * Generate PDF certificate
   */
  generateCertificate = async (req: CustomRequest, res: Response) => {
    try {
      const { id } = req.params;
      const { type } = req.query;

      if (!type || (type !== 'landlord' && type !== 'tenant')) {
        return res.status(400).json({ error: 'Invalid certificate type. Must be "landlord" or "tenant"' });
      }

      // Verify inspection exists and landlord owns it
      const inspection = await InspectionService.getInspectionById(id);
      if (!inspection) {
        return res.status(404).json({ error: 'Inspection not found' });
      }

      const landlordId = req.user.landlords?.id || req.user.id;
      const property = await propertyServices.getPropertyById(inspection.propertyId);
      if (!property || property.landlordId !== landlordId) {
        return res.status(403).json({ error: 'Unauthorized' });
      }

      const certificate = await InspectionCertificateService.generateCertificate(
        id,
        type as 'landlord' | 'tenant',
        req.user.id
      );

      // Send notification to tenant if tenant certificate was generated
      if (type === 'tenant' && inspection.tenantId) {
        const tenant = await prismaClient.tenants.findUnique({
          where: { id: inspection.tenantId },
          select: { userId: true },
        });

        if (tenant?.userId) {
          await NotificationService.createNotification({
            destId: tenant.userId,
            title: 'Inspection Certificate Generated',
            message: `Your inspection certificate for ${property.name} has been generated and is ready for download.`,
            category: 'COMMUNICATION',
          });
        }
      }

      res.json(certificate);
    } catch (error) {
      console.error('Error generating certificate:', error);
      res.status(500).json({ error: 'Failed to generate certificate' });
    }
  }

  /**
   * Share inspection with tenant
   */
  shareWithTenant = async (req: CustomRequest, res: Response) => {
    try {
      const { id } = req.params;

      // Verify inspection exists and landlord owns it
      const inspection = await InspectionService.getInspectionById(id);
      if (!inspection) {
        return res.status(404).json({ error: 'Inspection not found' });
      }

      const landlordId = req.user.landlords?.id || req.user.id;
      const property = await propertyServices.getPropertyById(inspection.propertyId);
      if (!property || property.landlordId !== landlordId) {
        return res.status(403).json({ error: 'Unauthorized' });
      }

      if (!inspection.tenantId) {
        return res.status(400).json({ error: 'No tenant assigned to this inspection' });
      }

      const acknowledgment = await InspectionService.shareWithTenant(
        id,
        inspection.tenantId
      );

      // Send notification to tenant
      if (acknowledgment.tenant.user) {
        await NotificationService.createNotification({
          destId: acknowledgment.tenant.userId,
          title: 'New Inspection Report',
          message: `Your landlord has shared an inspection report for ${property.name}. Please review and acknowledge.`,
          category: 'COMMUNICATION',
        });
      }

      res.json(acknowledgment);
    } catch (error: any) {
      console.error('Error sharing inspection:', error);
      res.status(500).json({ error: error?.message || 'Failed to share inspection with tenant' });
    }
  }

  /**
   * Get inspection statistics
   */
  getStatistics = async (req: CustomRequest, res: Response) => {
    try {
      const landlordId = req.user.landlords?.id || req.user.id;
      const stats = await InspectionService.getInspectionStatistics(landlordId);
      res.json(stats);
    } catch (error) {
      console.error('Error fetching inspection statistics:', error);
      res.status(500).json({ error: 'Failed to fetch statistics' });
    }
  }
}

export default new InspectionController()