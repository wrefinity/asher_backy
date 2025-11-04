import { Decimal } from "@prisma/client/runtime/library";
import { SeverityLevel, NoticeType, DeliveryMethod } from "@prisma/client";

export interface ViolationResponseIF {
  violationId: string;
  tenantId: string;
  responseType: "FULL_PAYMENT" | "PARTIAL_PAYMENT" | "DISPUTE" | "FINANCIAL_HARDSHIP";
  paymentAmount?: number | string | Decimal;
  paymentDate?: string | Date;
  paymentMethod?: string;
  reasonForDispute?: string;
  evidenceUrl?: string;
  additionalComment?: string;
}
export  interface ViolationIF {
  description: string;       // Description of the violation (required)
  severityLevel?: SeverityLevel; // Severity of the violation (optional, defaults to MODERATE)
  actionTaken?: string;      // Action taken (optional)
  tenantId: string;
  noticeType?: NoticeType;
  deliveryMethod?: DeliveryMethod;
  propertyId?: string;
  createdById: string;
  unitId?: string
  dueDate?: Date
}
