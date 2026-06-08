import { Response } from "express"
import { CustomRequest } from "../../utils/types"
import { PropertySearchDto } from "../../validations/interfaces/properties.interface";
import propertyServices from "../../services/propertyServices";
import { ApiResponse } from "../../utils/ApiResponse";
import { asyncHandler } from "../../utils/asyncHandler";
import logsServices from "../../services/logs.services";
import { LogType, EnquireStatus, logTypeStatus } from "@prisma/client";
import { ApiError } from "../../utils/ApiError";
import {
    buildCurrencyDisplayOptions,
    getClientIpFromRequest,
    resolveViewerCurrency,
} from "../../utils/currencyContext";
import LandlordSettingsService from "../../landlord/services/propertySetting.service";
import { resolveFinancialRules, getApplicationFeeRefundInfo } from "../../utils/globalSettings.util";

class ProperyController {

    searchProperties = asyncHandler(async (req: CustomRequest, res: Response): Promise<void> => {
        const filters = req.body;
        const ipAddress = getClientIpFromRequest(req);
        const viewerContext = await resolveViewerCurrency({
            userId: req.user?.id,
            currency: filters.displayCurrency || filters.currency,
            country: filters.country,
            countryCode: filters.countryCode,
            ipAddress,
        });
        const currencyOptions = buildCurrencyDisplayOptions(viewerContext, ipAddress);
        const properties = await propertyServices.searchPropertiesForRecommendation(
            filters as PropertySearchDto,
            currencyOptions
        );
        res.status(200).json(
            ApiResponse.success(properties, 'Success', { viewerContext })
        );
    })
    createPropertyEnquiry = asyncHandler(async (req: CustomRequest, res: Response) => {
        const {propertyListingId, ...enquiryData} = req.body;
        const tenantId = req.user?.tenant?.id;
        const createdById = req.user?.id;

    
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

    getApplicationFees = asyncHandler(async (req: CustomRequest, res: Response) => {
        const { propertyId } = req.params;
        if (!propertyId) {
            throw ApiError.badRequest('Property ID is required');
        }

        const property = await propertyServices.getPropertiesById(propertyId);
        if (!property) {
            throw ApiError.notFound('Property does not exist');
        }

        const { landlordId, price } = property;
        if (!landlordId || price == null) {
            throw ApiError.badRequest('Invalid property data');
        }

        const globalSettings = await LandlordSettingsService.getAllGlobalSettings(landlordId);
        const rent = Number(price);
        const rules = resolveFinancialRules(globalSettings, rent, property.priceFrequency);

        if (!globalSettings || rules.applicationFeePercent <= 0) {
            throw ApiError.badRequest('Application fee settings not found');
        }

        return res.status(200).json(
            ApiResponse.success({
                applicationFee: rules.applicationFeeAmount,
                applicationFeePercent: rules.applicationFeePercent,
                ...getApplicationFeeRefundInfo(rules),
            }, 'Application fee retrieved')
        );
    })

}


export default new ProperyController()
