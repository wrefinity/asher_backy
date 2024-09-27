import { Request, Response } from 'express';
import { CustomRequest } from '../../utils/types';
import serviceService from '../services/vendor.services';
import CateoryService from '../../services/category.service';
import SubCateoryService from '../../services/subcategory.service';
import { serviceSchema, applyOfferSchema } from '../validations/schema';


class ServiceControls {

    // Create Service
    createService = async (req: CustomRequest, res: Response) => {
        try {
            const { error, value } = serviceSchema.validate(req.body);
            if (error) return res.status(400).json({ error: error.details[0].message });
            console.log(value)
            const vendorId:String = req.user?.vendors?.id;
            if(!vendorId) return res.status(403).json({message:"only vendor can create a service to be rendered"})

            const categoryExist =  await CateoryService.getCategoryById(value.categoryId)
            if (!categoryExist) return res.status(400).json({message:"category doesnt exist"})
            const subCategoryExist =  await SubCateoryService.getSubCategoryById(value.subcategoryId)
            if (!subCategoryExist) return res.status(400).json({message:"sub category doesnt exist"})

            const service = await serviceService.createService({ ...value, vendorId});
            res.status(201).json({ service });
        } catch (error) {
            console.log(error)
            res.status(500).json({ error: error.message });
        }
    }

    // Get Service by ID
    getService = async (req: CustomRequest, res: Response) => {
        try {
            const { id } = req.params;
            const service = await serviceService.getService(id);
            if (!service) return res.status(404).json({ error: 'Service not found' });

            res.status(200).json({service});
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    };

    // Update Service
    updateService = async (req: CustomRequest, res: Response) => {
        try {
            const { id } = req.params;
            const { error, value } = serviceSchema.validate(req.body);
            if (error) return res.status(400).json({ error: error.details[0].message });

            const updatedService = await serviceService.updateService(id, value);
            res.status(200).json(updatedService);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }

    // Delete Service
    deleteService = async (req: CustomRequest, res: Response) => {
        try {
            const { id } = req.params;
            const deletedService = await serviceService.deleteService(id);
            res.status(200).json(deletedService);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }

    // Get All Services
    getAllServices = async (_req: CustomRequest, res: Response) => {
        try {
            const services = await serviceService.getAllServices();
            res.status(200).json(services);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }

    // Get Services by Category and Subcategories
    getServicesByCategoryAndSubcategories = async (req: CustomRequest, res: Response) => {
        try {
            const { id } = req.params;
            const { error, value } = applyOfferSchema.validate(req.body);
            if (error) return res.status(400).json({ error: error.details[0].message });

            const services = await serviceService.getServicesByCategoryAndSubcategories(id, value.subcategoryIds);
            res.status(200).json({ services });
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }
    applyOffer = async (req: CustomRequest, res: Response) => {
        try {
            const { categoryId } = req.params;
            const { error, value } = applyOfferSchema.validate(req.body);
            if (error) return res.status(400).json({ error: error.details[0].message });
            // const services = await serviceService.applyOffer(categoryId, value.plan, value.offer);
            const services = await serviceService.getServicesByCategoryAndSubcategories(categoryId, value.plan);
            res.status(200).json({services});
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }

}

export default new ServiceControls();