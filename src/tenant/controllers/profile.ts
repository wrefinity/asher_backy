import { Response } from "express"
import { CustomRequest } from "../../utils/types"
import applicantService from "../../webuser/services/applicantService"
import { asyncHandler } from "../../utils/asyncHandler"
import { ApiResponse } from "../../utils/ApiResponse"
import { ApiError } from "../../utils/ApiError"
import TenantJourneyService from "../services/tenantJourney.service"


class ProfileController {
    constructor() { }

    // Update tenant application data
    updateTenantApplicationData = asyncHandler(async (req: CustomRequest, res: Response) => {

        const { tenantId } = req.params;
        const updateData = req.body;
        const tenant = await applicantService.updateTenantApplicationData(tenantId, updateData);

        return res.json(
            ApiResponse.success(
                tenant,
                'Tenant application data updated successfully',
            )
        );
    })

    getProfileData = asyncHandler(async (req: CustomRequest, res: Response) => {

        const { tenantId } = req.params;
        const bundle = await applicantService.getTenantProfileBundle(tenantId);

        if (!bundle?.tenant) {
            return res.status(404).json(
                ApiError.notFound('Tenant not found')
            );
        }
        return res.json(
            ApiResponse.success(bundle)
        )

    })

    getTenantJourney = asyncHandler(async (req: CustomRequest, res: Response) => {
        const { tenantId } = req.params;
        const userId = req.user?.id;

        if (!userId) {
            throw ApiError.unauthorized('Authentication required');
        }

        const feed = await TenantJourneyService.getJourneyFeed(tenantId, userId);

        return res.json(
            ApiResponse.success(feed, 'Tenant journey retrieved successfully')
        );
    })

    // Get last application data for user
    getLastApplicationData = asyncHandler(async (req: CustomRequest, res: Response) => {

        const { userId } = req.params;

        const applicationData = await applicantService.getLastApplicationDataForUser(userId);

        if (!applicationData) {
            return res.status(404).json(
                ApiError.notFound('No application data found for this user')
            );
        }
        return res.json(
            ApiResponse.success(
                applicationData
            )
        );

    })

    // Attach last application data to tenant
    attachLastApplicationData = asyncHandler(async (req: CustomRequest, res: Response) => {
        const { tenantId } = req.params;
        const tenant = await applicantService.attachLastApplicationDataToTenant(tenantId);
        return res.json(
            ApiResponse.success(
                {
                    success: true,
                    data: tenant
                },
                'Last application data attached to tenant successfully'
            )
        );
    })
}

export default new ProfileController();