import { Response } from "express";
import errorService from "../services/error.service";
// import paystackServices from "../services/paystack.services";
import transactionServices from "../services/transaction.services";
import walletService from "../services/wallet.service";
import { CustomRequest } from "../utils/types";
import transactionScheam, { TransactionQuerySchema } from "../validations/schemas/transaction.schema";
import { getCurrentCountryCurrency } from "../utils/helpers";
import PropertyServices from "../services/propertyServices";



class TransactionController {
    makeTransaction = async (req: CustomRequest, res: Response) => {
        const userId = String(req.user.id);
        const { value, error } = transactionScheam.transactSchema().validate(req.body)
        if (error) return res.status(400).json({ message: error.details[0].message })

        try {
            const amount = Number(value.amount);
            // get the props to ensure that props exist and also get the landlord from it
            const props = await PropertyServices.getPropertiesById(value.propertyId);
            if (!props) return res.status(400).json({ message: "property does not exist" })
            // get the landlordId
            const landlordUserId = props.landlord.userId;

            let transaction;
            const locationData = await getCurrentCountryCurrency();
            transaction = await transactionServices.createTransact({ userId, currency: locationData?.locationCurrency, ...value, amount }, landlordUserId)
            res.status(201).json({ transaction })

        } catch (error) {
            errorService.handleError(error, res)
        }
    }
    fundWallet = async (req: CustomRequest, res: Response) => {
        const userId = String(req.user.id);
        const { value, error } = transactionScheam.create().validate(req.body)
        if (error) {
            return res.status(400).json({ message: error.details[0].message })
        }

        try {
            const amount = Number(value.amount);
            // const authorizationUrl = await walletService.fundWallet(userId, amount)
            // const authorizationUrl = await walletService.fundWalletUsingFlutter(userId, amount)
            let authorizationUrl;
            const locationData = await getCurrentCountryCurrency();
            // if(value.gateWayType == GateWayType.STRIPE){
            authorizationUrl = await walletService.fundWalletGeneral(userId, amount, locationData?.locationCurrency, locationData.country_code, value.gateWayType)
            // }
            res.status(201).json({ authorizationUrl })

        } catch (error) {
            errorService.handleError(error, res)
        }
    }
    getTransaction = async (req: CustomRequest, res: Response) => {

        // Get userId from authenticated user or params
        const userId =  req.params.userId || req.user?.id

        try {

            // Validate query parameters (reuse the same schema from earlier)
            const { error, value } = TransactionQuerySchema.validate(req.query);
            if (error) throw new Error(`Invalid query parameters: ${error.message}`);
            const result = await transactionServices.getTransactionsByUser(
                userId,
                value
            );

            return res.status(200).json({
                success: true,
                data: result.data,
                pagination: result.pagination
            });

        } catch (error) {
            errorService.handleError(error, res)
        }
    }
}

export default new TransactionController();