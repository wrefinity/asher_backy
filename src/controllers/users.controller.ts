import { Response } from "express";
import UserServices from "../services/user.services";
import { CustomRequest } from "../utils/types";
import ErrorService from "../services/error.service";

class UserControls {


    getUserById = async(req: CustomRequest, res: Response) => {
        try {
            const userId = req.params.userId;
            const user = await UserServices.getUserById(userId)
            return res.status(200).json({user})
        } catch (error) {
            ErrorService.handleError(error, res);
        }
    }
}

export default new UserControls()