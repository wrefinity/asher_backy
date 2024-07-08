import { Response } from "express";
import ProfileServices from "../services/profileServices";
import {profileSchema} from "../schemas/profile"
import { CustomRequest } from "../utils/types";
import {uploadToCloudinary } from "../middlewares/multerCloudinary"; 

class ProfileControls {


    profileUpdate = async (req: CustomRequest, res: Response) => {
        const { error, value} = profileSchema.validate(req.body);
        if (error) {
            return res.status(400).json({ message: error.details[0].message });
        }
        try {
            const userId = req.user.id;
            const updatedData = { ...value };

            if (req.files) {
                const files = req.files as { [fieldname: string]: Express.Multer.File[] };
                const allFiles = Object.values(files).flat();

                if (allFiles.length > 0) {
                    await uploadToCloudinary(req, res, async (err) => {
                        if (err) {
                            return res.status(500).json({ message: 'File upload error', error: err });
                        }
                        const cloudinaryUrls = req.body.cloudinaryUrls;
                        if (cloudinaryUrls.length > 0) {
                            updatedData.profileUrl = cloudinaryUrls[0];
                        }
                    });
                }
            }

            // Update the user profile in the database
            const updatedUser = await ProfileServices.updateUserProfile(userId, updatedData);
            const {id, ...profile} = updatedUser;
            res.status(200).json({ message: 'Profile updated successfully', user: profile });

        } catch (error) {
            console.error('Error updating profile:', error);
            res.status(500).json({ message: 'Internal server error' });
        }
    }
}

export default new ProfileControls()