
import { GoogleGenAI, Type, Schema } from '@google/genai';
import { DocumentType, ExtractedData, BiometricResult } from '../utils/types';


class GeminiAiServices {
    public geminiClient: GoogleGenAI;
    private MODEL = 'gemini-2.5-flash';
    constructor() {
        this.geminiClient = new GoogleGenAI({
            apiKey: process.env.GOOGLE_GENAI_API_KEY || '',
        });
    }
    getSchemaForDocType = (docType: DocumentType): Schema => {
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

    analyzeDocument = async (
        fileDataUrl: string,
        docType: DocumentType
    ): Promise<ExtractedData> => {
        const [, mimeType, base64] =
            fileDataUrl.match(/^data:(.+);base64,(.+)$/) || [];

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

        const response = await this.geminiClient.models.generateContent({
            model: this.MODEL,
            contents: {
                parts: [
                    {
                        inlineData: {
                            mimeType: mimeType || 'image/jpeg',
                            data: base64,
                        },
                    },
                    { text: prompt },
                ],
            },
            config: {
                responseMimeType: 'application/json',
                responseSchema: this.getSchemaForDocType(docType),
            },
        });

        if (!response.text) throw new Error('No AI response');

        return JSON.parse(response.text);
    }

    compareFaces = async (
        idImage: string,
        selfie: string
    ): Promise<BiometricResult> => {
        const clean = (s: string) => s.split(',')[1];

        const prompt = `
            Compare the face in the ID document (Image 1) with the Selfie (Image 2).
            Determine if they are the same person.
            Provide a match score (0-100) and reasoning.
        `;
        const response = await this.geminiClient.models.generateContent({
            model: this.MODEL,
            contents: {
                parts: [
                    { inlineData: { mimeType: 'image/jpeg', data: clean(idImage) } },
                    { inlineData: { mimeType: 'image/jpeg', data: clean(selfie) } },
                    { text: 'Compare these faces. Are they the same person?' },
                ],
            },
            config: {
                responseMimeType: 'application/json',
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        matchScore: { type: Type.NUMBER },
                        isMatch: { type: Type.BOOLEAN },
                        reasoning: { type: Type.STRING },
                    },
                    required: ['matchScore', 'isMatch'],
                },
            },
        });

        return JSON.parse(response.text!);
    };
}

export default new GeminiAiServices()