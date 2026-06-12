import {
  ApplicationStatus,
  DocumentType,
  Prisma,
  ReferenceStatus,
  YesNo,
} from "@prisma/client";
import crypto from "crypto";
import { prismaClient } from "../..";
import { resolveApplicationMarketFromRecord } from "../../utils/applicationCompletionRules";

type ScreeningStatus = "YES" | "NO" | "PENDING" | "SKIPPED";
type ScreeningOverall = "PASSED" | "PARTIAL" | "FAILED" | "PENDING" | "BLOCKED";
type NominationStatus = "PENDING" | "ACCEPTED" | "DECLINED";

const NOMINATION_ACCEPTED: NominationStatus = "ACCEPTED";

type ScreeningCheckKey =
  | "identity"
  | "employment"
  | "employmentResearch"
  | "income"
  | "credit"
  | "guarantor"
  | "referee"
  | "landlord"
  | "regional";

type ScreeningEvidence = {
  source: string;
  field?: string;
  value?: unknown;
};

export type ScreeningCheckResult = {
  key: ScreeningCheckKey;
  label: string;
  status: ScreeningStatus;
  required: boolean;
  reasons: string[];
  evidence: ScreeningEvidence[];
  checkedAt: string;
};

export type ScreeningRunResult = {
  runId: string;
  applicationId: string;
  triggeredByUserId?: string;
  triggeredAt: string;
  overall: ScreeningOverall;
  checks: Record<ScreeningCheckKey, ScreeningCheckResult>;
  riskScore: number;
  riskFlags: string[];
  blockedReasons: string[];
  statusUpdate: {
    employmentVerificationStatus: YesNo | null;
    incomeVerificationStatus: YesNo | null;
    creditCheckStatus: YesNo | null;
    landlordVerificationStatus: YesNo | null;
    guarantorVerificationStatus: YesNo | null;
    refereeVerificationStatus: YesNo | null;
  };
};

export type ScreeningOverrideInput = {
  applicationId: string;
  check: ScreeningCheckKey;
  status: "YES" | "NO";
  reason: string;
  triggeredByUserId?: string;
};

export type CreditScreeningResultInput = {
  applicationId: string;
  status: "YES" | "NO" | "PENDING";
  reason: string;
  providerReferenceId?: string;
  triggeredByUserId?: string;
};

const APPLICATION_INCLUDE = {
  documents: true,
  employmentInfo: true,
  personalDetails: true,
  properties: true,
  units: true,
  rooms: true,
  guarantorInformation: true,
  declaration: true,
  residentialInfo: { include: { prevAddresses: true } },
  referee: true,
  referenceForm: {
    include: {
      tenancyReferenceHistory: true,
      externalLandlord: true,
      conduct: true,
    },
  },
  employeeReference: true,
  guarantorAgreement: { include: { documents: true } },
  applicationInvites: {
    include: {
      properties: true,
      propertyListing: true,
      rooms: true,
      units: true,
    },
  },
  user: { select: { id: true, email: true, profile: true } },
} as const;

const REQUIRED_DOCS = {
  identity: [DocumentType.ID],
  address: [DocumentType.ADDRESS_PROOF],
  income: [DocumentType.PAY_STUB, DocumentType.TAX_RETURN, DocumentType.BANK_STATEMENT, DocumentType.INCOME_PROOF],
  credit: [DocumentType.CREDIT_REPORT, DocumentType.BACKGROUND_CHECK],
  guarantor: [DocumentType.GUARANTOR_INCOME, DocumentType.GUARANTOR_EMPLOYMENT],
  referee: [DocumentType.REFEREE_CONFIRMATION],
};

function normalizeText(value?: unknown): string {
  return String(value ?? "")
    .toLowerCase()
    .trim()
    .replace(/[^\w\s@.+-]/g, " ")
    .replace(/\s+/g, " ");
}

function normalizeEmail(value?: unknown): string {
  const email = normalizeText(value);
  const [local, domain] = email.split("@");
  if (!local || !domain) return email;
  if (domain === "gmail.com" || domain === "googlemail.com") {
    return `${local.split("+")[0].replace(/\./g, "")}@gmail.com`;
  }
  return `${local.split("+")[0]}@${domain}`;
}

function emailDomain(value?: unknown): string {
  return normalizeEmail(value).split("@")[1] ?? "";
}

function normalizePhone(value?: unknown): string {
  return String(value ?? "").replace(/[^\d+]/g, "").replace(/^00/, "+");
}

function normalizeDate(value?: unknown): string {
  if (!value) return "";
  const date = new Date(value as string | Date);
  return Number.isNaN(date.getTime()) ? "" : date.toISOString().split("T")[0];
}

function daysBetween(a?: unknown, b?: unknown): number | null {
  if (!a || !b) return null;
  const first = new Date(a as string | Date);
  const second = new Date(b as string | Date);
  if (Number.isNaN(first.getTime()) || Number.isNaN(second.getTime())) return null;
  return Math.abs(first.getTime() - second.getTime()) / (1000 * 60 * 60 * 24);
}

