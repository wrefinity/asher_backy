import { Response } from "express";
import ProfileServices from "../services/profileServices";
import { profileSchema, userSearchPreferenceSchema} from "../validations/schemas/profile"
import { CustomRequest } from "../utils/types";


class ProfileControls {

    profileUpdate = async (req: CustomRequest, res: Response) => {
        const { error, value } = profileSchema.validate(req.body);
        if (error) {
            return res.status(400).json({ message: error.details[0].message });
        }
        try {
            const userId = req.user.id;
            const profileInfo = await ProfileServices.findUserProfileByUserId(userId)
            const data = { ...value };
            const profileUrl = req.body.cloudinaryUrls[0];
            delete data['cloudinaryUrls']
            delete data['cloudinaryVideoUrls']
            delete data['cloudinaryDocumentUrls']
            delete data['cloudinaryAudioUrls']
            delete data['id']


            // Update the user profile in the database
            const updatedUser = await ProfileServices.updateUserProfile(profileInfo.id, { ...data, profileUrl });
            const { id, ...profile } = updatedUser;
            res.status(200).json({ message: 'Profile updated successfully', user: profile });

        } catch (error) {
            console.error('Error updating profile:', error);
            res.status(500).json({ message: 'Internal server error' });
        }
    }
    getCurrentUserProfile = async(req: CustomRequest, res: Response) => {
        try {
            console.log(req.user)
            const userId = req.user.id;
            const profile = await ProfileServices.findUserProfileByUserId(userId)
            return res.status(200).json({profile})
        } catch (error) {
            res.status(500).json({ message: error.message || 'Internal server error' });
        }
    }
    addUserSearchPreference = async (req: CustomRequest, res: Response) => {
        try {
          const userId = req.user?.id;
      
          const { error, value } = userSearchPreferenceSchema.validate(req.body);
          if (error) {
            return res.status(400).json({ message: error.details[0].message });
          }
      
          const preference = await ProfileServices.createUserSearchPreference(value, userId);
          return res.status(200).json({ preference });
      
        } catch (error) {
          return res.status(500).json({ message: error.message || 'Internal server error' });
        }
      }
      
}

export default new ProfileControls()