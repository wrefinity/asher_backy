import { Response } from "express";
import { BankInfoService } from "../services/bank.services";
import { CustomRequest } from "../utils/types";
import { ApiError } from "../utils/ApiError";
import { ApiResponse } from "../utils/ApiResponse";
import { asyncHandler } from "../utils/asyncHandler";
import adService from "../services/ad.service";
const bankInfoService = new BankInfoService();

class AdsController {

  create = asyncHandler(async (req: CustomRequest, res: Response) => {
    const { id, role } = req.user as any;
    const ad = await adService.createAd(id, role, req.body);
    return res.status(201).json(
      ApiResponse.success(
        ad,
        'Ad submitted for approval'
      )
    );
  });

  getCarousel = asyncHandler(async (req: CustomRequest, res: Response) => {
    const { type } = req.query;

    const ads = await adService.getActiveAds(type as any);
    return res.json(
      ApiResponse.success(
        ads,
        'Active ads retrieved successfully'
      )
    );
  });

  approve = asyncHandler(async (req: CustomRequest, res: Response) => {
    const ad = await adService.approveAd(req.params.id);
    return res.json(
      ApiResponse.success(
        ad,
        'Ad approved'
      )
    );
  });

  pause = asyncHandler(async (req: CustomRequest, res: Response) => {
    const ad = await adService.pauseAd(req.params.id);
    return res.status(200).json(
      ApiResponse.success(
        ad,
        'Ad paused'
      )
    )
  });

  impression = asyncHandler(async (req: CustomRequest, res: Response) => {
    const ads = await adService.trackImpression(req.params.id);
    res.sendStatus(204);
       return res.status(200).json(
      ApiResponse.success(
        ads,
        'Ad impression tracked'
      )
    )
  });

  adClicks = asyncHandler(async (req: CustomRequest, res: Response) => {
    await adService.trackClick(req.params.id);
    res.sendStatus(204);
  });


  getPlans =  asyncHandler(async (req: CustomRequest, res: Response) =>{
    const plans = await adService.getPlans();
    return res.json(
      ApiResponse.success(
        plans,
        'Ad plans retrieved successfully'
      )
    );
  })

  subscribe =  asyncHandler(async (req: CustomRequest, res: Response) =>{
    const { id, role } = req.user;
    const { planId } = req.body;

    const sub = await adService.subscribe(id, role, planId);
    return res.status(201).json(
      ApiResponse.success(
        sub,
        'Subscribed successfully'
      )
    );
  })
}

export default new AdsController();