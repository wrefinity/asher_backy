import { Response } from "express";
import { CustomRequest } from "../../utils/types";
import errorService from "../../services/error.service";
import financeService from "../services/finance.service";
import { getCountryCodeFromIp } from "../../utils/helpers";

class FinanceController {

    async getAllFinanceTransaction(req: CustomRequest, res: Response) {
        const { landlords } = req.user
        const landlordId = landlords.id
        try {
            const transactions = await financeService.getAllFinanceTransaction(landlordId)
            if (transactions.length < 1) {
                return res.status(200).json({ message: "No transactions found" })
            }
            return res.status(200).json(transactions)

        } catch (error) {
            errorService.handleError(error, res)
        }
    }

    async getFInanceIncome(req: CustomRequest, res: Response) {
        const { landlords } = req.user
        const landlordId = landlords.id
        const { propertyId } = req.params
        try {
            const income = await financeService.getFinanceIncome(landlordId)
            if (income.length < 1) {
                return res.status(200).json({ message: "No income found" })
            }
            return res.status(200).json(income)

        } catch (error) {
            errorService.handleError(error, res)
        }
    }

    async getFinancialExpenses(req: CustomRequest, res: Response) {
        const { landlords } = req.user
        const landlordId = landlords.id
        const { propertyId } = req.params
        try {
            const expenses = await financeService.getFInanceExpense(landlordId)
            if (expenses.length < 1) {
                return res.status(200).json({ message: "No expenses found" })
            }
            return res.status(200).json(expenses)

        } catch (error) {
            errorService.handleError(error, res)
        }
    }

    async generatePaymentLink(req: CustomRequest, res: Response) {
        const {landlords} = req.user;
        const landlodId = landlords.id;
        const { amount, expirationDate, email, description } = req.body;
        const userIpAddress = req.headers['x-forwarded-for'] || req.socket.remoteAddress;

        // Get country code from IP address
        const countryCode = await getCountryCodeFromIp(userIpAddress);

        try {
            const validAmount = Number(amount);

            // Generate payment link
            const fundWallet = await financeService.generatePaymentLink(landlodId, validAmount, 'usd', countryCode, expirationDate, description, email);

            res.status(200).json(fundWallet);
        } catch (error) {
            errorService.handleError(error, res);
        }
    }

    async getMonthlyAnalysis(req: CustomRequest, res: Response) {
        const { landlords } = req.user
        const landlordId = landlords.id
        const { propertyId, month, year } = req.params
        if (!month || !propertyId || !year) {
            return res.status(400).json({ message: "Please provide month, propertyId and year" })
        }
        try {
            const monthlyAnalysis = await financeService.getMonthlyAnalysis(parseFloat(month), parseFloat(year), propertyId, landlordId)
            return res.status(200).json(monthlyAnalysis)
        } catch (error) {
            errorService.handleError(error, res)
        }
    }

    async getIncomeStatistics(req: CustomRequest, res: Response) {
        const { landlords } = req.user;
        const landlordId = landlords.id;
        const { propertyId } = req.params;

        if (!propertyId) {
            return res.status(400).json({ message: "Please provide propertyId" });
        }

        try {
            const annualPayments = await financeService.getIncomeStatistics(propertyId, landlordId);
            return res.status(200).json(annualPayments);
        } catch (error) {
            errorService.handleError(error, res);
        }
    }

}

export default new FinanceController()