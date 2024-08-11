import { Request, Response } from "express"
import errorService from "../../services/error.service"
import { CustomRequest } from "../../utils/types"
import DocumentService from "../services/document.services"


class DocumentController {

    getUserDocuments = async (req: CustomRequest, res: Response) => {
        try {
            const userId = req.user.id;
            const documents = await DocumentService.getUserDocuments(userId);
            res.status(200).json({documents});
        } catch (error) {
            errorService.handleError(error, res)
        }
    }
    getAllDocuments  = async(req: Request, res: Response) => {
        try {
            const documents = await DocumentService.getAllDocuments();
            res.status(200).json({documents});
        } catch (error) {
            errorService.handleError(error, res)
        }
    }
}


export default new DocumentController()