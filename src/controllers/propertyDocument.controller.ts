import { Response } from 'express';
import { PropertyDocumentService } from '../services/propertyDocument.service';
import { IPropertyDocument } from '../validations/interfaces/properties.interface';
import {
  createPropertyDocumentSchema,
  updatePropertyDocumentSchema,
} from '../validations/schemas/properties.schema';
import { CustomRequest } from '../utils/types';

class PropertyDocumentController {
  private propertyDocumentService = new PropertyDocumentService();

  create = async (req: CustomRequest, res: Response) => {
    try {
      console.log(req.body);
      const { error, value } = createPropertyDocumentSchema.validate(req.body);
      if (error) {
        return res.status(400).json({ error: error.details[0].message });
      }
      const uploadedBy = req.user?.id;
      const documentUrl = value.cloudinaryDocumentUrls;
      delete value['cloudinaryUrls'];
      delete value['cloudinaryVideoUrls'];
      delete value['cloudinaryDocumentUrls'];
      delete value['cloudinaryAudioUrls'];

      const data: IPropertyDocument = { ...value, uploadedBy, documentUrl };
      const propertyDocument = await this.propertyDocumentService.create(data);
      res.status(201).json({ propertyDocument });
    } catch (error) {
      console.log(error);
      res.status(500).json({ message: 'Failed to create property document', error });
    }
  };

  findAll = async (req: CustomRequest, res: Response) => {
    try {
      const propertyId = req.params.propertyId;
      const propertyDocuments =
        await this.propertyDocumentService.findAll(propertyId);
      res.status(200).json(propertyDocuments);
    } catch (error) {
      res
        .status(500)
        .json({ message: 'Failed to retrieve property documents', error });
    }
  };

  findById = async (req: CustomRequest, res: Response) => {
    try {
      const { id } = req.params;
      const propertyDocument = await this.propertyDocumentService.findById(id);
      if (propertyDocument) {
        res.status(200).json({ propertyDocument });
      } else {
        res.status(404).json({ message: 'Property document not found' });
      }
    } catch (error) {
      res
        .status(500)
        .json({ message: 'Failed to retrieve property document', error });
    }
  };

  update = async (req: CustomRequest, res: Response) => {
    try {
      const { id } = req.params;
      const { error } = updatePropertyDocumentSchema.validate(req.body);
      if (error) {
        return res.status(400).json({ error: error.details[0].message });
      }
      const data: IPropertyDocument = req.body;
      const updatedPropertyDocument =
        await this.propertyDocumentService.update(id, data);
      res.status(200).json({ updatedPropertyDocument });
    } catch (error) {
      res
        .status(500)
        .json({ message: 'Failed to update property document', error });
    }
  };

  delete = async (req: CustomRequest, res: Response) => {
    try {
      const landlordId = req.user?.landlords?.id;
      if (!landlordId) {
        return res.status(403).json({ message: 'Forbidden' });
      }
      const { id } = req.params;
      await this.propertyDocumentService.softDeleteForLandlord(id, landlordId);
      res.status(204).send();
    } catch (error: any) {
      if (error?.statusCode === 404) {
        return res.status(404).json({ message: 'Document not found' });
      }
      res.status(500).json({ message: 'Failed to delete property document', error });
    }
  };

  restore = async (req: CustomRequest, res: Response) => {
    try {
      const landlordId = req.user?.landlords?.id;
      if (!landlordId) {
        return res.status(403).json({ message: 'Forbidden' });
      }
      const { id } = req.params;
      const propertyDocument =
        await this.propertyDocumentService.restoreForLandlord(id, landlordId);
      res.status(200).json({ propertyDocument });
    } catch (error: any) {
      if (error?.statusCode === 404) {
        return res.status(404).json({ message: 'Document not found' });
      }
      res.status(500).json({ message: 'Failed to restore property document', error });
    }
  };

  setFavorite = async (req: CustomRequest, res: Response) => {
    try {
      const landlordId = req.user?.landlords?.id;
      const userId = req.user?.id;
      if (!landlordId || !userId) {
        return res.status(403).json({ message: 'Forbidden' });
      }
      const { id } = req.params;
      const favorite = Boolean(req.body?.favorite);
      const result = await this.propertyDocumentService.setFavoriteForLandlord(
        userId,
        id,
        favorite,
        landlordId
      );
      res.status(200).json(result);
    } catch (error: any) {
      if (error?.statusCode === 404) {
        return res.status(404).json({ message: 'Document not found' });
      }
      if (
        error?.message === 'INVALID_STATE' ||
        error?.statusCode === 400
      ) {
        return res
          .status(400)
          .json({ message: 'Cannot favorite a trashed document' });
      }
      res.status(500).json({ message: 'Failed to update favorite', error });
    }
  };

  permanentDelete = async (req: CustomRequest, res: Response) => {
    try {
      const landlordId = req.user?.landlords?.id;
      if (!landlordId) {
        return res.status(403).json({ message: 'Forbidden' });
      }
      const { id } = req.params;
      await this.propertyDocumentService.permanentDeleteTrashedForLandlord(
        id,
        landlordId
      );
      res.status(204).send();
    } catch (error: any) {
      if (error?.statusCode === 404) {
        return res.status(404).json({ message: 'Document not found' });
      }
      if (error?.message === 'NOT_TRASHED' || error?.statusCode === 400) {
        return res.status(400).json({
          message:
            'Only files in trash can be permanently deleted. Move to trash first.',
        });
      }
      res
        .status(500)
        .json({ message: 'Failed to permanently delete document', error });
    }
  };

  emptyTrash = async (req: CustomRequest, res: Response) => {
    try {
      const landlordId = req.user?.landlords?.id;
      if (!landlordId) {
        return res.status(403).json({ message: 'Forbidden' });
      }
      const result =
        await this.propertyDocumentService.emptyTrashForLandlord(landlordId);
      res.status(200).json(result);
    } catch (error) {
      res.status(500).json({ message: 'Failed to empty trash', error });
    }
  };
}

export default new PropertyDocumentController();
