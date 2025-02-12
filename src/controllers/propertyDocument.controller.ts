import { Response } from 'express';
import { PropertyDocumentService } from '../services/propertyDocument.service';
import { IPropertyDocument } from '../validations/interfaces/properties.interface';
import { createPropertyDocumentSchema, updatePropertyDocumentSchema } from '../validations/schemas/properties.schema';
import { CustomRequest } from '../utils/types';

class PropertyDocumentController {

    // constructor(){

    // }
    private propertyDocumentService = new PropertyDocumentService();

    create = async (req: CustomRequest, res: Response) =>{
        try {
            console.log(req.body)
            const { error, value } = createPropertyDocumentSchema.validate(req.body);
            if (error) {
                return res.status(400).json({ error: error.details[0].message });
            }
            const uploadedBy = req.user?.id;
            const documentUrl = value.cloudinaryDocumentUrls;
            delete value['cloudinaryUrls']
            delete value['cloudinaryVideoUrls']
            delete value['cloudinaryDocumentUrls']
            delete value['cloudinaryAudioUrls']

            const data: IPropertyDocument = {...value, uploadedBy, documentUrl};
            const propertyDocument = await this.propertyDocumentService.create(data);
            res.status(201).json({propertyDocument});
        } catch (error) {
            console.log(error)
            res.status(500).json({ message: 'Failed to create property document', error });
        }
    }

    findAll = async (req: CustomRequest, res: Response) =>{
        try {
          
            const propertyId = req.params.propertyId;
            const propertyDocuments = await this.propertyDocumentService.findAll(propertyId);
            res.status(200).json(propertyDocuments);
        } catch (error) {
            res.status(500).json({ message: 'Failed to retrieve property documents', error });
        }
    }

    findById = async (req: CustomRequest, res: Response) =>{
        try {
            const { id } = req.params;
            const propertyDocument = await this.propertyDocumentService.findById(id);
            if (propertyDocument) {
                res.status(200).json({propertyDocument});
            } else {
                res.status(404).json({ message: 'Property document not found' });
            }
        } catch (error) {
            res.status(500).json({ message: 'Failed to retrieve property document', error });
        }
    }

    async update(req: CustomRequest, res: Response) {
        try {
            const { id } = req.params;
            const { error } = updatePropertyDocumentSchema.validate(req.body);
            if (error) {
                return res.status(400).json({ error: error.details[0].message });
            }
            const data: IPropertyDocument = req.body;
            const updatedPropertyDocument = await this.propertyDocumentService.update(id, data);
            res.status(200).json({updatedPropertyDocument});
        } catch (error) {
            res.status(500).json({ message: 'Failed to update property document', error });
        }
    }

    async delete(req: CustomRequest, res: Response) {
        try {
            const { id } = req.params;
            await this.propertyDocumentService.delete(id);
            res.status(204).send();
        } catch (error) {
            res.status(500).json({ message: 'Failed to delete property document', error });
        }
    }
}


export default new PropertyDocumentController(); 