function parseMoney(value?: unknown): number {
  if (value === null || value === undefined) return 0;
  const parsed = Number(String(value).replace(/,/g, "").match(/-?\d+(\.\d+)?/)?.[0] ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function similarity(a?: unknown, b?: unknown): number {
  const left = normalizeText(a);
  const right = normalizeText(b);
  if (!left || !right) return 0;
  if (left === right) return 1;

  const leftTokens = new Set(left.split(" ").filter(Boolean));
  const rightTokens = new Set(right.split(" ").filter(Boolean));
  const shared = [...leftTokens].filter((token) => rightTokens.has(token)).length;
  const tokenScore = shared / Math.max(leftTokens.size, rightTokens.size, 1);

  const maxLength = Math.max(left.length, right.length);
  const distance = levenshtein(left, right);
  const editScore = maxLength ? 1 - distance / maxLength : 0;

  return Math.max(tokenScore, editScore);
}

function levenshtein(a: string, b: string): number {
  const matrix = Array.from({ length: a.length + 1 }, (_, i) => [i]);
  for (let j = 1; j <= b.length; j += 1) matrix[0][j] = j;
  for (let i = 1; i <= a.length; i += 1) {
    for (let j = 1; j <= b.length; j += 1) {
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,
        matrix[i][j - 1] + 1,
        matrix[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1)
      );
    }
  }
  return matrix[a.length][b.length];
}

function applicantFullName(application: any): string {
  const personal = application.personalDetails;
  return [personal?.firstName, personal?.middleName, personal?.lastName].filter(Boolean).join(" ");
}

function hasDoc(application: any, docTypes: DocumentType[]): boolean {
  const appDocs = application.documents ?? [];
  const guarantorDocs = application.guarantorAgreement?.documents ?? [];
  return [...appDocs, ...guarantorDocs].some(
    (doc: any) => !doc.deletedAt && !doc.purgedAt && doc.docType && docTypes.includes(doc.docType)
  );
}

function docCount(application: any, docTypes: DocumentType[]): number {
  const appDocs = application.documents ?? [];
  const guarantorDocs = application.guarantorAgreement?.documents ?? [];
  return new Set(
    [...appDocs, ...guarantorDocs]
      .filter((doc: any) => !doc.deletedAt && !doc.purgedAt && doc.docType && docTypes.includes(doc.docType))
      .map((doc: any) => doc.docType)
  ).size;
}

function documentsByType(application: any, docTypes: DocumentType[]): any[] {
  const appDocs = application.documents ?? [];
  const guarantorDocs = application.guarantorAgreement?.documents ?? [];
  return [...appDocs, ...guarantorDocs].filter(
    (doc: any) => !doc.deletedAt && !doc.purgedAt && doc.docType && docTypes.includes(doc.docType)
  );
}

function documentMetadata(doc: any): Record<string, unknown> {
  if (!doc?.metadata || typeof doc.metadata !== "object" || Array.isArray(doc.metadata)) return {};
  return doc.metadata as Record<string, unknown>;
}

function findMetadataValue(docs: any[], keys: string[]): unknown {
  for (const doc of docs) {
    const metadata = documentMetadata(doc);
    for (const key of keys) {
      if (metadata[key] !== undefined && metadata[key] !== null && metadata[key] !== "") {
        return metadata[key];
      }
    }
  }
  return undefined;
}

function documentText(doc: any): string {
  const metadata = documentMetadata(doc);
  return normalizeText([
    doc?.documentName,
    doc?.type,
    metadata.companyName,
    metadata.employerName,
    metadata.payrollName,
    metadata.description,
    metadata.extractedText,
    metadata.statementDescription,
    metadata.address,
  ].filter(Boolean).join(" "));
}

function containsNormalized(source?: unknown, expected?: unknown): boolean {
  const left = normalizeText(source);
  const right = normalizeText(expected);
  return Boolean(left && right && (left.includes(right) || right.includes(left) || similarity(left, right) >= 0.85));
}

function valuesResemble(a?: unknown, b?: unknown): boolean {
  const left = normalizeText(a);
  const right = normalizeText(b);
  if (!left || !right) return false;
  return left === right || left.includes(right) || right.includes(left) || similarity(left, right) >= 0.88;
}

function safeNumber(value?: unknown): number | null {
  const parsed = parseMoney(value);
  return parsed > 0 ? parsed : null;
}

function monthlyRent(application: any): number {
  return (
    parseMoney(application.rentAmountPaid) ||
    parseMoney(application.residentialInfo?.monthlyRentPaid) ||
    parseMoney(application.properties?.price) ||
    parseMoney(application.applicationInvites?.properties?.price) ||
    parseMoney(application.units?.price) ||
    parseMoney(application.rooms?.price) ||
    parseMoney(application.applicationInvites?.units?.price) ||
    parseMoney(application.applicationInvites?.rooms?.price)
  );
}

function applicationAddress(application: any): string {
  const residential = application.residentialInfo;
  return [
    residential?.address,
    residential?.city,
    residential?.state,
    residential?.country,
    residential?.zipCode,
  ].filter(Boolean).join(" ");
}

function marketCode(application: any): "UK" | "NG" | "OTHER" {
  const market = resolveApplicationMarketFromRecord(application);
  if (market === "United Kingdom") return "UK";
  if (market === "Nigeria") return "NG";
  return "OTHER";
}

function check(
  key: ScreeningCheckKey,
  label: string,
  required = true
): ScreeningCheckResult {
  return {
    key,
    label,
    status: "YES",
    required,
    reasons: [],
    evidence: [],
    checkedAt: new Date().toISOString(),
  };
}

function fail(result: ScreeningCheckResult, reason: string) {
  result.status = "NO";
  result.reasons.push(reason);
}

function pending(result: ScreeningCheckResult, reason: string) {
  if (result.status !== "NO") result.status = "PENDING";
  result.reasons.push(reason);
}

function evidence(result: ScreeningCheckResult, source: string, field?: string, value?: unknown) {
  result.evidence.push({ source, field, value });
}

class ScreeningService {
  async getScreeningRuns(applicationId: string) {
    return prismaClient.applicationScreeningRun.findMany({
      where: { applicationId },
      orderBy: { triggeredAt: "desc" },
    });
  }

  async getLatestScreeningRun(applicationId: string) {
    return prismaClient.applicationScreeningRun.findFirst({
      where: { applicationId },
      orderBy: { triggeredAt: "desc" },
    });
  }

  async runApplicationScreening(input: {
    applicationId: string;
    landlordId?: string;
    triggeredByUserId?: string;
  }): Promise<ScreeningRunResult> {
    const application = await prismaClient.application.findUnique({
      where: { id: input.applicationId },
      include: APPLICATION_INCLUDE,
    });

    if (!application) {
      throw new Error("Application not found");
    }

    const [
      blockedReasons,
      identity,
      employment,
      employmentResearch,
      income,
      credit,
      guarantor,
      referee,
      landlord,
      regional,
      riskFlags,
    ] =
      await Promise.all([
        this.getBlockingReasons(application, input.landlordId),
        this.evaluateIdentity(application),
        this.evaluateEmployment(application),
        this.evaluateEmploymentResearch(application),
        this.evaluateIncome(application),
        this.evaluateCredit(application),
        this.evaluateGuarantor(application),
        this.evaluateReferee(application),
        this.evaluateLandlord(application),
        this.evaluateRegionalPipeline(application),
        this.evaluateFraudSignals(application),
      ]);
    const checks = {
      identity,
      employment,
      employmentResearch,
      income,
      credit,
      guarantor,
      referee,
      landlord,
      regional,
    };

    const statusUpdate = this.toVerificationStatusUpdate(checks);
    const overall = blockedReasons.length
      ? "BLOCKED"
      : this.resolveOverall(Object.values(checks));
    const inputHash = this.hashScreeningInputs(application);

    const run: ScreeningRunResult = {
      runId: `screen_${Date.now()}_${input.applicationId}`,
      applicationId: input.applicationId,
      triggeredByUserId: input.triggeredByUserId,
      triggeredAt: new Date().toISOString(),
      overall,
      checks,
      riskScore: Math.min(riskFlags.length * 15, 100),
      riskFlags,
      blockedReasons,
      statusUpdate,
    };

    const auditData = {
      applicationId: input.applicationId,
      triggeredByUserId: input.triggeredByUserId,
      triggeredAt: new Date(run.triggeredAt),
      overall,
      inputHash,
      checks: this.toJson(checks) as Prisma.InputJsonValue,
      statusUpdate: this.toJson(statusUpdate) as Prisma.InputJsonValue,
      riskScore: run.riskScore,
      riskFlags,
      blockedReasons,
    };

    if (blockedReasons.length) {
      await prismaClient.applicationScreeningRun.create({ data: auditData });
    } else {
      await prismaClient.$transaction([
        prismaClient.application.update({
          where: { id: input.applicationId },
          data: statusUpdate,
        }),
        prismaClient.applicationScreeningRun.create({ data: auditData }),
      ]);
    }

    return run;
  }

  async overrideScreeningCheck(input: ScreeningOverrideInput) {
    if (!input.reason?.trim()) {
      throw new Error("Override reason is required.");
    }

    const application = await prismaClient.application.findUnique({
      where: { id: input.applicationId },
      select: { id: true },
    });
    if (!application) throw new Error("Application not found");

    const field = this.statusFieldForCheck(input.check);
    const statusUpdate = { [field]: input.status === "YES" ? YesNo.YES : YesNo.NO };

    const triggeredAt = new Date();
    const checks = {
      [input.check]: {
        key: input.check,
        label: this.labelForCheck(input.check),
        status: input.status,
        required: true,
        reasons: [`Manual override: ${input.reason.trim()}`],
        evidence: [
          {
            source: "manualOverride",
            field,
            value: input.status,
          },
        ],
        checkedAt: triggeredAt.toISOString(),
      },
    };

    const [updatedApplication, run] = await prismaClient.$transaction([
      prismaClient.application.update({
        where: { id: input.applicationId },
        data: statusUpdate,
        select: {
          id: true,
          employmentVerificationStatus: true,
          incomeVerificationStatus: true,
          creditCheckStatus: true,
          landlordVerificationStatus: true,
          guarantorVerificationStatus: true,
          refereeVerificationStatus: true,
        },
      }),
      prismaClient.applicationScreeningRun.create({
        data: {
          applicationId: input.applicationId,
          triggeredByUserId: input.triggeredByUserId,
          triggeredAt,
          overall: "OVERRIDDEN",
          inputHash: this.hashScreeningInputs({
            id: input.applicationId,
            updatedAt: triggeredAt,
            override: input,
          }),
          checks: this.toJson(checks) as Prisma.InputJsonValue,
          statusUpdate: this.toJson(statusUpdate) as Prisma.InputJsonValue,
          riskScore: 0,
          riskFlags: [],
          blockedReasons: [],
        },
      }),
    ]);

    return { application: updatedApplication, screeningRun: run };
  }

  async recordCreditScreeningResult(input: CreditScreeningResultInput) {
    if (!input.reason?.trim()) {
      throw new Error("Credit/background result reason is required.");
    }

    const application = await prismaClient.application.findUnique({
      where: { id: input.applicationId },
      select: { id: true },
    });
    if (!application) throw new Error("Application not found");

    const statusValue = input.status === "PENDING" ? null : input.status === "YES" ? YesNo.YES : YesNo.NO;
    const statusUpdate = { creditCheckStatus: statusValue };
    const triggeredAt = new Date();
    const checks = {
      credit: {
        key: "credit",
        label: this.labelForCheck("credit"),
        status: input.status,
        required: true,
        reasons: [input.reason.trim()],
        evidence: [
          {
            source: "creditProvider",
            field: "providerReferenceId",
            value: input.providerReferenceId,
          },
        ],
        checkedAt: triggeredAt.toISOString(),
      },
    };

    const [updatedApplication, run] = await prismaClient.$transaction([
      prismaClient.application.update({
        where: { id: input.applicationId },
        data: statusUpdate,
        select: {
          id: true,
          creditCheckStatus: true,
        },
      }),
      prismaClient.applicationScreeningRun.create({
        data: {
          applicationId: input.applicationId,
          triggeredByUserId: input.triggeredByUserId,
          triggeredAt,
          overall: input.status === "PENDING" ? "PENDING" : input.status === "YES" ? "PARTIAL" : "FAILED",
          inputHash: this.hashScreeningInputs({
            id: input.applicationId,
            updatedAt: triggeredAt,
            creditResult: input,
          }),
          checks: this.toJson(checks) as Prisma.InputJsonValue,
          statusUpdate: this.toJson(statusUpdate) as Prisma.InputJsonValue,
          riskScore: 0,
          riskFlags: [],
          blockedReasons: [],
        },
      }),
    ]);

    return { application: updatedApplication, screeningRun: run };
  }

  private async getBlockingReasons(application: any, landlordId?: string): Promise<string[]> {
    const reasons: string[] = [];
    const propertyLandlordId =
      application.properties?.landlordId ??
      application.applicationInvites?.properties?.landlordId ??
      application.applicationInvites?.invitedByLandordId;

    if (landlordId && propertyLandlordId && propertyLandlordId !== landlordId) {
      reasons.push("Landlord does not own this application/property.");
    }
    if ([ApplicationStatus.APPROVED, ApplicationStatus.DECLINED, ApplicationStatus.TENANT_CREATED].includes(application.status)) {
      reasons.push("Application has already reached a terminal decision state.");
    }
    if (!application.declaration?.length) {
      reasons.push("Tenant declaration/consent is missing.");
    }
    if (!application.referenceForm) reasons.push("Landlord reference form is missing.");
    if (!application.guarantorAgreement && application.guarantorInformation) {
      reasons.push("Guarantor agreement is missing.");
    }
    if (!application.employeeReference && this.requiresEmploymentCheck(application)) {
      reasons.push("Employee reference is missing.");
    }
    if (
      application.employmentInfo &&
      this.requiresEmploymentCheck(application) &&
      application.employmentInfo.nominationStatus !== NOMINATION_ACCEPTED
    ) {
      reasons.push("Employer nomination has not been accepted.");
    }
    if (
      application.guarantorInformation &&
      application.guarantorInformation.nominationStatus !== NOMINATION_ACCEPTED
    ) {
      reasons.push("Guarantor nomination has not been accepted.");
    }
    if (
      application.residentialInfo &&
      application.residentialInfo.nominationStatus !== NOMINATION_ACCEPTED
    ) {
      reasons.push("Landlord nomination has not been accepted.");
    }

    return reasons;
  }

  private async evaluateIdentity(application: any): Promise<ScreeningCheckResult> {
    const result = check("identity", "Identity verification");
    const idDocs = documentsByType(application, REQUIRED_DOCS.identity);
    const addressDocs = documentsByType(application, REQUIRED_DOCS.address);
    const applicantDob = normalizeDate(application.personalDetails?.dob);
    const idDob = normalizeDate(findMetadataValue(idDocs, ["dateOfBirth", "dob", "birthDate"]));
    const idAddress = findMetadataValue(idDocs, ["address", "residentialAddress", "homeAddress"]);
    const proofAddress = findMetadataValue(addressDocs, ["address", "residentialAddress", "homeAddress"]);
    const applicationFullAddress = applicationAddress(application);
    const idType = normalizeText(application.personalDetails?.identificationType);
    const hasDrivingLicense =
      idType.includes("driving") ||
      idType.includes("driver") ||
      idDocs.some((doc) => normalizeText(doc.documentName).includes("driv"));

    if (!idDocs.length) {
      fail(result, "Government ID document is missing.");
      return result;
    }
    evidence(result, "documents", "identityDocuments", idDocs.map((doc) => ({ id: doc.id, docType: doc.docType, documentName: doc.documentName })));

    if (!applicantDob) {
      fail(result, "Applicant date of birth is missing from personal details.");
    } else if (!idDob) {
      pending(result, "ID document DOB has not been extracted; OCR/manual review required.");
    } else if (applicantDob !== idDob) {
      fail(result, "Applicant DOB does not match DOB extracted from ID document.");
    } else {
      evidence(result, "identityDocument", "dateOfBirth", idDob);
    }

    if (hasDrivingLicense) {
      if (!addressDocs.length) {
        fail(result, "Driving licence requires a proof of address document.");
      }
      if (!idAddress) {
        pending(result, "Driving licence address has not been extracted; OCR/manual review required.");
      }
      if (!proofAddress) {
        pending(result, "Proof of address text has not been extracted; OCR/manual review required.");
      }
      if (idAddress && applicationFullAddress && similarity(idAddress, applicationFullAddress) < 0.85) {
        fail(result, "Driving licence address does not match application address.");
      }
      if (idAddress && proofAddress && similarity(idAddress, proofAddress) < 0.85) {
        fail(result, "Driving licence address does not match proof of address.");
      }
    }

    return result;
  }

  private async evaluateEmployment(application: any): Promise<ScreeningCheckResult> {
    const result = check("employment", "Employment verification");
    const employment = application.employmentInfo;
    const reference = application.employeeReference;

    if (!this.requiresEmploymentCheck(application)) {
      result.status = "SKIPPED";
      result.required = false;
      result.reasons.push("Employment check skipped for this employment status.");
      return result;
    }
    if (!employment || !reference) {
      fail(result, "Employment information or employee reference is missing.");
      return result;
    }

    if (employment.nominationStatus !== NOMINATION_ACCEPTED) {
      fail(result, "Employer nomination is not accepted.");
    }
    if (!reference.date || reference.declarationConfirmed !== true) {
      fail(result, "Employee reference has not been formally submitted/declared.");
    }
    if (similarity(reference.employeeName, applicantFullName(application)) < 0.85) {
      fail(result, "Employee reference name does not match applicant name.");
    } else {
      evidence(result, "employeeReference", "employeeName", reference.employeeName);
    }
    if (similarity(reference.companyName, employment.employerCompany || employment.businessName) < 0.8) {
      fail(result, "Employer company does not match declared employment details.");
    }
    if (reference.jobTitle && employment.positionTitle && similarity(reference.jobTitle, employment.positionTitle) < 0.75) {
      fail(result, "Job title does not match declared employment details.");
    }
    const referenceDomain = emailDomain(reference.emailAddress);
    const declaredDomain = emailDomain(employment.employerEmail);
    if (referenceDomain && declaredDomain && referenceDomain !== declaredDomain) {
      fail(result, "Employer email domain does not match nominated employer email domain.");
    }
    const startDateDiff = daysBetween(reference.employmentStartDate, employment.startDate);
    if (startDateDiff === null || startDateDiff > 30) {
      fail(result, "Employment start date does not match within 30 days.");
    }
    if (reference.wouldReemploy === false) {
      pending(result, "Employer would not re-employ applicant; manual review required.");
    }
    if (typeof reference.workPerformance === "number" && reference.workPerformance < 3) {
      pending(result, "Employer performance score is below policy threshold.");
    }

    return result;
  }

  private async evaluateEmploymentResearch(application: any): Promise<ScreeningCheckResult> {
    const result = check("employmentResearch", "Company and employment research");
    const employment = application.employmentInfo;
    const payslipDocs = documentsByType(application, [DocumentType.PAY_STUB]);
    const bankDocs = documentsByType(application, [DocumentType.BANK_STATEMENT]);
    const declaredCompany = employment?.employerCompany || employment?.businessName;

    if (!employment) {
      fail(result, "Employment information is missing.");
      return result;
    }
    if (!declaredCompany) {
      fail(result, "Declared company/business name is missing.");
    }
    if (!payslipDocs.length) {
      fail(result, "Payslip document is required for company alignment.");
    }
    if (!bankDocs.length) {
      pending(result, "Bank statement is required for salary deposit cross-reference.");
    }

    const payslipCompany = findMetadataValue(payslipDocs, ["companyName", "employerName", "payrollName"]);
    if (declaredCompany && payslipDocs.length) {
      const payslipTextMatches = payslipDocs.some((doc) => containsNormalized(documentText(doc), declaredCompany));
      if (payslipCompany && normalizeText(payslipCompany) !== normalizeText(declaredCompany)) {
        fail(result, "Declared company name does not exactly match company name extracted from payslip.");
      } else if (!payslipCompany && !payslipTextMatches) {
        pending(result, "Payslip company name has not been extracted or does not visibly align; OCR/manual review required.");
      } else {
        evidence(result, "payslip", "companyName", payslipCompany || declaredCompany);
      }
    }

    const payrollVariants = [
      declaredCompany,
      payslipCompany,
      employment?.employerCompany,
      employment?.businessName,
    ].filter(Boolean);
    const bankDepositMatches = bankDocs.some((doc) =>
      payrollVariants.some((variant) => containsNormalized(documentText(doc), variant))
    );
    if (bankDocs.length && !bankDepositMatches) {
      pending(result, "Bank statement salary deposit description does not match declared company/payroll variants.");
    }

    const netPay = safeNumber(findMetadataValue(payslipDocs, ["netPay", "net_pay", "salaryNet", "netAmount"]));
    const payslipPaymentDate = findMetadataValue(payslipDocs, ["paymentDate", "payDate", "salaryDate"]);
    const bankDepositAmount = safeNumber(findMetadataValue(bankDocs, ["depositAmount", "salaryDepositAmount", "amount"]));
    const bankDepositDate = findMetadataValue(bankDocs, ["depositDate", "salaryDepositDate", "transactionDate"]);
    const paymentDateDiff = daysBetween(payslipPaymentDate, bankDepositDate);

    if (!netPay || !payslipPaymentDate) {
      pending(result, "Payslip net pay and payment date have not been extracted; OCR/manual review required.");
    }
    if (bankDocs.length && (!bankDepositAmount || !bankDepositDate)) {
      pending(result, "Bank statement salary deposit amount/date have not been extracted; OCR/manual review required.");
    }
    if (netPay && bankDepositAmount && Math.abs(netPay - bankDepositAmount) > 1) {
      fail(result, "Payslip net pay does not match bank statement salary deposit amount.");
    }
    if (paymentDateDiff !== null && paymentDateDiff > 7) {
      fail(result, "Bank statement salary deposit is outside the 7-day payslip payment window.");
    }
    if (netPay && bankDepositAmount && paymentDateDiff !== null && paymentDateDiff <= 7) {
      evidence(result, "salaryDeposit", "matchedWithinDays", paymentDateDiff);
    }

    return result;
  }

  private async evaluateIncome(application: any): Promise<ScreeningCheckResult> {
    const result = check("income", "Income verification");
    const employment = application.employmentInfo;
    const rent = monthlyRent(application);
    const grossMonthlyIncome = parseMoney(employment?.monthlyOrAnualIncome);
    const incomeDocCount = docCount(application, REQUIRED_DOCS.income);
    const maxRatio = 0.33;

    evidence(result, "application", "monthlyRent", rent);
    evidence(result, "employmentInfo", "monthlyOrAnualIncome", employment?.monthlyOrAnualIncome);

    if (grossMonthlyIncome <= 0) {
      fail(result, "Declared gross monthly income is missing or invalid.");
    }
    if (rent <= 0) {
      pending(result, "Monthly rent could not be resolved for affordability calculation.");
    }
    if (rent > 0 && grossMonthlyIncome > 0 && rent / grossMonthlyIncome > maxRatio) {
      fail(result, "Rent-to-income ratio exceeds the 33% affordability threshold.");
    }
    if (incomeDocCount < 2 && !hasDoc(application, [DocumentType.EMPLOYMENT_LETTER])) {
      pending(result, "At least two income documents or an employment letter are required.");
    }
    if (!hasDoc(application, [DocumentType.PAY_STUB, DocumentType.TAX_RETURN, DocumentType.INCOME_PROOF])) {
      fail(result, "Official income support document is missing.");
    }
    const benefitFields = [
      "childBenefit",
      "childMaintenance",
      "disabilityBenefit",
      "housingBenefit",
      "others",
      "pension",
    ];
    const declaredBenefits = benefitFields.filter((field) => parseMoney(employment?.[field]) > 0);
    if (declaredBenefits.length && !hasDoc(application, [DocumentType.INCOME_PROOF, DocumentType.BANK_STATEMENT])) {
      pending(result, "Declared benefits require official benefit/income proof documentation.");
    }

    return result;
  }

  private async evaluateCredit(application: any): Promise<ScreeningCheckResult> {
    const result = check("credit", "Credit and background check");
    const consentPresent = application.declaration?.length > 0;
    const hasCreditEvidence = hasDoc(application, REQUIRED_DOCS.credit);

    if (!consentPresent) {
      fail(result, "Tenant consent/declaration is required before credit or background checks.");
      return result;
    }
    if (!hasCreditEvidence) {
      pending(result, "No credit/background provider report or manual report document is attached.");
    } else {
      evidence(result, "documents", "docType", REQUIRED_DOCS.credit);
    }

    return result;
  }

  private async evaluateGuarantor(application: any): Promise<ScreeningCheckResult> {
    const result = check("guarantor", "Guarantor verification", Boolean(application.guarantorInformation));
    const info = application.guarantorInformation;
    const agreement = application.guarantorAgreement;
    const rent = monthlyRent(application);
    const guarantorIncome = parseMoney(info?.monthlyIncome);

    if (!info) {
      result.status = "SKIPPED";
      result.reasons.push("No guarantor was provided for this application.");
      return result;
    }
    if (!agreement) {
      fail(result, "Guarantor agreement is missing.");
      return result;
    }
    if (info.nominationStatus !== NOMINATION_ACCEPTED) {
      fail(result, "Guarantor nomination is not accepted.");
    }
    if (!agreement.signedByGuarantor || !agreement.guarantorSignature || !agreement.guarantorSignedAt) {
      fail(result, "Guarantor agreement is not fully signed.");
    }
    const agreementName = [agreement.firstName, agreement.middleName, agreement.lastName].filter(Boolean).join(" ");
    if (similarity(info.fullName, agreementName) < 0.85) {
      fail(result, "Guarantor name does not match agreement.");
    }
    if (normalizeDate(info.dateOfBirth) && normalizeDate(agreement.dateOfBirth) && normalizeDate(info.dateOfBirth) !== normalizeDate(agreement.dateOfBirth)) {
      fail(result, "Guarantor date of birth does not match agreement.");
    }
    if (
      info.nationalInsuranceNumber &&
      agreement.nationalInsuranceNumber &&
      normalizeText(info.nationalInsuranceNumber) !== normalizeText(agreement.nationalInsuranceNumber)
    ) {
      fail(result, "Guarantor National Insurance/ID number does not match agreement.");
    }
    if (normalizeEmail(info.email) === normalizeEmail(application.personalDetails?.email || application.user?.email)) {
      fail(result, "Guarantor email matches applicant email.");
    }
    if (normalizePhone(info.phoneNumber) === normalizePhone(application.personalDetails?.phoneNumber)) {
      fail(result, "Guarantor phone number matches applicant phone number.");
    }
    if (similarity(info.fullName, applicantFullName(application)) >= 0.85) {
      fail(result, "Guarantor name matches applicant name.");
    }
    const restrictedRelationships = [
      "spouse",
      "wife",
      "husband",
      "partner",
      "brother",
      "sister",
      "sibling",
      "mother",
      "father",
      "parent",
      "son",
      "daughter",
      "child",
      "cousin",
      "aunt",
      "uncle",
      "family",
      "relative",
      "blood",
    ];
    const relationship = normalizeText(info.relationship);
    if (relationship && restrictedRelationships.some((item) => relationship.includes(item))) {
      pending(result, "Guarantor relationship appears family/blood-related; mandatory manual override/report required.");
    }
    if (rent > 0 && guarantorIncome > 0 && rent / guarantorIncome > 0.33) {
      fail(result, "Guarantor income does not satisfy affordability threshold.");
    }
    if (!hasDoc(application, REQUIRED_DOCS.guarantor)) {
      pending(result, "Guarantor income/employment documents are not attached.");
    }

    return result;
  }

  private async evaluateReferee(application: any): Promise<ScreeningCheckResult> {
    const result = check("referee", "Referee verification", false);
    const referee = application.referee;
    const applicantEmail = normalizeEmail(application.personalDetails?.email || application.user?.email);
    const applicantPhone = normalizePhone(application.personalDetails?.phoneNumber);

    if (!referee) {
      fail(result, "Referee record is missing.");
      return result;
    }

    const requiredFields = [
      "professionalReferenceName",
      "personalReferenceName",
      "personalEmail",
      "professionalEmail",
      "personalPhoneNumber",
      "professionalPhoneNumber",
      "personalRelationship",
      "professionalRelationship",
    ];
    for (const field of requiredFields) {
      if (!referee[field]) fail(result, `Referee ${field} is missing.`);
    }
    if (normalizeEmail(referee.personalEmail) === applicantEmail || normalizeEmail(referee.professionalEmail) === applicantEmail) {
      fail(result, "Referee email matches applicant email.");
    }
    if (normalizePhone(referee.personalPhoneNumber) === applicantPhone || normalizePhone(referee.professionalPhoneNumber) === applicantPhone) {
      fail(result, "Referee phone matches applicant phone.");
    }
    if (
      normalizeEmail(referee.personalEmail) === normalizeEmail(referee.professionalEmail) ||
      normalizePhone(referee.personalPhoneNumber) === normalizePhone(referee.professionalPhoneNumber)
    ) {
      pending(result, "Personal and professional referees appear to be the same contact.");
    }
    if (!hasDoc(application, REQUIRED_DOCS.referee)) {
      pending(result, "External referee confirmation is not attached yet.");
    }
    const applicantName = applicantFullName(application);
    if (
      similarity(referee.personalReferenceName, applicantName) >= 0.85 ||
      similarity(referee.professionalReferenceName, applicantName) >= 0.85
    ) {
      fail(result, "Referee name matches applicant name.");
    }

    return result;
  }

  private async evaluateLandlord(application: any): Promise<ScreeningCheckResult> {
    const result = check("landlord", "Landlord verification");
    const residential = application.residentialInfo;
    const reference = application.referenceForm;
    const history = reference?.tenancyReferenceHistory;
    const externalLandlord = reference?.externalLandlord;
    const conduct = reference?.conduct;

    if (!residential || !reference || !history || !externalLandlord || !conduct) {
      fail(result, "Residential information or landlord reference data is missing.");
      return result;
    }
    if (residential.nominationStatus !== NOMINATION_ACCEPTED) {
      fail(result, "Landlord nomination is not accepted.");
    }
    if (![ReferenceStatus.SUBMITTED, ReferenceStatus.COMPLETED, ReferenceStatus.APPROVED].includes(reference.status)) {
      fail(result, "Landlord reference form is not submitted or completed.");
    }
    if (similarity(residential.landlordOrAgencyName, externalLandlord.name) < 0.8) {
      fail(result, "Landlord/agency name does not match reference.");
    }
    if (normalizeEmail(residential.landlordOrAgencyEmail) !== normalizeEmail(externalLandlord.emailAddress)) {
      fail(result, "Landlord/agency email does not match reference.");
    }
    if (normalizePhone(residential.landlordOrAgencyPhoneNumber) !== normalizePhone(externalLandlord.contactNumber)) {
      fail(result, "Landlord/agency phone does not match reference.");
    }
    if (similarity(history.tenantName, applicantFullName(application)) < 0.85) {
      fail(result, "Tenant name on landlord reference does not match applicant.");
    }
    if (similarity(externalLandlord.name, applicantFullName(application)) >= 0.85) {
      fail(result, "Landlord/reference provider name matches applicant name.");
    }
    if (similarity(history.currentAddress, residential.address) < 0.9) {
      fail(result, "Current address on landlord reference does not match application.");
    }
    if (conduct.rentOnTime !== true) fail(result, "Landlord reference does not confirm rent was paid on time.");
    if (conduct.rentArrears === true) fail(result, "Landlord reference reports rent arrears.");
    if (conduct.complaints === true) pending(result, "Landlord reference reports complaints; manual review required.");
    if (conduct.rentAgain === false) pending(result, "Landlord would not rent to applicant again; manual review required.");

    const declaredRent = parseMoney(residential.monthlyRentPaid);
    const referencedRent = parseMoney(history.monthlyRent);
    if (declaredRent > 0 && referencedRent > 0 && Math.abs(declaredRent - referencedRent) / declaredRent > 0.1) {
      pending(result, "Referenced monthly rent differs from declared rent by more than 10%.");
    }

    return result;
  }

  private async evaluateRegionalPipeline(application: any): Promise<ScreeningCheckResult> {
    const result = check("regional", "Regional screening pipeline", false);
    const market = marketCode(application);
    evidence(result, "application", "market", market);

    if (market === "UK") {
      if (!hasDoc(application, REQUIRED_DOCS.credit)) {
        pending(result, "UK screening expects credit/background provider evidence or uploaded reports.");
      }
      pending(result, "UK criminal/credit provider integrations are not connected yet; provider result required before automated pass.");
      return result;
    }

    if (market === "NG") {
      result.status = "PENDING";
      result.reasons.push(
        "Nigeria has no connected centralized criminal/rejection registry; internal verification dataset evidence is being built from audit runs."
      );
      if (!hasDoc(application, [DocumentType.ID, DocumentType.ADDRESS_PROOF])) {
        fail(result, "Nigeria screening requires ID and proof-of-address documents.");
      }
      return result;
    }

    result.status = "SKIPPED";
    result.reasons.push("No market-specific pipeline is configured for this application market.");
    return result;
  }

  private async evaluateFraudSignals(application: any): Promise<string[]> {
    const flags: string[] = [];
    const applicantEmail = normalizeEmail(application.personalDetails?.email || application.user?.email);
    const applicantPhone = normalizePhone(application.personalDetails?.phoneNumber);
    const emails = [
      ["guarantor", application.guarantorInformation?.email],
      ["landlord", application.residentialInfo?.landlordOrAgencyEmail],
      ["employer", application.employmentInfo?.employerEmail],
      ["referee personal", application.referee?.personalEmail],
      ["referee professional", application.referee?.professionalEmail],
    ].map(([label, value]) => [label, normalizeEmail(value)] as const);
    const phones = [
      ["guarantor", application.guarantorInformation?.phoneNumber],
      ["landlord", application.residentialInfo?.landlordOrAgencyPhoneNumber],
      ["employer", application.employmentInfo?.employerPhone],
      ["referee personal", application.referee?.personalPhoneNumber],
      ["referee professional", application.referee?.professionalPhoneNumber],
    ].map(([label, value]) => [label, normalizePhone(value)] as const);

    for (const [label, email] of emails) {
      if (email && applicantEmail && email === applicantEmail) flags.push(`${label} email matches applicant email`);
    }
    for (const [label, phone] of phones) {
      if (phone && applicantPhone && phone === applicantPhone) flags.push(`${label} phone matches applicant phone`);
    }
    const applicantName = applicantFullName(application);
    const comparedNames = [
      ["guarantor", application.guarantorInformation?.fullName],
      ["landlord/reference provider", application.referenceForm?.externalLandlord?.name],
      ["personal referee", application.referee?.personalReferenceName],
      ["professional referee", application.referee?.professionalReferenceName],
    ];
    for (const [label, name] of comparedNames) {
      if (name && similarity(name, applicantName) >= 0.85) {
        flags.push(`${label} name matches applicant name`);
      }
    }
    const applicantDomain = emailDomain(application.personalDetails?.email || application.user?.email);
    for (const [label, email] of emails) {
      const domain = emailDomain(email);
      if (domain && applicantDomain && domain === applicantDomain) {
        flags.push(`${label} email domain matches applicant email domain`);
      }
    }
    const applicantPhoneTail = applicantPhone.slice(-7);
    for (const [label, phone] of phones) {
      if (phone && applicantPhoneTail && phone.slice(-7) === applicantPhoneTail) {
        flags.push(`${label} phone closely resembles applicant phone`);
      }
    }
    const relationship = normalizeText(application.guarantorInformation?.relationship);
    if (relationship && ["spouse", "wife", "husband", "brother", "sister", "mother", "father", "family", "relative"].some((item) => relationship.includes(item))) {
      flags.push("guarantor relationship is restricted and requires manual override");
    }

    const seenEmails = new Map<string, string>();
    for (const [label, email] of emails) {
      if (!email) continue;
      if (seenEmails.has(email)) flags.push(`${label} email matches ${seenEmails.get(email)} email`);
      seenEmails.set(email, label);
    }

    return [...new Set(flags)];
  }

  private toVerificationStatusUpdate(checks: Record<ScreeningCheckKey, ScreeningCheckResult>) {
    return {
      employmentVerificationStatus: this.toAggregateYesNo([checks.employment, checks.employmentResearch]),
      incomeVerificationStatus: this.toAggregateYesNo([checks.income]),
      creditCheckStatus: this.toAggregateYesNo([checks.identity, checks.credit, checks.regional]),
      landlordVerificationStatus: this.toYesNo(checks.landlord),
      guarantorVerificationStatus: this.toYesNo(checks.guarantor),
      refereeVerificationStatus: this.toYesNo(checks.referee),
    };
  }

  private toYesNo(result: ScreeningCheckResult): YesNo | null {
    if (result.status === "YES" || result.status === "SKIPPED") return YesNo.YES;
    if (result.status === "NO") return YesNo.NO;
    return null;
  }

  private toAggregateYesNo(results: ScreeningCheckResult[]): YesNo | null {
    if (results.some((result) => result.status === "NO")) return YesNo.NO;
    if (results.some((result) => result.status === "PENDING")) return null;
    return YesNo.YES;
  }

  private resolveOverall(checks: ScreeningCheckResult[]): ScreeningOverall {
    if (checks.some((item) => item.required && item.status === "NO")) return "FAILED";
    if (checks.some((item) => item.status === "PENDING")) return "PENDING";
    if (checks.some((item) => item.status === "NO")) return "PARTIAL";
    return "PASSED";
  }

  private requiresEmploymentCheck(application: any): boolean {
    const status = normalizeText(application.employmentInfo?.employmentStatus);
    return !["unemployed", "student", "retired"].includes(status);
  }

  private statusFieldForCheck(check: ScreeningCheckKey) {
    const fields: Record<ScreeningCheckKey, keyof ScreeningRunResult["statusUpdate"]> = {
      identity: "creditCheckStatus",
      employment: "employmentVerificationStatus",
      employmentResearch: "employmentVerificationStatus",
      income: "incomeVerificationStatus",
      credit: "creditCheckStatus",
      guarantor: "guarantorVerificationStatus",
      referee: "refereeVerificationStatus",
      landlord: "landlordVerificationStatus",
      regional: "creditCheckStatus",
    };

    return fields[check];
  }

  private labelForCheck(check: ScreeningCheckKey): string {
    const labels: Record<ScreeningCheckKey, string> = {
      identity: "Identity verification",
      employment: "Employment verification",
      employmentResearch: "Company and employment research",
      income: "Income verification",
      credit: "Credit and background check",
      guarantor: "Guarantor verification",
      referee: "Referee verification",
      landlord: "Landlord verification",
      regional: "Regional screening pipeline",
    };

    return labels[check];
  }

  private hashScreeningInputs(application: any): string {
    const snapshot = {
      applicationId: application.id,
      updatedAt: application.updatedAt,
      employmentInfo: application.employmentInfo,
      personalDetails: application.personalDetails,
      guarantorInformation: application.guarantorInformation,
      residentialInfo: application.residentialInfo,
      referee: application.referee,
      referenceForm: application.referenceForm,
      employeeReference: application.employeeReference,
      guarantorAgreement: application.guarantorAgreement,
      documents: application.documents?.map((document: any) => ({
        id: document.id,
        docType: document.docType,
        updatedAt: document.updatedAt,
      })),
    };

    return crypto
      .createHash("sha256")
      .update(JSON.stringify(snapshot))
      .digest("hex");
  }

  private toJson<T>(value: T): T {
    return JSON.parse(JSON.stringify(value));
  }
}

export default new ScreeningService();
