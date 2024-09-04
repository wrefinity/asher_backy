import { Response } from "express";
import ProfileServices from "../services/profileServices";
import {profileSchema} from "../validations/schemas/profile"
import { CustomRequest } from "../utils/types";


class ProfileControls {


    profileUpdate = async (req: CustomRequest, res: Response) => {
        const { error, value} = profileSchema.validate(req.body);
        if (error) {
            return res.status(400).json({ message: error.details[0].message });
        }
        try {
            // const userId = req.user.id;
            const {profileId} = req.params;
            const data = { ...value };
            const profileUrl = req.body.cloudinaryUrls[0];
            delete data['cloudinaryUrls']
            delete data['cloudinaryVideoUrls']
            delete data['cloudinaryDocumentUrls']

        
            // Update the user profile in the database
            const updatedUser = await ProfileServices.updateUserProfile(profileId, {...data, profileUrl});
            const {id, ...profile} = updatedUser;
            res.status(200).json({ message: 'Profile updated successfully', user: profile });

        } catch (error) {
            console.error('Error updating profile:', error);
            res.status(500).json({ message: 'Internal server error' });
        }
    }
}

export default new ProfileControls()