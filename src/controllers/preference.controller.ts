import PreferencesService from "../services/preferences.service";
import ErrorService from "../services/error.service";
import { Response } from "express";
import { CustomRequest } from "../utils/types";
import { preferencesSchema, preferencesPrivacySchema } from "../validations/schemas/profile";

class PreferencesController {

    getPreferences = async (req: CustomRequest, res: Response) => {
        try {
            const userId = req.user.id;
            const preferences = await PreferencesService.getUserPreferences(userId);
            res.json(preferences);
        } catch (error) {
            ErrorService.handleError(error, res);
        }
    }

    updatePreferences = async (req: CustomRequest, res: Response) => {
        try {
            // Validate input using Joi
            const { error, value } = preferencesSchema.validate(req.body, {
                abortEarly: false, // Return all errors at once
                stripUnknown: true, // Remove unknown fields
            });

            if (error) {
                throw new Error(`Validation failed: ${error.details.map(d => d.message).join(', ')}`);
            }

            const userId = req.user.id;
            const updated = await PreferencesService.createOrUpdatePreferences(userId, value);
            res.json(updated);

        } catch (error) {
            ErrorService.handleError(error, res);
        }
    }

    updatePrivacySettings = async (req: CustomRequest, res: Response) => {
        try {
            const userId = req.user.id;
            // Validate input using Joi
            const { error, value } = preferencesPrivacySchema.validate(req.body, {
                abortEarly: false,
                stripUnknown: true,
            });

            if (error) {
                throw new Error(`Validation failed: ${error.details.map(d => d.message).join(', ')}`);
            }
            const { showBasicProfile, showContactDetails } = value;
            const updated = await PreferencesService.updatePrivacySettings(userId, {
                showBasicProfile,
                showContactDetails
            });

            return res.json(updated);
        } catch (error) {
            ErrorService.handleError(error, res);
        }
    }

    getDashboardLayout = async (req: CustomRequest, res: Response) => {
        try {
            // Validate user is authenticated
            if (!req.user || !req.user.id) {
                return res.status(401).json({ error: 'User not authenticated' });
            }

            const userId = req.user.id;
            const layout = await PreferencesService.getDashboardLayout(userId);
            
            // Return layout (can be null if user has no preferences yet)
            res.json({ 
                dashboardLayout: layout,
                success: true 
            });
        } catch (error) {
            ErrorService.handleError(error, res);
        }
    }

    updateDashboardLayout = async (req: CustomRequest, res: Response) => {
        try {
            // Validate user is authenticated
            if (!req.user || !req.user.id) {
                return res.status(401).json({ error: 'User not authenticated' });
            }

            const userId = req.user.id;
            const { cardOrder } = req.body;

            if (!Array.isArray(cardOrder)) {
                return res.status(400).json({ error: 'cardOrder must be an array' });
            }

            const updated = await PreferencesService.updateDashboardLayout(userId, { cardOrder });
            res.json({ 
                success: true, 
                message: 'Dashboard layout updated successfully',
                dashboardLayout: updated.dashboardLayout 
            });
        } catch (error) {
            ErrorService.handleError(error, res);
        }
    }
}

export default new PreferencesController()