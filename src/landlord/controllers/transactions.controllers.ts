import { Response } from "express";
import errorService from "../../services/error.service";
import TransactionServices from "../../services/transaction.services";
import { CustomRequest } from "../../utils/types";
import { getCurrentCountryCurrency } from "../../utils/helpers";



class TransactionController {

    getTransaction = async (req: CustomRequest, res: Response) => {
        try {
            // Extract landlordId from the authenticated user
            const landlordId = req.user?.landlords?.id;
            if (!landlordId) return res.status(400).json({ message: "Landlord not found" });
            const propertyId = req.params.propertyId
            const transaction = await TransactionServices.getTransactionByProps(propertyId, landlordId)
            // }
            return res.status(201).json({ transaction })
        } catch (error) {
            errorService.handleError(error, res)
        }
    }
}

export default new TransactionController();