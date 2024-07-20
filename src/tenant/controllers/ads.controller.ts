import { Request, Response } from "express"
import errorService from "../../services/error.service"
import { CustomRequest } from "../../utils/types"
import { adSchema } from "../schema/adShema"
import adsServices from "../services/ads.services"


class AdController {
    constructor() { }

    async createAd(req: CustomRequest, res: Response) {
        try {
            const { value, error } = adSchema.validate(req.body)
            if (error) {
                return res.status(400).json({ error: error.details[0].message })
            }
            const userId = String(req.user.id)
            const ad = await adsServices.createAd(value, userId)
            return res.status(201).json(ad)
        } catch (error) {
            errorService.handleError(error, res)
        }
    }

    // turn ad to listed so we can display it
    async listAd(req: Request, res: Response) {
        //NOTE: check if it is an admin listing this
        try {
            const { adsId } = req.params;
            const ads = await adsServices.listAds(adsId)
            return res.status(200).json(ads)
        } catch (error) {
            errorService.handleError(error, res)
        }
    }
    async getAdsById(req: Request, res: Response) {
        try {
            const { adsId } = req.params;
            const ads = await adsServices.getAdById(adsId)
            if (!ads) {
                return res.status(404).json({ message: "Ad not found" })
            }
            return res.status(200).json(ads)
        } catch (error) {
            errorService.handleError(error, res)
        }
    }

    async getAllAds(req: CustomRequest, res: Response) {
        //NOTE: check if it is an admin listing all ads

        try {
            const ads = await adsServices.getAllAds()
            if (ads.length < 0) {
                return res.status(200).json({ message: "No ads found" })
            }
            return res.status(200).json(ads)
        } catch (error) {
            errorService.handleError(error, res)
        }
    }

    async getAllListedAds(req: Request, res: Response) {
        try {
            const ads = await adsServices.getAllListedAds()
            if (ads.length < 0) {
                return res.status(200).json({ message: "No listed ads found" })
            }
            return res.status(200).json(ads)
        } catch (error) {
            errorService.handleError(error, res)
        }
    }

    async getAdsByLocation(req: Request, res: Response) {
        try {
            const { location } = req.query;
            const ads = await adsServices.getAdsByLocation(location)
            if (ads.length < 0) return res.status(404).json({ message: "No Ads found in such location" })
            return res.status(200).json(ads)
        } catch (error) {
            errorService.handleError(error, res)
        }
    }

    async incrementAdsStats(req: Request, res: Response) {
        //statsType is and enum of views, click & reach
        try {
            const { adsId } = req.params;
            const { statType } = req.body
            const ads = await adsServices.increamentAdStats(adsId, statType)
            return res.status(200).json(ads)
        } catch (error) {
            errorService.handleError(error, res)
        }
    }

    async getAdStats(req: Request, res: Response) {
        try {
            const { adsId } = req.params;
            const ads = await adsServices.getAdStats(adsId)
            if (!ads) {
                return res.status(404).json({ message: 'Ad not found' });
            }
            return res.status(200).json(ads)
        } catch (error) {
            errorService.handleError(error, res)
        }
    }

    async getAdsByUser(req: Request, res: Response) {
        try {
            const { userId } = req.params;
            const ads = await adsServices.getAdsByUserId(userId)
            if (ads.length < 0) {
                return res.status(200).json({ message: "No ads found by this user" })
            }
            return res.status(200).json(ads)
        } catch (error) {
            errorService.handleError(error, res)
        }
    }
}

export default new AdController();