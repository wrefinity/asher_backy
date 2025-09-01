import { Response } from "express"
import errorService from "../../services/error.service"
import { CustomRequest } from "../../utils/types"
import TenantsServices from "../services/tenants.services"
import applicantService from "../../webuser/services/applicantService"


class ProfileController {
    constructor() { }


    // getProfileData = async (req: CustomRequest, res: Response) => {
    //     try {
    //         const tenantId = req.params.tenantId;
    //         const tenant = await TenantsServices.getTenantByUserIdAndLandlordId(undefined, null, tenantId)
    //         return res.status(201).json({
    //             tenant
    //         });
    //     } catch (error) {
    //         errorService.handleError(error, res)
    //     }
    // }

    // Update tenant application data
    updateTenantApplicationData = async (req: CustomRequest, res: Response) => {
        try {
            const { tenantId } = req.params;
            const updateData = req.body;
            const tenant = await applicantService.updateTenantApplicationData(tenantId, updateData);

            return res.json({
                success: true,
                message: 'Tenant application data updated successfully',
                data: tenant
            });
        } catch (error) {
            return res.status(400).json({
                success: false,
                message: error.message
            });
        }
    }

    getProfileData = async (req: CustomRequest, res: Response) => {
        try {
            const { tenantId } = req.params;
            const tenant = await applicantService.getTenantWithApplicationData(tenantId);

            if (!tenant) {
                return res.status(404).json({
                    success: false,
                    message: 'Tenant not found'
                });
            }
            return res.json({
                success: true,
                data: tenant
            });
        } catch (error) {
            return res.status(400).json({
                success: false,
                message: error.message
            });
        }
    }

    // Get last application data for user
    getLastApplicationData = async (req: CustomRequest, res: Response) => {
        try {
            const { userId } = req.params;

            const applicationData = await applicantService.getLastApplicationDataForUser(userId);

            if (!applicationData) {
                return res.status(404).json({
                    success: false,
                    message: 'No approved application found for this user'
                });
            }
            return res.json({
                success: true,
                data: applicationData
            });
        } catch (error) {
            return res.status(400).json({
                success: false,
                message: error.message
            });
        }
    }

    // Attach last application data to tenant
    attachLastApplicationData = async (req: CustomRequest, res: Response) => {
        try {
            const { tenantId } = req.params;
            const tenant = await applicantService.attachLastApplicationDataToTenant(tenantId);
            return res.json({
                success: true,
                message: 'Last application data attached to tenant successfully',
                data: tenant
            });
        } catch (error) {
            return res.status(400).json({
                success: false,
                message: error.message
            });
        }
    }
}

export default new ProfileController();