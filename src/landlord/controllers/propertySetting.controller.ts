import { Request, Response } from 'express';
import PropApartmentSettingsService from '../services/propertySetting.service';
import {propApartmentSettingsUpdateSchema, propApartmentSettingsSchema } from '../validations/schema/propSettingSchema';
import { CustomRequest } from '../../utils/types';
import ErrorService from "../../services/error.service";


class PropApartmentSettingsController {
    
    createPropApartmentSetting = async (req: CustomRequest, res: Response) => {
        const { error, value } = propApartmentSettingsSchema.validate(req.body);

        if (error) {
            return res.status(400).json({ error: error.details[0].message });
        }

        try {
            const createdSettings = await PropApartmentSettingsService.create(value);
            return res.status(201).json(createdSettings);
        } catch (err) {
            ErrorService.handleError(err, res);
        }
    }

    // Retrieve a single PropApartmentSettings by ID
    getById = async (req: CustomRequest, res: Response) => {
        const { id } = req.params;

        try {
            const settings = await PropApartmentSettingsService.getById(id);
            if (!settings) {
                return res.status(404).json({ error: 'Settings not found' });
            }
            return res.status(200).json(settings);
        } catch (err) {
            ErrorService.handleError(err, res);
        }
    }

    // Retrieve all PropApartmentSettings records
    getAllPropsApartSetting =  async (req: Request, res: Response) =>{
        try {
            const settings = await PropApartmentSettingsService.getAll();
            return res.status(200).json(settings);
        } catch (err) {
            ErrorService.handleError(err, res);
        }
    }

    // Update an existing PropApartmentSettings by ID
    updatePropsApartSetting = async (req: CustomRequest, res: Response) =>{
        const { id } = req.params;
        const { error, value } = propApartmentSettingsUpdateSchema.validate(req.body);

        if (error) {
            return res.status(400).json({ error: error.details[0].message });
        }

        try {
            const updatedSettings = await PropApartmentSettingsService.update(id, value);
            return res.status(200).json({updatedSettings});
        } catch (err) {
            ErrorService.handleError(err, res);
        }
    }

    // Delete a PropApartmentSettings by ID
    deletePropsApartmentSetting = async (req: CustomRequest, res: Response) =>{
        const { id } = req.params;

        try {
            await PropApartmentSettingsService.delete(id);
            return res.status(204).json();
        } catch (err) {
            ErrorService.handleError(err, res);
        }
    }
}

export default new PropApartmentSettingsController();
