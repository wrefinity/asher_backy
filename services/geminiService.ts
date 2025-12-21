import { GoogleGenAI, Type, Schema } from "@google/genai";
import { DocumentType, ExtractedData, BiometricResult } from "../types";

const getGenAI = () => {
    if (!process.env.API_KEY) {
        throw new Error("API Key not found in environment variables");
    }
    return new GoogleGenAI({ apiKey: process.env.API_KEY });
};

// Define schemas for different document types to ensure we get data we can programmatically compare
const getSchemaForDocType = (docType: DocumentType): Schema => {
    const baseFields = {
        documentType: { type: Type.STRING },
        confidence: { type: Type.NUMBER, description: "Confidence score 0-100" },
        summary: { type: Type.STRING },
        isSuspicious: { type: Type.BOOLEAN }
    };

    if (docType === DocumentType.ID_CARD || docType === DocumentType.PASSPORT) {
        return {
            type: Type.OBJECT,
            properties: {
                ...baseFields,
                fields: {
                    type: Type.OBJECT,
                    properties: {
                        fullName: { type: Type.STRING },
                        dateOfBirth: { type: Type.STRING, description: "YYYY-MM-DD format" },
                        idNumber: { type: Type.STRING },
                        address: { type: Type.STRING },
                        expiryDate: { type: Type.STRING, description: "YYYY-MM-DD format" }
                    },
                    required: ["fullName"]
                }
            },
            required: ["documentType", "fields", "isSuspicious"]
        };
    } else if (docType === DocumentType.PAYSTUB) {
        return {
            type: Type.OBJECT,
            properties: {
                ...baseFields,
                fields: {
                    type: Type.OBJECT,
                    properties: {
                        employeeName: { type: Type.STRING },
                        employerName: { type: Type.STRING },
                        netIncome: { type: Type.NUMBER },
                        payDate: { type: Type.STRING, description: "YYYY-MM-DD format" },
                        payPeriod: { type: Type.STRING }
                    },
                    required: ["netIncome", "payDate"]
                }
            },
            required: ["documentType", "fields", "isSuspicious"]
        };
    } else if (docType === DocumentType.BANK_STATEMENT) {
        return {
            type: Type.OBJECT,
            properties: {
                ...baseFields,
                fields: {
                    type: Type.OBJECT,
                    properties: {
                        accountHolderName: { type: Type.STRING },
                        statementDate: { type: Type.STRING },
                        transactions: {
                            type: Type.ARRAY,
                            items: {
                                type: Type.OBJECT,
                                properties: {
                                    date: { type: Type.STRING, description: "YYYY-MM-DD" },
                                    description: { type: Type.STRING },
                                    amount: { type: Type.NUMBER },
                                    type: { type: Type.STRING, enum: ["CREDIT", "DEBIT"] }
                                }
                            }
                        }
                    },
                    required: ["accountHolderName", "transactions"]
                }
            },
            required: ["documentType", "fields", "isSuspicious"]
        };
    } else {
        // Generic / Proof of Address
        return {
            type: Type.OBJECT,
            properties: {
                ...baseFields,
                fields: {
                    type: Type.OBJECT,
                    properties: {
                        name: { type: Type.STRING },
                        address: { type: Type.STRING },
                        date: { type: Type.STRING }
                    }
                }
            },
            required: ["documentType", "fields", "isSuspicious"]
        };
    }
};

export const analyzeDocument = async (
  fileDataUrl: string,
  docType: DocumentType
): Promise<ExtractedData> => {
  const ai = getGenAI();
  const modelId = "gemini-2.5-flash"; 

  // Extract MIME type and base64 data from Data URL
  // Format: data:[<mediatype>][;base64],<data>
  // Example: data:application/pdf;base64,JVBERi...
  const matches = fileDataUrl.match(/^data:(.+);base64,(.+)$/);
  let mimeType = "image/jpeg"; // Default fallback
  let base64Data = fileDataUrl;

  if (matches) {
    mimeType = matches[1];
    base64Data = matches[2];
  } else if (fileDataUrl.includes(',')) {
    // Basic fallback if regex fails but comma exists
    base64Data = fileDataUrl.split(',')[1];
  }

  const prompt = `
    Analyze this document. It is a ${docType}. 
    Extract the data strictly according to the JSON schema provided.
    
    Specific Instructions:
    - Dates must be in YYYY-MM-DD format.
    - Money amounts must be numbers (no currency symbols).
    - If it is a Bank Statement, extract the list of transactions, especially income/credits.
    - If it is a Payslip, identify the Net Pay clearly.
    - Check for tampering, blur, or screen captures.
    - If it is an ID Document, please extract the Expiry Date carefully.
  `;

  try {
    const response = await ai.models.generateContent({
      model: modelId,
      contents: {
        parts: [
          {
            inlineData: {
              mimeType: mimeType, 
              data: base64Data,
            },
          },
          { text: prompt },
        ],
      },
      config: {
        responseMimeType: "application/json",
        responseSchema: getSchemaForDocType(docType)
      },
    });

    const text = response.text;
    if (!text) throw new Error("No response from AI");
    
    return JSON.parse(text) as ExtractedData;

  } catch (error) {
    console.error("OCR Error:", error);
    throw error;
  }
};

export const compareFaces = async (
  idImageBase64: string,
  selfieImageBase64: string
): Promise<BiometricResult> => {
  const ai = getGenAI();
  const modelId = "gemini-2.5-flash"; 

  // Helper for cleaning base64 for faces (usually strictly images)
  const clean = (str: string) => str.includes(',') ? str.split(',')[1] : str;

  const prompt = `
    Compare the face in the ID document (Image 1) with the Selfie (Image 2).
    Determine if they are the same person.
    Provide a match score (0-100) and reasoning.
  `;

  try {
    const response = await ai.models.generateContent({
      model: modelId,
      contents: {
        parts: [
          { inlineData: { mimeType: "image/jpeg", data: clean(idImageBase64) } },
          { inlineData: { mimeType: "image/jpeg", data: clean(selfieImageBase64) } },
          { text: prompt },
        ],
      },
      config: {
        responseMimeType: "application/json",
        responseSchema: {
            type: Type.OBJECT,
            properties: {
                matchScore: { type: Type.NUMBER },
                isMatch: { type: Type.BOOLEAN },
                reasoning: { type: Type.STRING }
            },
            required: ["matchScore", "isMatch", "reasoning"]
        }
      },
    });

    const text = response.text;
    if (!text) throw new Error("No response from AI");

    return JSON.parse(text) as BiometricResult;

  } catch (error) {
    console.error("Face Match Error:", error);
    throw error;
  }
};