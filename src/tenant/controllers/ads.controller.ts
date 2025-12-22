import { Request, Response } from "express";
import { CustomRequest } from "../../utils/types";
import { adSchema } from "../schema/adShema";
import adsServices from "../services/ads.services";
import { ApiResponse } from "../../utils/ApiResponse";
import { ApiError } from "../../utils/ApiError";
import { asyncHandler } from "../../utils/asyncHandler";

class AdController {
  constructor() {}

  createAd = asyncHandler(async (req: CustomRequest, res: Response) => {
    if (typeof req.body.bussinessDetails === "string") {
      req.body.bussinessDetails = JSON.parse(req.body.bussinessDetails);
    }

    const { value, error } = adSchema.validate(req.body);
    if (error) {
      throw ApiError.validationError(error.details.map((d) => d.message));
    }

    const userId = String(req.user.id);
    const data = { ...value };
    const attachment = req.body.cloudinaryUrls;
    delete data["cloudinaryUrls"];
    delete data["cloudinaryVideoUrls"];
    delete data["cloudinaryDocumentUrls"];
    delete data["cloudinaryAudioUrls"];

    const ad = await adsServices.createAd(
      { ...data, attachment },
      userId,
      value.currency
    );

    return res
      .status(201)
      .json(ApiResponse.created(ad, "Ad created successfully"));
  });

  listAd = asyncHandler(async (req: CustomRequest, res: Response) => {
    const adsId = req.params.adsId;
    const ads = await adsServices.listAds(adsId);

    return res
      .status(200)
      .json(ApiResponse.success(ads, "Ad listed successfully"));
  });

  getAdsById = asyncHandler(async (req: CustomRequest, res: Response) => {
    const { adsId } = req.params;
    const ads = await adsServices.getAdById(adsId);
    if (!ads) {
      throw ApiError.notFound("Ad not found");
    }

    return res
      .status(200)
      .json(ApiResponse.success(ads, "Ad retrieved successfully"));
  });

  getAllAds = asyncHandler(async (req: CustomRequest, res: Response) => {
    const ads = await adsServices.getAllAds();
    if (!ads || ads.length === 0) {
      return res.status(200).json(ApiResponse.success([], "No ads found"));
    }

    return res
      .status(200)
      .json(ApiResponse.success(ads, "Ads retrieved successfully"));
  });

  getAllListedAds = asyncHandler(async (req: Request, res: Response) => {
    const { latitude, longitude, radius, city, state, excludePremium } = req.query;

    const filters = {
      latitude: latitude ? parseFloat(latitude as string) : undefined,
      longitude: longitude ? parseFloat(longitude as string) : undefined,
      radius: radius ? parseFloat(radius as string) : undefined,
      city: city as string,
      state: state as string,
      excludePremium: excludePremium === 'true',
    };

    const ads = await adsServices.getAllListedAds(filters);
    if (!ads || ads.length === 0) {
      return res
        .status(200)
        .json(ApiResponse.success([], "No listed ads found"));
    }

    return res
      .status(200)
      .json(ApiResponse.success(ads, "Listed ads retrieved successfully"));
  });

  getPremiumBannerAds = asyncHandler(async (req: Request, res: Response) => {
    const ads = await adsServices.getPremiumBannerAds();
    if (!ads || ads.length === 0) {
      return res
        .status(200)
        .json(ApiResponse.success([], "No premium banner ads found"));
    }

    return res
      .status(200)
      .json(ApiResponse.success(ads, "Premium banner ads retrieved successfully"));
  });

  getAdsByLocation = asyncHandler(async (req: Request, res: Response) => {
    const { location, isListed } = req.query;
    const isListedBoolean = isListed === "false" ? false : Boolean(isListed);

    const ads = await adsServices.getAdsByLocation(location, isListedBoolean);
    if (!ads || ads.length === 0) {
      throw ApiError.notFound("No ads found in the specified location");
    }

    return res
      .status(200)
      .json(
        ApiResponse.success(ads, "Ads by location retrieved successfully")
      );
  });

  incrementAdsStats = asyncHandler(async (req: CustomRequest, res: Response) => {
    const { adsId } = req.params;
    const { statType } = req.body;

    const ads = await adsServices.increamentAdStats(adsId, statType);

    return res
      .status(200)
      .json(ApiResponse.success(ads, "Ad stats incremented successfully"));
  });

  getAdStats = asyncHandler(async (req: CustomRequest, res: Response) => {
    const { adsId } = req.params;
    const ads = await adsServices.getAdStats(adsId);

    if (!ads) {
      throw ApiError.notFound("Ad not found");
    }

    return res
      .status(200)
      .json(ApiResponse.success(ads, "Ad stats retrieved successfully"));
  });

  getAdsByUser = asyncHandler(async (req: CustomRequest, res: Response) => {
    const { userId } = req.params;
    const ads = await adsServices.getAdsByUserId(userId);

    if (!ads || ads.length === 0) {
      return res
        .status(200)
        .json(ApiResponse.success([], "No ads found for this user"));
    }

    return res
      .status(200)
      .json(ApiResponse.success(ads, "Ads by user retrieved successfully"));
  });

  getAdExpenses = asyncHandler(async (req: CustomRequest, res: Response) => {
    const { userId } = req.params;
    const expenses = await adsServices.getAdExpenses(userId);

    if (!expenses || expenses.length === 0) {
      return res
        .status(200)
        .json(ApiResponse.success([], "No ad expenses found"));
    }

    return res
      .status(200)
      .json(ApiResponse.success(expenses, "Ad expenses retrieved successfully"));
  });
}

export default new AdController();
