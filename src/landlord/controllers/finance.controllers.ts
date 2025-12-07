import { Response } from "express";
import { CustomRequest } from "../../utils/types";
import errorService from "../../services/error.service";
import financeService from "../services/finance.service";
import { getCountryCodeFromIp } from "../../utils/helpers";
import { budgetSchema } from "../validations/schema/financeSceham";
import { Currency } from "@prisma/client";

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
        const { landlords } = req.user;
        const landlordId = landlords.id;
        const year = req.query.year ? parseInt(req.query.year as string) : undefined;
        try {
            const income = await financeService.getFinanceIncome(landlordId, year);
            if (income.length < 1) {
                return res.status(200).json({ message: "No income found" });
            }
            return res.status(200).json(income);
        } catch (error) {
            errorService.handleError(error, res);
        }
    }

    async getFinancialExpenses(req: CustomRequest, res: Response) {
        const { landlords } = req.user;
        const landlordId = landlords.id;
        const year = req.query.year ? parseInt(req.query.year as string) : undefined;
        try {
            const expenses = await financeService.getFInanceExpense(landlordId, year);
            if (expenses.length < 1) {
                return res.status(200).json({ message: "No expenses found" });
            }
            return res.status(200).json(expenses);
        } catch (error) {
            errorService.handleError(error, res);
        }
    }

    async generatePaymentLink(req: CustomRequest, res: Response) {
        const userId = req.user.id;

        const { amount, expirationDate, email, description, payeeId, countryCode, currency } = req.body;
        if (!payeeId || !amount || ! countryCode || !currency) {
            return res.status(400).json({ message: "Please provide payeeId, currency type, country code, and amount" });
        }
        //NOTE: Get the userId from user table using the email
        // const userIpAddress = req.headers['x-forwarded-for'] || req.socket.remoteAddress;

        // // Get country code from IP address
        // const countryCode = await getCountryCodeFromIp(userIpAddress);

        // Validate currency is one of the enum values
        if (!Object.values(Currency).includes(currency)) {
            return res.status(400).json({
                message: "Invalid currency",
                validCurrencies: Object.values(Currency)
            });
        }
        try {
            const validAmount = Number(amount);

            // Generate payment link
            const fundWallet = await financeService.generatePaymentLink(payeeId, userId, validAmount, currency, countryCode, expirationDate, description, email);

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

    async createBudget(req: CustomRequest, res: Response) {
        const { error, value } = budgetSchema.validate(req.body);
        if (error) return res.status(400).json({ message: error.details[0].message });
        const { propertyId, transactionType, budgetAmount, frequency } = value;

        try {
            const budget = await financeService.createBudget(propertyId, transactionType, budgetAmount, frequency);
            res.status(201).json(budget);
        } catch (error) {
            errorService.handleError(error, res)
        }
    }

    async updateBudget(req: CustomRequest, res: Response) {
        const { amount } = req.body;
        const { id } = req.params;

        try {
            await financeService.updateBudget(id, amount);
            res.status(200).json({ message: 'Budget updated successfully' });
        } catch (error) {
            errorService.handleError(error, res)
        }
    }

    async getIncomeBreakdown(req: CustomRequest, res: Response) {
        const { landlords } = req.user;
        const landlordId = landlords.id;
        const year = req.query.year ? parseInt(req.query.year as string) : undefined;
        try {
            const breakdown = await financeService.getIncomeBreakdown(landlordId, year);
            return res.status(200).json(breakdown);
        } catch (error) {
            errorService.handleError(error, res);
        }
    }

    async getExpenseBreakdown(req: CustomRequest, res: Response) {
        const { landlords } = req.user;
        const landlordId = landlords.id;
        const year = req.query.year ? parseInt(req.query.year as string) : undefined;
        try {
            const breakdown = await financeService.getExpenseBreakdown(landlordId, year);
            return res.status(200).json(breakdown);
        } catch (error) {
            errorService.handleError(error, res);
        }
    }

    async getStats(req: CustomRequest, res: Response) {
        const { landlords } = req.user;
        const landlordId = landlords.id;
        const year = req.query.year ? parseInt(req.query.year as string) : undefined;
        try {
            const stats = await financeService.getStats(landlordId, year);
            console.log(stats, "Logging Stats")
            return res.status(200).json(stats);
        } catch (error) {
            errorService.handleError(error, res);
        }
    }

    async getRecentTransactions(req: CustomRequest, res: Response) {
        const { landlords } = req.user;
        const landlordId = landlords.id;
        // Parse limit with validation - default to 5 if invalid or undefined
        let limit = 5;
        if (req.query.limit) {
            const parsedLimit = parseInt(req.query.limit as string, 10);
            if (!isNaN(parsedLimit) && parsedLimit > 0) {
                limit = parsedLimit;
            }
        }
        try {
            const txs = await financeService.getRecentTransactions(landlordId, limit);
            return res.status(200).json({
                message: "Recent transactions retrieved successfully",
                txs
            });
        } catch (error) {
            errorService.handleError(error, res);
        }
    }

    async getUpcomingPayments(req: CustomRequest, res: Response) {
        const { landlords } = req.user;
        const landlordId = landlords.id;
        try {
            const txs = await financeService.getUpcomingPayments(landlordId);
            return res.status(200).json({
                message: "No recent upcoming payments",
                txs
            });
        } catch (error) {
            errorService.handleError(error, res);
        }
    }

}

export default new FinanceController()