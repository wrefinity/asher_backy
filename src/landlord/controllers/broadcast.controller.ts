import { Response } from "express";
import { CustomRequest } from "../../utils/types";
import errorService from "../../services/error.service";
import broadcastService from "../services/broadcast.service";

class BroadcastController {
    constructor() {}

    getBroadcastById = async (req:CustomRequest, res:Response) => {
        const { id } = req.params;
        const {landlords} = req.user
        const landlordId = landlords?.id;
        try {
            const broadcast = await broadcastService.getBroadcastById(id, landlordId);
            if (!broadcast) return res.status(404).json({ message: "Broadcast not found" }); 
            return res.status(201).json(broadcast);
        } catch (error) {
            errorService.handleError(error, res)
        }
    }

    getBroadcastByCategory = async(req:CustomRequest, res:Response) => {
        const { category } = req.params;
        const {landlords} = req.user
        const landlordId = landlords?.id;
        try {
            const broadcasts = await broadcastService.getBroadcastByCategory(category, landlordId);
            if (!broadcasts) return res.status(404).json({ message: "Broadcast not found" }); 
            return res.status(201).json(broadcasts);
        } catch (error) {
            errorService.handleError(error, res)
        }
    }

    getBroadcastsByLandlord = async (req: CustomRequest, res: Response) => {
        const {landlords} = req.user
        const landlordId = landlords?.id;
        try {
            const broadcasts = await broadcastService.getBroadcastsByLandlord(landlordId);
            if (!broadcasts) return res.status(404).json({ message: "Landlord has no Broadcast" });
            return res.status(201).json(broadcasts);
        } catch (error) {
            errorService.handleError(error, res)
        }
    }

    // createBroadcast = async (req: CustomRequest, res: Response) => {
    //     const {landlords} = req.user
    //     const landlordId = landlords?.id;
    //     try {
    //         const broadcast = await broadcastService.sendBroadcast(req.body, landlordId);
    //         return res.status(201).json(broadcast);
    //     } catch (error) {
    //         errorService.handleError(error, res)
    //     }
    // }

}
export default new BroadcastController();