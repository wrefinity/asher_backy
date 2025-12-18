import { GoogleGenerativeAI } from "@google/generative-ai";
import sharp from "sharp";

export interface OCRResult {
  raw_text: string;
  full_name: string;
  id_number: string;
  dob: string;
  document_type: string;
  issuing_country?: string;
  expiry_date?: string;
  address?: string;
  gender?: string;
  confidence: number;
  is_valid: boolean;
  validation_errors: string[];
  extraction_warnings: string[];
}

export interface VerificationResult {
  is_match: boolean;
  full_name_match: boolean;
  dob_match: boolean;
  id_number_match: boolean;
  confidence_score: number;
  mismatches: string[];
  warnings: string[];
}

class GeminiOCRService {
  private client: GoogleGenerativeAI;
  private model: any;

  constructor() {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY environment variable not set");
    }
    this.client = new GoogleGenerativeAI(apiKey);
    // Use Gemini 2.0 Flash or Gemini Pro Vision
    this.model = this.client.getGenerativeModel({
      model: "gemini-2.0-flash" // Latest and fastest
    });
  }

  /**
   * Extract text from document image using Gemini
   * @param file Express Multer File (image of ID/passport/license)
   * @returns Structured OCR result with confidence scores
   */
  async extractDocumentData(
    file: Express.Multer.File
  ): Promise<OCRResult | { error: string; raw?: any }> {
    try {
      if (!file) {
        return { error: "No file provided" };
      }

      // Validate file type
      const allowedMimes = ["image/jpeg", "image/png", "image/webp", "image/gif"];
      if (!allowedMimes.includes(file.mimetype)) {
        return {
          error: `Invalid file type. Allowed: ${allowedMimes.join(", ")}`
        };
      }

      // Optional: Compress image for faster processing
      let imageBuffer = file.buffer;
      try {
        imageBuffer = await sharp(file.buffer)
          .resize(1920, 1080, { fit: "inside", withoutEnlargement: true })
          .jpeg({ quality: 85 })
          .toBuffer();
      } catch (err) {
        console.warn("Image compression failed, using original:", err);
      }

      const base64Image = imageBuffer.toString("base64");

      // =====================================================
      // GEMINI OCR EXTRACTION PROMPT
      // =====================================================
      const prompt = `You are an expert OCR system for document verification.

        Analyze this document image and extract ALL readable information.

        IMPORTANT RULES:
        1. Extract EXACTLY what you see - no assumptions
        2. If a field is unclear or missing, mark it as "UNREADABLE"
        3. Return ONLY valid JSON, no additional text
        4. confidence should be 0-1 (0.0 = not confident, 1.0 = very confident)
        5. List any validation issues in validation_errors
        6. List any warnings in extraction_warnings

        Return this JSON structure (adjust fields based on document type):
        {
        "raw_text": "all visible text from document",
        "full_name": "extracted name or UNREADABLE",
        "id_number": "ID/passport/license number or UNREADABLE",
        "dob": "YYYY-MM-DD format or UNREADABLE",
        "document_type": "passport/drivers_license/national_id/other",
        "issuing_country": "country code or UNREADABLE",
        "expiry_date": "YYYY-MM-DD or UNREADABLE or NONE",
        "address": "if visible, otherwise UNREADABLE",
        "gender": "M/F or UNREADABLE",
        "confidence": 0.85,
        "is_valid": true,
        "validation_errors": [],
        "extraction_warnings": ["some field quality issue"]
    }`;

      // =====================================================
      // CALL GEMINI API WITH IMAGE
      // =====================================================
      const response = await this.model.generateContent([
        {
          inlineData: {
            mimeType: file.mimetype,
            data: base64Image
          }
        },
        prompt
      ]);

      const responseText = response.response.text();
      console.log("Gemini raw response:", responseText);

      // =====================================================
      // PARSE RESPONSE
      // =====================================================
      let ocrResult: OCRResult;

      try {
        // Try direct JSON parse
        ocrResult = JSON.parse(responseText);
      } catch {
        // Extract JSON object from text
        const jsonMatch = responseText.match(/\{[\s\S]*\}/);
        if (!jsonMatch) {
          return {
            error: "Failed to extract JSON from Gemini response",
            raw: responseText
          };
        }
        try {
          ocrResult = JSON.parse(jsonMatch[0]);
        } catch (parseErr) {
          return {
            error: "Failed to parse extracted JSON",
            raw: jsonMatch[0]
          };
        }
      }

      // =====================================================
      // VALIDATE AND ENHANCE RESULT
      // =====================================================
      ocrResult = this.validateAndEnhanceResult(ocrResult);

      return ocrResult;

    } catch (err: any) {
      console.error("OCR extraction error:", err);
      return {
        error: err.message || "Unknown error during OCR extraction",
        raw: err
      };
    }
  }

  /**
   * Verify extracted data against user-provided information
   * @param ocrData Extracted data from document
   * @param userProvidedData Data user claims to match
   * @returns Verification result with match score
   */
  async verifyDocumentData(
    ocrData: OCRResult,
    userProvidedData: {
      full_name: string;
      dob: string;
      id_number?: string;
    }
  ): Promise<VerificationResult> {
    const mismatches: string[] = [];
    const warnings: string[] = [];
    let matchCount = 0;
    let totalChecks = 0;

    // =====================================================
    // CHECK FULL NAME MATCH
    // =====================================================
    totalChecks++;
    const nameMatch = this.compareNames(
      ocrData.full_name,
      userProvidedData.full_name
    );

    if (!nameMatch.match) {
      mismatches.push(
        `Name mismatch: Document shows "${ocrData.full_name}" but user provided "${userProvidedData.full_name}"`
      );
      if (nameMatch.similarity < 0.7) {
        warnings.push(`Low name similarity (${(nameMatch.similarity * 100).toFixed(1)}%)`);
      }
    } else {
      matchCount++;
    }

    // =====================================================
    // CHECK DATE OF BIRTH MATCH
    // =====================================================
    totalChecks++;
    const dobMatch = this.compareDates(ocrData.dob, userProvidedData.dob);

    if (!dobMatch) {
      mismatches.push(
        `DOB mismatch: Document shows "${ocrData.dob}" but user provided "${userProvidedData.dob}"`
      );
    } else {
      matchCount++;
    }

    // =====================================================
    // CHECK ID NUMBER (if provided)
    // =====================================================
    if (userProvidedData.id_number && ocrData.id_number) {
      totalChecks++;
      const idMatch = ocrData.id_number.replace(/\s+/g, "").toLowerCase() ===
        userProvidedData.id_number.replace(/\s+/g, "").toLowerCase();

      if (!idMatch) {
        mismatches.push(
          `ID mismatch: Document shows "${ocrData.id_number}" but user provided "${userProvidedData.id_number}"`
        );
      } else {
        matchCount++;
      }
    }

    // =====================================================
    // ADD WARNINGS BASED ON OCR CONFIDENCE
    // =====================================================
    if (ocrData.confidence < 0.7) {
      warnings.push(
        `Low OCR confidence (${(ocrData.confidence * 100).toFixed(1)}%). Manual review recommended.`
      );
    }

    if (ocrData.validation_errors.length > 0) {
      warnings.push(
        `Document validation issues: ${ocrData.validation_errors.join(", ")}`
      );
    }

    // =====================================================
    // CHECK DOCUMENT VALIDITY
    // =====================================================
    if (!ocrData.is_valid) {
      warnings.push("Document failed validation checks");
    }

    if (ocrData.expiry_date && ocrData.expiry_date !== "NONE" && ocrData.expiry_date !== "UNREADABLE") {
      const expiryDate = new Date(ocrData.expiry_date);
      if (expiryDate < new Date()) {
        mismatches.push("Document has expired");
      }
    }

    // =====================================================
    // CALCULATE CONFIDENCE SCORE
    // =====================================================
    const confidenceScore = totalChecks > 0 ? matchCount / totalChecks : 0;

    return {
      is_match: mismatches.length === 0 && confidenceScore >= 0.8,
      full_name_match: nameMatch.match,
      dob_match: dobMatch,
      id_number_match: userProvidedData.id_number
        ? ocrData.id_number === userProvidedData.id_number
        : true,
      confidence_score: confidenceScore,
      mismatches,
      warnings
    };
  }

  /**
   * Compare two names with fuzzy matching
   */
  private compareNames(
    ocrName: string,
    userName: string
  ): { match: boolean; similarity: number } {
    if (ocrName === "UNREADABLE" || !ocrName) {
      return { match: false, similarity: 0 };
    }

    const normalize = (name: string) =>
      name
        .toLowerCase()
        .replace(/[^\w\s]/g, "")
        .split(/\s+/)
        .filter(n => n.length > 0)
        .sort()
        .join(" ");

    const ocrNorm = normalize(ocrName);
    const userNorm = normalize(userName);

    if (ocrNorm === userNorm) {
      return { match: true, similarity: 1 };
    }

    // Calculate Levenshtein similarity
    const similarity = this.levenshteinSimilarity(ocrNorm, userNorm);
    return { match: similarity > 0.85, similarity };
  }

  /**
   * Compare two dates in various formats
   */
  private compareDates(ocrDate: string, userDate: string): boolean {
    if (ocrDate === "UNREADABLE" || !ocrDate) {
      return false;
    }

    const normalize = (date: string) => {
      // Handle multiple date formats
      const dateObj = new Date(date);
      if (!isNaN(dateObj.getTime())) {
        return dateObj.toISOString().split("T")[0];
      }
      return date;
    };

    return normalize(ocrDate) === normalize(userDate);
  }

  /**
   * Calculate Levenshtein similarity (0-1)
   */
  private levenshteinSimilarity(a: string, b: string): number {
    const distance = this.levenshteinDistance(a, b);
    const maxLength = Math.max(a.length, b.length);
    return maxLength === 0 ? 1 : 1 - distance / maxLength;
  }

  /**
   * Calculate Levenshtein distance between two strings
   */
  private levenshteinDistance(a: string, b: string): number {
    const matrix: number[][] = [];

    for (let i = 0; i <= b.length; i++) {
      matrix[i] = [i];
    }

    for (let j = 0; j <= a.length; j++) {
      matrix[0][j] = j;
    }

    for (let i = 1; i <= b.length; i++) {
      for (let j = 1; j <= a.length; j++) {
        if (b.charAt(i - 1) === a.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1,
            matrix[i][j - 1] + 1,
            matrix[i - 1][j] + 1
          );
        }
      }
    }

    return matrix[b.length][a.length];
  }

  /**
   * Validate and enhance OCR result
   */
  private validateAndEnhanceResult(data: Partial<OCRResult>): OCRResult {
    const result: OCRResult = {
      raw_text: data.raw_text || "",
      full_name: data.full_name || "UNREADABLE",
      id_number: data.id_number || "UNREADABLE",
      dob: data.dob || "UNREADABLE",
      document_type: data.document_type || "unknown",
      issuing_country: data.issuing_country || "UNREADABLE",
      expiry_date: data.expiry_date || "UNREADABLE",
      address: data.address || "UNREADABLE",
      gender: data.gender || "UNREADABLE",
      confidence: typeof data.confidence === "number" ? data.confidence : 0.5,
      is_valid: data.is_valid !== false,
      validation_errors: data.validation_errors || [],
      extraction_warnings: data.extraction_warnings || []
    };

    // Auto-validate
    if (result.full_name === "UNREADABLE") {
      result.is_valid = false;
      result.validation_errors.push("Full name not readable");
    }

    if (result.dob === "UNREADABLE") {
      result.is_valid = false;
      result.validation_errors.push("Date of birth not readable");
    }

    if (result.confidence < 0.6) {
      result.is_valid = false;
      result.validation_errors.push("Low confidence score");
    }

    return result;
  }
}

export default new GeminiOCRService();