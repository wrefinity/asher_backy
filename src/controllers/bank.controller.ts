import { Response } from 'express';
import { BankInfoService } from '../services/bank.services';
import { bankInfoSchema } from '../validations/schemas/banks.schema';
import { CustomRequest } from '../utils/types';

const bankInfoService = new BankInfoService();

class BankInfoController {
    createBankInfo = async (req: CustomRequest, res: Response) => {
        const { error, value } = bankInfoSchema.validate(req.body);
        if (error) return res.status(400).json({ error: error.details[0].message });

        try {
            // Check if landlordId or vendorId is available from the user
            const landlordId = req.user?.landlords?.id || null;
            const vendorId = req.user?.vendors?.id || null;

            // Prevent creation if both landlordId and vendorId are null
            if (!landlordId && !vendorId) {
                return res.status(400).json({ error: 'kindly login aas landlord or vendor to add bank informations' });
            }

            const data = {
                ...value,
                landlordId: landlordId ? landlordId : undefined,
                vendorId: vendorId ? vendorId : undefined
            };

            const bankInfo = await bankInfoService.createBankInfo(data);
            return res.status(201).json({ bankInfo });
        } catch (err) {
            return res.status(500).json({ error: 'Failed to create bank info' });
        }
    }

    getBankInfo = async (req: CustomRequest, res: Response) => {
        try {
            const bankInfo = await bankInfoService.getBankInfoById(req.params.id);
            if (!bankInfo) return res.status(404).json({ error: 'Bank info not found' });
            return res.status(200).json(bankInfo);
        } catch (err) {
            return res.status(500).json({ error: 'Failed to retrieve bank info' });
        }
    }

    updateBankInfo = async (req: CustomRequest, res: Response) => {
        const { error } = bankInfoSchema.validate(req.body);
        if (error) return res.status(400).json({ error: error.details[0].message });

        try {
            const updatedBankInfo = await bankInfoService.updateBankInfo(req.params.id, req.body);
            return res.status(200).json(updatedBankInfo);
        } catch (err) {
            return res.status(500).json({ error: 'Failed to update bank info' });
        }
    }

    deleteBankInfo = async (req: CustomRequest, res: Response) => {
        try {
            await bankInfoService.deleteBankInfo(req.params.id);
            return res.status(204).send();
        } catch (err) {
            return res.status(500).json({ error: 'Failed to delete bank info' });
        }
    }

    getAllBankInfo = async (req: CustomRequest, res: Response) => {
        try {
            const bankInfoList = await bankInfoService.getAllBankInfo();
            return res.status(200).json(bankInfoList);
        } catch (err) {
            return res.status(500).json({ error: 'Failed to retrieve bank info' });
        }
    }
}


export default new BankInfoController()