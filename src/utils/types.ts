
import { TransactionReference } from '@prisma/client';
import { Request } from 'express';

export type JWTPayload = {
    id: string;
    role: string | string[];
    email: string;
    tenantCode?: string;
    tenantId?: string;
    tenant?: {
        id?: string;
    };
    landlords?: {
        id?: string;
    },
    vendors?: {
        id?: string;
    },
}

export interface CustomRequest extends Request {
    user: JWTPayload;
    files: {
        [fieldname: string]: Express.Multer.File[];
    };
    params: {
        [key: string]: string | undefined; // Allow `undefined` for compatibility
    };
}

export type EmailDataType = {
    senderEmail: string;
    receiverEmail: string;
    subject: string;
    body: string;
    isReadBySender?: boolean;
    isReadByReceiver?: boolean;
    attachment?: string[];
    isDraft?: boolean;
    isSent?: boolean;
    isRead?: boolean;
    isStarred?: boolean;
    isArchived?: boolean;
    isSpam?: boolean;
    isReply?: boolean;
}
export interface CloudinaryFile extends Express.Multer.File {
    buffer: Buffer;
}
interface RespData {
    authorization_url: string;
    access_code: string;
    reference: string;
}
export type PaystackResponseType = {
    status: boolean;
    message: string;
    data: RespData;
}

interface Authorization {
    authorization_code: string;
    bin: string;
    last4: string;
    exp_month: string;
    exp_year: string;
    channel: string;
    card_type: string;
    bank: string;
    country_code: string;
    brand: string;
    reusable: boolean;
    signature: string;
    account_name: string | null;
}

interface Customer {
    id: number;
    first_name: string | null;
    last_name: string | null;
    email: string;
    customer_code: string;
    phone: string | null;
    metadata: string | null;
    risk_action: string;
    international_format_phone: string | null;
}

interface Source {
    type: string;
    source: string;
    entry_point: string;
    identifier: string | null;
}

export interface WebHookData {
    id: number;
    domain: string;
    status: string;
    reference: string;
    amount: number;
    message: string | null;
    gateway_response: string;
    paid_at: string;
    created_at: string;
    channel: string;
    currency: string;
    ip_address: string;
    metadata: string;
    fees_breakdown: any | null;
    log: any | null;
    fees: number;
    fees_split: any | null;
    authorization: Authorization;
    customer: Customer;
    plan: object;
    subaccount: object;
    split: object;
    order_id: string | null;
    paidAt: string;
    requested_amount: number;
    pos_transaction_data: any | null;
    source: Source;
}

export type WebhookEventResponse = {
    event: string;
    data: WebHookData;
}

export type PayBillType = {
    amount: number;
    billType: TransactionReference
}

export enum DocumentType {
  ID_CARD = 'ID Card / Driver License',
  PASSPORT = 'Passport',
  BANK_STATEMENT = 'Bank Statement',
  PAYSTUB = 'Paystub / Payslip',
  UTILITY_BILL = 'Utility Bill / Proof of Address',
  OTHER = 'Other Document'
}

export interface ApplicationForm {
  firstName: string;
  lastName: string;
  dateOfBirth: string; // YYYY-MM-DD
  addressLine1: string;
  city: string;
  zipCode: string;
}

export interface ExtractedData {
  documentType: string;
  confidence: number;
  fields: Record<string, any>;
  summary: string;
  isSuspicious: boolean;
}

export interface BiometricResult {
  matchScore: number; // 0 to 100
  isMatch: boolean;
  reasoning: string;
}

export interface ValidationResult {
  passed: boolean;
  details: string;
}

export interface VerificationState {
  step: number;
  formData: ApplicationForm | null;
  idImage: string | null;
  selfieImage: string | null;
  payslips: Array<{ image: string; data: ExtractedData | null }>;
  bankStatement: { image: string; data: ExtractedData | null } | null;
  proofOfAddress: { image: string; data: ExtractedData | null } | null;
  
  // Analysis Data
  idData: ExtractedData | null;
  biometricResult: BiometricResult | null;
  
  // Validation Results
  idValidation: ValidationResult | null;
  incomeValidation: ValidationResult | null;
  addressValidation: ValidationResult | null;

  isProcessing: boolean;
  processingStatus: string; // To show detailed loading messages
  error: string | null;
}