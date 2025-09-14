import { Response } from "express";
import ProfileServices from "../services/profileServices";
import { profileSchema, userSearchPreferenceSchema } from "../validations/schemas/profile";
import { CustomRequest } from "../utils/types";
import { ApiResponse } from "../utils/ApiResponse";
import { ApiError } from "../utils/ApiError";
import { asyncHandler } from "../utils/asyncHandler";

class ProfileControls {
  profileUpdate = asyncHandler(async (req: CustomRequest, res: Response) => {
    const userId = req.user.id;

    const profileInfo = await ProfileServices.findUserProfileByUserId(userId);
    if (!profileInfo) {
      throw ApiError.notFound("User profile not found");
    }

    const data = { ...req.body };
    const profileUrl = req.body.cloudinaryUrls?.[0];

    // Remove unwanted keys
    delete data.cloudinaryUrls;
    delete data.cloudinaryVideoUrls;
    delete data.cloudinaryDocumentUrls;
    delete data.cloudinaryAudioUrls;
    delete data.uploadedDocuments;
    delete data.id;

    
    const updatedUser = await ProfileServices.updateUserProfile(profileInfo.id, {
      ...data,
      profileUrl,
    });

    const { id, ...profile } = updatedUser;

    return res
      .status(200)
      .json(ApiResponse.success(profile, "Profile updated successfully"));
  });

  getCurrentUserProfile = asyncHandler(async (req: CustomRequest, res: Response) => {
    const userId = req.user.id;
    const profile = await ProfileServices.findUserProfileByUserId(userId);

    if (!profile) {
      throw ApiError.notFound("Profile not found");
    }

    return res
      .status(200)
      .json(ApiResponse.success(profile, "Profile retrieved successfully"));
  });

  addUserSearchPreference = asyncHandler(async (req: CustomRequest, res: Response) => {
    const userId = req.user?.id;

    const preference = await ProfileServices.createUserSearchPreference(req.body, userId);

    return res
      .status(201)
      .json(ApiResponse.created(preference, "Search preference saved successfully"));
  });
}

export default new ProfileControls();
