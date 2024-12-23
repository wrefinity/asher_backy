import { Request, Response } from 'express';
import LandlordSettingsService from '../services/propertySetting.service';
import {
    propApartmentSettingsUpdateSchema,
    GlobalSettingsSchema,
    propApartmentSettingsSchema
} from '../validations/schema/settings';
import { CustomRequest } from '../../utils/types';
import ErrorService from "../../services/error.service";
import PropertyServices from "../../services/propertyServices";

class SettingsController {

    createPropApartmentSetting = async (req: CustomRequest, res: Response) => {
        const { error, value } = propApartmentSettingsSchema.validate(req.body);
        console.log(error)
        if (error) {
            return res.status(400).json({ error: error.details[0].message });
        }
        try {
            const landlordId = req.user?.landlords?.id;
            const propertiesId = value.propertyId;
            const propertyExist = await PropertyServices.checkLandlordPropertyExist(landlordId, propertiesId);
            if (!propertyExist) return res.status(404).json({ message: "property does not exists" })
            if (!landlordId) return res.status(404).json({ message: "Landlord not found" })
            const createdSettings = await LandlordSettingsService.createOrUpdate({ ...value, landlordId });
            return res.status(201).json({createdSettings});
        } catch (err) {
            ErrorService.handleError(err, res);
        }
    }

    // Retrieve a single PropApartmentSettings by ID
    getById = async (req: CustomRequest, res: Response) => {
        const { id } = req.params;
        try {
            const settings = await LandlordSettingsService.getById(id);
            if (!settings) {
                return res.status(404).json({ error: 'Settings not found' });
            }
            return res.status(200).json(settings);
        } catch (err) {
            ErrorService.handleError(err, res);
        }
    }

    // Retrieve all PropApartmentSettings records
    getAllPropsApartSetting = async (req: CustomRequest, res: Response) => {
        try {
            const landlordId = req.user?.landlords?.id;
            const settings = await LandlordSettingsService.getLandlordPropsSetting(landlordId);
            return res.status(200).json(settings);
        } catch (err) {
            ErrorService.handleError(err, res);
        }
    }

    // Update an existing PropApartmentSettings by ID
    updatePropsApartSetting = async (req: CustomRequest, res: Response) => {
        const { id } = req.params;
        const { error, value } = propApartmentSettingsUpdateSchema.validate(req.body);

        if (error) {
            return res.status(400).json({ error: error.details[0].message });
        }
        try {
            const updatedSettings = await LandlordSettingsService.update(id, value);
            return res.status(200).json({ updatedSettings });
        } catch (err) {
            ErrorService.handleError(err, res);
        }
    }

    // Delete a PropApartmentSettings by ID
    deletePropsApartmentSetting = async (req: CustomRequest, res: Response) => {
        const { id } = req.params;
        try {
            await LandlordSettingsService.delete(id);
            return res.status(204).json();
        } catch (err) {
            ErrorService.handleError(err, res);
        }
    }

    // Create a new global setting for the landlord
    createGlobalSetting = async (req: CustomRequest, res: Response) => {
        // Validate request body against the schema
        const { error, value } = GlobalSettingsSchema.validate(req.body);

        // If validation fails, return an error with the validation message
        if (error) {
            return res.status(400).json({ error: error.details[0].message });
        }

        try {
            // Get landlord ID from authenticated user (assumed to be available in req.user)
            const landlordId = req.user?.landlords?.id;

            // Call the service to create the setting, passing in landlordId and validated data
            const createdSettings = await LandlordSettingsService.createGlobalSetting({ ...value, landlordId });

            // Respond with the newly created setting data
            return res.status(201).json(createdSettings);
        } catch (err) {
            // Handle any errors using the error service
            ErrorService.handleError(err, res);
        }
    }

    // Retrieve all global settings associated with the landlord
    getAllGlobalSettings = async (req: CustomRequest, res: Response): Promise<void> => {
        try {
            // Get landlord ID from authenticated user
            const landlordId = req.user?.landlords?.id;

            // Fetch all settings for the specified landlord
            const settings = await LandlordSettingsService.getAllGlobalSettings(landlordId);

            // Return the retrieved settings
            res.status(200).json(settings);
        } catch (error) {
            // Handle any errors using the error service
            ErrorService.handleError(error, res);
        }
    }

    // Update a specific landlord's global setting
    updateLandlordGlobalSetting = async (req: CustomRequest, res: Response) => {
        try {
            const { id } = req.params;

            // Retrieve the setting by ID to confirm it belongs to the authenticated landlord
            const checkSetting = await LandlordSettingsService.getGlobalSettingById(id);
            const landlordId = req.user?.landlords?.id;

            // Verify that only the landlord who created the setting can update it
            if (checkSetting.landlordId != landlordId) {
                return res.status(403).json({ message: "Only the landlord who created this setting can update it" });
            }

            // Update the setting with the provided data
            const setting = await LandlordSettingsService.updateGlobalSetting(id, req.body);

            // If update is successful, return the updated setting; otherwise, send a 'not found' message
            if (setting) return res.status(200).json({ setting });
            else return res.status(404).json({ message: 'Setting not found' });
        } catch (error) {
            // Handle errors using the error service
            ErrorService.handleError(error, res);
        }
    }

    // Delete a specific landlord's global setting
    deleteLandlordGlobalSetting = async (req: CustomRequest, res: Response) => {
        try {
            const { id } = req.params;

            // Retrieve the setting by ID to confirm it belongs to the authenticated landlord
            const checkSetting = await LandlordSettingsService.getGlobalSettingById(id);
            const landlordId = req.user?.landlords?.id;

            // Verify that only the landlord who created the setting can delete it
            if (checkSetting.landlordId == landlordId) {
                return res.status(403).json({ message: "Only the landlord who created this setting can delete it" });
            }

            // Delete the setting and confirm the deletion; otherwise, send a 'not found' message
            const setting = await LandlordSettingsService.deleteGlobalSetting(id);
            if (setting) res.status(200).json({ message: 'Setting deleted successfully' });
            else res.status(404).json({ message: 'Setting not found' });
        } catch (error) {
            // Handle deletion errors and return a message
            res.status(500).json({ message: 'Error deleting setting', error });
        }
    }

}

export default new SettingsController();
