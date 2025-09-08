import { Response } from "express";
import { BankInfoService } from "../services/bank.services";
import { bankInfoSchema } from "../validations/schemas/banks.schema";
import { CustomRequest } from "../utils/types";
import { ApiError } from "../utils/ApiError";
import { ApiResponse } from "../utils/ApiResponse";
import { asyncHandler } from "../utils/asyncHandler";
const bankInfoService = new BankInfoService();

class BankInfoController {
  createBankInfo = asyncHandler(async (req: CustomRequest, res: Response) => {
    const { error, value } = bankInfoSchema.validate(req.body);
    if (error) throw ApiError.badRequest(error.details[0].message);

    const landlordId = req.user?.landlords?.id || null;
    const vendorId = req.user?.vendors?.id || null;

    if (!landlordId && !vendorId) {
      throw ApiError.badRequest(
        "Kindly login as landlord or vendor to add bank information"
      );
    }

    const data = {
      ...value,
      landlordId: landlordId ?? undefined,
      vendorId: vendorId ?? undefined,
    };

    const bankInfo = await bankInfoService.createBankInfo(data);
    return res.status(201).json(ApiResponse.success(bankInfo, "Bank info created"));
  });

  getBankInfo = asyncHandler(async (req: CustomRequest, res: Response) => {
    const bankInfo = await bankInfoService.getBankInfoById(req.params.id);
    if (!bankInfo) throw ApiError.notFound("Bank info not found");
    return res.status(200).json(ApiResponse.success(bankInfo, "Bank info retrieved"));
  });

  updateBankInfo = asyncHandler(async (req: CustomRequest, res: Response) => {
    const { error } = bankInfoSchema.validate(req.body);
    if (error) throw ApiError.badRequest(error.details[0].message);

    const updatedBankInfo = await bankInfoService.updateBankInfo(
      req.params.id,
      req.body
    );
    return res
      .status(200)
      .json(ApiResponse.success(updatedBankInfo, "Bank info updated successfully"));
  });

  deleteBankInfo = asyncHandler(async (req: CustomRequest, res: Response) => {
    await bankInfoService.deleteBankInfo(req.params.id);
    return res
      .status(200)
      .json(ApiResponse.success({}, "Bank info deleted successfully"));
  });

  getAllBankInfo = asyncHandler(async (req: CustomRequest, res: Response) => {
    const bankInfoList = await bankInfoService.getAllBankInfo();
    return res
      .status(200)
      .json(ApiResponse.success(bankInfoList, "All bank info retrieved"));
  });
}

export default new BankInfoController();