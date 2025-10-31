import { Response } from "express"
import { CustomRequest } from "../../utils/types"
import { PropertySearchDto } from "../../validations/interfaces/properties.interface";
import propertyServices from "../../services/propertyServices";
import { ApiResponse } from "../../utils/ApiResponse";
import { asyncHandler } from "../../utils/asyncHandler";


class ProperyController {

    searchProperties = asyncHandler(async (req: CustomRequest, res: Response): Promise<void> => {
        const filters = req.body;
        const properties = await propertyServices.searchPropertiesForRecommendation(filters as PropertySearchDto);
        res.status(200).json(
            ApiResponse.success(properties)
        );
    })

}


export default new ProperyController()