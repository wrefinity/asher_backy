import { Request, Response } from "express"
import { CustomRequest } from "../../utils/types"
import DocumentService from "../services/document.services"
import { ApiResponse } from "../../utils/ApiResponse"
import { asyncHandler } from "../../utils/asyncHandler"


class DocumentController {

    getUserDocuments = asyncHandler( async (req: CustomRequest, res: Response) => {
            const userId = req.user.id;
            const documents = await DocumentService.getUserDocuments(userId);
            res.status(200).json({ documents });
    })
    getAllDocuments = asyncHandler(async (req: Request, res: Response) => {
        const documents = await DocumentService.getAllDocuments();
        res.status(200).json(
            ApiResponse.success(documents)
        )
    })
}


export default new DocumentController()