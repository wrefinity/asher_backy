import { Response } from "express";
import { CustomRequest } from "../../utils/types";
import errorService from "../../services/error.service";
import financeService from "../services/finance.service";

class FinanceController {
    async getFInanceIncome(req: CustomRequest, res: Response) {
        const { landlords } = req.user
        const landlordId = landlords.id
        const { propertyId } = req.params
        try {
            const income = await financeService.getFinanceIncome(propertyId, landlordId)
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
            const expenses = await financeService.getFInanceExpense(propertyId, landlordId)
            if (expenses.length < 1) {
                return res.status(200).json({ message: "No expenses found" })
            }
            return res.status(200).json(expenses)

        } catch (error) {
            errorService.handleError(error, res)
        }
    }
}

export default new FinanceController()