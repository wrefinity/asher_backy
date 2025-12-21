import { Request, Response } from "express";
import geminiOCRService, { OCRResult, VerificationResult } from "../utils/openai";
import { asyncHandler } from "../utils/asyncHandler";
import { ApiError } from "../utils/ApiError";
import { ApiResponse } from "../utils/ApiResponse";
import logger from "../utils/loggers";
import GeminiAiServices from '../services/gemini'
import { CustomRequest, DocumentType } from "../utils/types";

class DocumentVerificationController {
  /**
   * Extract text from document
   * POST /api/document/extract
   * Body: multipart/form-data with 'document' file
   */
  extractDocumentText = asyncHandler(async (req: Request, res: Response) => {
    if (!req.file) {
      return res.status(400).json(ApiError.badRequest("No document file provided"));
    }

    logger.info("Processing document:", req.file.originalname);

    const result = await geminiOCRService.extractDocumentData(req.file);

    if ("error" in result) {
      return res.status(400).json(ApiError.badRequest(result.error));
    }

    return res.json(
        ApiResponse.success(
        result, "Document text extracted successfully"
        )
    );
  });

  /**
   * Verify extracted data against user-provided info
   * POST /api/document/verify
   * Body: {
   *   ocrData: OCRResult,
   *   userProvidedData: { full_name, dob, id_number }
   * }
   */
  verifyDocumentData = asyncHandler(async (req: Request, res: Response) => {
    const { ocrData, userProvidedData } = req.body;

    // Validate input
    if (!ocrData) {
      return res.status(400).json(ApiError.badRequest("OCR data is required"));
    }

    if (!userProvidedData?.full_name || !userProvidedData?.dob) {
      return res.status(400).json(ApiError.badRequest("User provided data must include full_name and dob"));
    }

    const verificationResult = await geminiOCRService.verifyDocumentData(
      ocrData,
      userProvidedData
    );

    res.json(
        ApiResponse.success(
            {
                success: true,
                data: verificationResult,
                message: verificationResult.is_match
                    ? "✅ Document verified successfully"
                    : "❌ Document verification failed"
            }
        )
    );
  });

  /**
   * Complete flow: Extract + Verify in one request
   * POST /api/document/extract-and-verify
   * Body: multipart/form-data with 'document' file + JSON body
   * Body JSON: {
   *   full_name: string,
   *   dob: string (YYYY-MM-DD),
   *   id_number?: string
   * }
   */
  extractAndVerify = asyncHandler(async (req: Request, res: Response) => {
    if (!req.file) {
      return res.status(400).json(ApiError.badRequest("No document file provided"));
    }

    const { full_name, dob, id_number } = req.body;

    // Validate user data
    if (!full_name || !dob) {
      return res.status(400).json(ApiError.badRequest("full_name and dob are required in body"));
    }

    // =====================================================
    // STEP 1: Extract from document
    // =====================================================
    const extractResult = await geminiOCRService.extractDocumentData(req.file);

    if ("error" in extractResult) {
      return res.status(400).json(ApiError.badRequest(`Extraction failed: ${extractResult.error}`));
    }

    // =====================================================
    // STEP 2: Verify against user data
    // =====================================================
    const verificationResult = await geminiOCRService.verifyDocumentData(
      extractResult as OCRResult,
      { full_name, dob, id_number }
    );

    // =====================================================
    // STEP 3: Determine final status
    // =====================================================
    const finalStatus =
      verificationResult.is_match && extractResult.is_valid
        ? "VERIFIED"
        : verificationResult.warnings.length > 0
        ? "NEEDS_REVIEW"
        : "FAILED";

    res.json({
      success: verificationResult.is_match && extractResult.is_valid,
      status: finalStatus,
      data: {
        extraction: extractResult,
        verification: verificationResult,
        recommendedAction:
          finalStatus === "VERIFIED"
            ? "APPROVE"
            : finalStatus === "NEEDS_REVIEW"
            ? "MANUAL_REVIEW"
            : "REJECT"
      },
      message:
        finalStatus === "VERIFIED"
          ? "✅ Document verified and data matches"
          : finalStatus === "NEEDS_REVIEW"
          ? "⚠️ Document verified but review recommended"
          : "❌ Document verification failed"
    });
  });
  analyzerDocument = asyncHandler(async (req: CustomRequest, res: Response) => {
    const files = req.body.cloudinaryDocumentUrls || [];
    const results = await Promise.all(
      files.map(file =>
        GeminiAiServices.analyzeDocument(file.base64, DocumentType.ID_CARD)
      )
    );
    return res.json({ success: true, results });
  });
}

export default new DocumentVerificationController();