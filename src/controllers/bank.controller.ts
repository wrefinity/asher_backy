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

    // NGN accounts get a Paystack transfer recipient at creation so
    // withdrawals can route through Paystack (Part 3 §5 of
    // VENDOR_APP_FLOW_SPEC.md). bankCode is Paystack-only input, not a
    // bankInfo column.
    const { bankCode, ...persistable } = value;
    let paystackRecipientCode: string | undefined;
    if (String(value.currency).toUpperCase() === "NGN") {
      if (!bankCode) {
        throw ApiError.badRequest("bankCode is required for NGN bank accounts");
      }
      const paystackServices = (await import("../services/paystack.services")).default;
      paystackRecipientCode = await paystackServices.createTransferRecipient(
        value.accountName,
        value.accountNumber,
        bankCode
      );
    }

    const data = {
      ...persistable,
      paystackRecipientCode,
      landlordId: landlordId ?? undefined,
      vendorId: vendorId ?? undefined,
    };

    const bankInfo = await bankInfoService.createBankInfo(data);
    return res.status(201).json(ApiResponse.success(bankInfo, "Bank info created"));
  });

  // Nigerian bank directory (Paystack) for the add-account picker.
  listPaystackBanks = asyncHandler(async (_req: CustomRequest, res: Response) => {
    const paystackServices = (await import("../services/paystack.services")).default;
    const banks = await paystackServices.listBanks();
    return res.status(200).json(ApiResponse.success(banks, "Banks retrieved"));
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
  // Add to your bank controller
getMyBankInfo = asyncHandler(async (req: CustomRequest, res: Response) => {
  const landlordId = req.user?.landlords?.id;
  const vendorId = req.user?.vendors?.id;

  if (!landlordId && !vendorId) {
    return res.status(200).json(ApiResponse.success(null, "No bank info found"));
  }

  let bankInfo;
  if (landlordId) {
    bankInfo = await bankInfoService.getBankInfoByLandlordId(landlordId);
  } else {
    bankInfo = await bankInfoService.getBankInfoByVendorId(vendorId);
  }

  return res.status(200).json(ApiResponse.success(bankInfo, "Bank info retrieved"));
});


}

export default new BankInfoController();