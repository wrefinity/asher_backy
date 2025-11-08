import { Response } from "express"
import { CustomRequest } from "../../utils/types"
import { PropertySearchDto } from "../../validations/interfaces/properties.interface";
import propertyServices from "../../services/propertyServices";
import { ApiResponse } from "../../utils/ApiResponse";
import { asyncHandler } from "../../utils/asyncHandler";
import logsServices from "../../services/logs.services";
import { LogType, EnquireStatus, logTypeStatus } from "@prisma/client";
import { ApiError } from "../../utils/ApiError";

class ProperyController {

    searchProperties = asyncHandler(async (req: CustomRequest, res: Response): Promise<void> => {
        const filters = req.body;
        const properties = await propertyServices.searchPropertiesForRecommendation(filters as PropertySearchDto);
        res.status(200).json(
            ApiResponse.success(properties)
        );
    })
    createPropertyEnquiry = asyncHandler(async (req: CustomRequest, res: Response) => {
        const enquiryData = req.body;
        const tenantId = req.user?.tenant?.id;
        const createdById = req.user?.id;
        const propertyListingId = enquiryData.propertyListingId;
    
        const propertyListing = await propertyServices.getPropertyListingByListingId(propertyListingId);
        if (!propertyListing) {
            return res.status(400).json(ApiError.badRequest("propertylisting is not found"));
        }
        
        const propsId = propertyListing.propertyId || undefined;
        const unitId = propertyListing.unitId || undefined;
        const roomId = propertyListing.roomId || undefined;
        const log = await logsServices.createLog({
            propertyId: propsId,
            events: enquiryData?.message,
            createdById,
            type: LogType.ENQUIRED,
            enquireStatus: EnquireStatus.EXISTING_TENANT,
            unitId,
            roomId,
            propertyListingId,
            status: logTypeStatus.PENDING
        })

        // npx prisma migrate dev --name "status on enquire"

        const newEnquiry = await propertyServices.createEnquiry({ 
            ...enquiryData,
            tenantId, 
            logId: log.id
        });
        res.status(201).json(
            ApiResponse.success(newEnquiry)
        );
    })

}


export default new ProperyController()