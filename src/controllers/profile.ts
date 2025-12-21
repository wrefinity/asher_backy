import { Response } from "express";
import ProfileServices from "../services/profileServices";
import { profileSchema, userSearchPreferenceSchema } from "../validations/schemas/profile";
import { CustomRequest } from "../utils/types";
import { ApiResponse } from "../utils/ApiResponse";
import { ApiError } from "../utils/ApiError";
import { asyncHandler } from "../utils/asyncHandler";
import { prismaClient } from "..";

class ProfileControls {
  profileUpdate = asyncHandler(async (req: CustomRequest, res: Response) => {
    const userId = req.user.id;

    const profileInfo = await ProfileServices.findUserProfileByUserId(userId);
    if (!profileInfo) {
      throw ApiError.notFound("User profile not found");
    }

    const data = { ...req.body };
    console.log("validationsss");
    console.log(data);
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

  // NEW ENDPOINT: Get profile with application data merged
  getProfileWithApplicationData = asyncHandler(async (req: CustomRequest, res: Response) => {
    const userId = req.user.id;

    // Get basic profile
    const profile = await ProfileServices.findUserProfileByUserId(userId);

    // Get tenant with application data
    const tenant = await prismaClient.tenants.findFirst({
      where: { userId },
      select: {
        id: true,
        personalInfo: true,
        nextOfKinInfo: true,
        employmentInfo: true,
        guarantorInfo: true,
        emergencyContactInfo: true,
        residentialInfo: true,
        user: {
          select: {
            email: true,
            profile: true
          }
        }
      }
    });

    // If no tenant data, return basic profile
    if (!tenant) {
      return res.status(200).json(
        ApiResponse.success(profile || {}, "Profile retrieved successfully")
      );
    }

    const personalInfo = tenant.personalInfo as any;
    const residentialInfo = tenant.residentialInfo as any;

    // Build merged profile
    const mergedProfile = {
      id: profile?.id || tenant.user?.profile?.id || '',
      fullname: profile?.fullname && profile.fullname !== 'undefined undefined'
        ? profile.fullname
        : `${personalInfo?.firstName || ''} ${personalInfo?.middleName || ''} ${personalInfo?.lastName || ''}`.trim(),
      firstName: profile?.firstName || personalInfo?.firstName || null,
      lastName: profile?.lastName || personalInfo?.lastName || null,
      middleName: profile?.middleName || personalInfo?.middleName || null,
      phoneNumber: profile?.phoneNumber || personalInfo?.phoneNumber || null,
      gender: profile?.gender || null,
      address: profile?.address || residentialInfo?.address || null,
      country: profile?.country || residentialInfo?.country || null,
      city: profile?.city || residentialInfo?.city || null,
      state: profile?.state || residentialInfo?.state || null,
      zip: profile?.zip || residentialInfo?.zipCode || null,
      maritalStatus: profile?.maritalStatus || personalInfo?.maritalStatus || null,
      dateOfBirth: profile?.dateOfBirth || personalInfo?.dob || null,
      profileUrl: profile?.profileUrl || tenant.user?.profile?.profileUrl || null,
      title: profile?.title || personalInfo?.title || null,
      unit: profile?.unit || null,
      timeZone: profile?.timeZone || null,
      taxPayerId: profile?.taxPayerId || null,
      taxType: profile?.taxType || null,
      _source: (!profile || !profile.firstName) ? 'merged' : 'profile'
    };

    return res.status(200).json(
      ApiResponse.success(mergedProfile, "Profile with application data retrieved successfully")
    );
  });
}

export default new ProfileControls();
