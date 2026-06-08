import { Response } from "express";
import UserServices from "../services/user.services";
import { CustomRequest } from "../utils/types";
import ErrorService from "../services/error.service";
import {
    getUserPrivacyPrefs,
    sanitizeUserForViewer,
} from "../utils/publicProfilePrivacy";

class UserControls {


    getUserById = async(req: CustomRequest, res: Response) => {
        try {
            const userId = req.params.userId;
            const viewerId = req.user?.id;
            const user = await UserServices.getUserById(userId);

            if (!user) {
                return res.status(404).json({ message: "User not found" });
            }

            if (viewerId && viewerId === userId) {
                return res.status(200).json({ user });
            }

            const prefs = await getUserPrivacyPrefs(userId);
            const sanitized = sanitizeUserForViewer(user, viewerId, prefs);
            return res.status(200).json({ user: sanitized });
        } catch (error) {
            ErrorService.handleError(error, res);
        }
    }
}

export default new UserControls()