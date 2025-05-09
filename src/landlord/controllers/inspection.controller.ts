import { Response } from 'express';
import InspectionService  from '../../services/inspection.services';
import {
  createInspectionSchema,
  updateInspectionSchema,
} from '../../validations/schemas/inspection.schema';
import { CustomRequest } from '../../utils/types';
import propertyServices from '../../services/propertyServices';

class InspectionController {


    createInspection = async (req: CustomRequest, res: Response) => {
    try {
      const { error } = createInspectionSchema.validate(req.body);
      if (error) {
        return res.status(400).json({ error: error.details[0].message });
      }

      // Verify landlord owns the property
      const property = await propertyServices.getPropertyById(
        req.body.propertyId
      );
      if (!property || property.landlordId !== req.user.id) {
        return res.status(403).json({ error: 'Unauthorized' });
      }

      const inspection = await InspectionService.createInspection(req.body);
      res.status(201).json(inspection);
    } catch (error) {
      res.status(500).json({ error: 'Failed to create inspection' });
    }
  }

  getInspections = async (req: CustomRequest, res: Response) =>{
    try {
      const propertyId = req.query.propertyId as string;
      if (!propertyId) {
        return res.status(400).json({ error: 'Property ID is required' });
      }

      // Verify landlord owns the property
      const property = await propertyServices.getPropertyById(propertyId);
      if (!property || property.landlordId !== req.user.id) {
        return res.status(403).json({ error: 'Unauthorized' });
      }

      const inspections = await InspectionService.getInspectionsByProperty(
        propertyId
      );
      res.json(inspections);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch inspections' });
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
      const property = await propertyServices.getPropertyById(
        inspection.propertyId
      );
      if (!property || property.landlordId !== req.user.id) {
        return res.status(403).json({ error: 'Unauthorized' });
      }

      const updatedInspection = await InspectionService.updateInspection(
        req.params.id,
        req.body
      );
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
      const property = await propertyServices.getPropertyById(
        inspection.propertyId
      );
      if (!property || property.landlordId !== req.user.id) {
        return res.status(403).json({ error: 'Unauthorized' });
      }

      await InspectionService.deleteInspection(req.params.id);
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ error: 'Failed to delete inspection' });
    }
  }
}

export default new InspectionController()