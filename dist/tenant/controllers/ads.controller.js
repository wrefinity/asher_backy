"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const error_service_1 = __importDefault(require("../../services/error.service"));
const adShema_1 = require("../schema/adShema");
const ads_services_1 = __importDefault(require("../services/ads.services"));
class AdController {
    constructor() { }
    createAd(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            if (typeof req.body.bussinessDetails === "string") {
                req.body.bussinessDetails = JSON.parse(req.body.bussinessDetails);
            }
            try {
                const { value, error } = adShema_1.adSchema.validate(req.body);
                if (error) {
                    return res.status(400).json({ error: error.details[0].message });
                }
                const userId = String(req.user.id);
                const data = Object.assign({}, value);
                const attachment = req.body.cloudinaryUrls;
                delete data['cloudinaryUrls'];
                const ad = yield ads_services_1.default.createAd(Object.assign(Object.assign({}, data), { attachment }), userId, value.currency);
                return res.status(201).json(ad);
            }
            catch (error) {
                error_service_1.default.handleError(error, res);
            }
        });
    }
    // turn ad to listed so we can display it
    listAd(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            //NOTE: check if it is an admin listing this
            try {
                const adsId = req.params.adsId;
                const ads = yield ads_services_1.default.listAds(adsId);
                return res.status(200).json(ads);
            }
            catch (error) {
                error_service_1.default.handleError(error, res);
            }
        });
    }
    getAdsById(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const { adsId } = req.params;
                const ads = yield ads_services_1.default.getAdById(adsId);
                if (!ads) {
                    return res.status(404).json({ message: "Ad not found" });
                }
                return res.status(200).json(ads);
            }
            catch (error) {
                error_service_1.default.handleError(error, res);
            }
        });
    }
    getAllAds(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            //NOTE: check if it is an admin listing all ads
            try {
                const ads = yield ads_services_1.default.getAllAds();
                if (ads.length < 0) {
                    return res.status(200).json({ message: "No ads found" });
                }
                return res.status(200).json(ads);
            }
            catch (error) {
                error_service_1.default.handleError(error, res);
            }
        });
    }
    getAllListedAds(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const ads = yield ads_services_1.default.getAllListedAds();
                if (ads.length < 1) {
                    return res.status(200).json({ message: "No listed ads found" });
                }
                return res.status(200).json(ads);
            }
            catch (error) {
                error_service_1.default.handleError(error, res);
            }
        });
    }
    getAdsByLocation(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            const { location, isListed } = req.query;
            const isListedBoolean = isListed === 'false' ? false : Boolean(isListed);
            try {
                const ads = yield ads_services_1.default.getAdsByLocation(location, isListedBoolean);
                if (ads.length < 0)
                    return res.status(404).json({ message: "No Ads found in such location" });
                return res.status(200).json(ads);
            }
            catch (error) {
                error_service_1.default.handleError(error, res);
            }
        });
    }
    incrementAdsStats(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            //statsType is and enum of views, click & reach
            try {
                const { adsId } = req.params;
                const { statType } = req.body;
                const ads = yield ads_services_1.default.increamentAdStats(adsId, statType);
                return res.status(200).json(ads);
            }
            catch (error) {
                error_service_1.default.handleError(error, res);
            }
        });
    }
    getAdStats(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const { adsId } = req.params;
                const ads = yield ads_services_1.default.getAdStats(adsId);
                if (!ads) {
                    return res.status(404).json({ message: 'Ad not found' });
                }
                return res.status(200).json(ads);
            }
            catch (error) {
                error_service_1.default.handleError(error, res);
            }
        });
    }
    getAdsByUser(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const { userId } = req.params;
                const ads = yield ads_services_1.default.getAdsByUserId(userId);
                if (ads.length < 0) {
                    return res.status(200).json({ message: "No ads found by this user" });
                }
                return res.status(200).json(ads);
            }
            catch (error) {
                error_service_1.default.handleError(error, res);
            }
        });
    }
}
exports.default = new AdController();
