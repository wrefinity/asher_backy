import type { LibraryMarketCode } from "./shared/marketCodes";
import { LIBRARY_MARKET_CODES } from "./shared/marketCodes";
import * as financial from "./sections/financialReporting";
import * as legal from "./sections/legalCompliance";
import * as operations from "./sections/propertyOperations";
import * as onboarding from "./sections/tenantOnboarding";

export type LibrarySection =
  | "tenant-onboarding"
  | "property-operations"
  | "legal-compliance"
  | "financial-reporting";

export type LibraryCategory = "Template" | "Guide" | "Legal";

export interface LibraryTemplateDefinition {
  id: string;
  title: string;
  category: LibraryCategory;
  section: LibrarySection;
  /** Omit for all markets */
  country?: LibraryMarketCode;
  summary: string;
  tags: string[];
  content: string;
}

function buildDocumentName(def: LibraryTemplateDefinition): string {
  const routing = def.country
    ? `[templates:${def.section}:${def.country}]`
    : `[templates:${def.section}]`;
  return `[${def.category}] ${def.title} ${routing}`;
}

const universalOperations: LibraryTemplateDefinition[] = [
  {
    id: "ops-maintenance-response",
    title: "Maintenance Request Response",
    category: "Template",
    section: "property-operations",
    summary: "Acknowledge tenant maintenance requests with next steps.",
    tags: ["maintenance", "response", "tenant"],
    content: operations.maintenanceResponse(),
  },
  {
    id: "ops-handover-report",
    title: "Property Handover Report",
    category: "Guide",
    section: "property-operations",
    summary: "Record condition, utilities, and warranties at handover.",
    tags: ["handover", "utilities", "report"],
    content: operations.handoverReport(),
  },
  {
    id: "ops-vendor-checklist",
    title: "Vendor Onboarding Checklist",
    category: "Template",
    section: "property-operations",
    summary: "Collect insurance, KYC, and contacts from vendors.",
    tags: ["vendor", "compliance", "insurance"],
    content: operations.vendorChecklist(),
  },
];

const universalFinancial: LibraryTemplateDefinition[] = [
  {
    id: "fin-cash-flow",
    title: "Monthly Property Cash Flow",
    category: "Template",
    section: "financial-reporting",
    summary: "Track income, expenses, and net position per property.",
    tags: ["cash flow", "finance", "report"],
    content: financial.cashFlowTemplate(),
  },
  {
    id: "fin-deposit-ledger",
    title: "Tenant Deposit Ledger",
    category: "Template",
    section: "financial-reporting",
    summary: "Track deposit receipts, deductions, and repayments.",
    tags: ["deposit", "ledger", "tenant"],
    content: financial.depositLedger(),
  },
  {
    id: "fin-expense-reimbursement",
    title: "Expense Reimbursement Form",
    category: "Template",
    section: "financial-reporting",
    summary: "Formal reimbursement request for property expenses.",
    tags: ["expense", "reimbursement"],
    content: financial.expenseReimbursement(),
  },
];

function marketOnboarding(country: LibraryMarketCode): LibraryTemplateDefinition[] {
  const agreementTitles: Record<LibraryMarketCode, string> = {
    UK: "Assured Shorthold Tenancy Agreement",
    US: "Residential Lease Agreement",
    NG: "Tenancy Agreement",
    IE: "Residential Tenancy Agreement",
  };

  const base: LibraryTemplateDefinition[] = [
    {
      id: `onboard-tenancy-${country}`,
      title: agreementTitles[country],
      category: "Template",
      section: "tenant-onboarding",
      country,
      summary: country === "UK"
        ? "Full England & Wales AST with house rules, violation matrix, deposit guidance, emergencies, and compliance schedules."
        : "Primary lease contract with merge tags for tenant, property, rent, and signatures.",
      tags: ["contract", "tenancy", "agreement", country.toLowerCase()],
      content: onboarding.tenancyAgreementContent(country),
    },
    {
      id: `onboard-checklist-${country}`,
      title: "Move-in / Move-out Checklist",
      category: "Template",
      section: "tenant-onboarding",
      country,
      summary: "Joint condition checklist to protect deposits.",
      tags: ["inspection", "checkout", "deposit"],
      content: onboarding.moveInChecklist(),
    },
    {
      id: `onboard-welcome-${country}`,
      title: "Tenant Welcome Guide",
      category: "Guide",
      section: "tenant-onboarding",
      country,
      summary: "Building rules, contacts, and emergency information.",
      tags: ["welcome", "guide", "contact"],
      content: onboarding.welcomeGuide(country),
    },
  ];

  if (country !== "UK") return base;

  return [
    ...base,
    {
      id: "onboard-ast-renewal-UK",
      title: "AST Renewal Agreement",
      category: "Template",
      section: "tenant-onboarding",
      country: "UK",
      summary: "Renew an existing AST with updated term and rent.",
      tags: ["renewal", "ast", "uk"],
      content: onboarding.ukAstRenewal(),
    },
    {
      id: "onboard-holding-deposit-UK",
      title: "Holding Deposit Agreement",
      category: "Template",
      section: "tenant-onboarding",
      country: "UK",
      summary: "Hold a property during referencing (Tenant Fees Act rules apply).",
      tags: ["holding deposit", "uk"],
      content: onboarding.holdingDeposit(),
    },
    {
      id: "onboard-guarantor-deed-UK",
      title: "Guarantor Deed",
      category: "Legal",
      section: "tenant-onboarding",
      country: "UK",
      summary: "Standalone guarantor guarantee with merge tags.",
      tags: ["guarantor", "deed", "uk"],
      content: onboarding.guarantorDeed(),
    },
    {
      id: "onboard-inventory-UK",
      title: "Inventory & Schedule of Condition",
      category: "Template",
      section: "tenant-onboarding",
      country: "UK",
      summary: "Fixtures, fittings, and condition at start of tenancy.",
      tags: ["inventory", "condition", "uk"],
      content: onboarding.inventorySchedule(),
    },
    {
      id: "onboard-addendum-UK",
      title: "Tenancy Addendum (Pets / Parking)",
      category: "Template",
      section: "tenant-onboarding",
      country: "UK",
      summary: "Additional terms for pets, parking, or custom clauses.",
      tags: ["addendum", "pets", "parking"],
      content: onboarding.tenancyAddendum(),
    },
  ];
}

function marketLegal(country: LibraryMarketCode): LibraryTemplateDefinition[] {
  return [
    {
      id: `legal-rights-${country}`,
      title: `Landlord Rights Handbook (${country})`,
      category: "Legal",
      section: "legal-compliance",
      country,
      summary: "Country-specific landlord rights and obligations summary.",
      tags: ["law", "rights", "handbook", country.toLowerCase()],
      content: legal.landlordRightsContent(country),
    },
    {
      id: `legal-rent-increase-${country}`,
      title: "Rent Increase Notice",
      category: "Legal",
      section: "legal-compliance",
      country,
      summary: "Compliant rent increase notification template.",
      tags: ["notice", "rent", "compliance", country.toLowerCase()],
      content: legal.rentIncreaseContent(country),
    },
    {
      id: `legal-eviction-${country}`,
      title: "Eviction & Dispute Resolution Guide",
      category: "Guide",
      section: "legal-compliance",
      country,
      summary: "Steps, timelines, and documentation before legal action.",
      tags: ["eviction", "dispute", "guide", country.toLowerCase()],
      content: legal.evictionGuideContent(country),
    },
  ];
}

export const ASHER_LIBRARY_TEMPLATES: LibraryTemplateDefinition[] = [
  ...universalOperations,
  ...universalFinancial,
  ...LIBRARY_MARKET_CODES.flatMap((country) => [
    ...marketOnboarding(country),
    ...marketLegal(country),
  ]),
];

export function getLibraryTemplateDocumentName(
  def: LibraryTemplateDefinition
): string {
  return buildDocumentName(def);
}

export function parseLibraryDocumentName(documentName: string): {
  category?: string;
  title: string;
  targetPage?: string;
  targetSection?: string;
  targetCountry?: LibraryMarketCode;
} {
  const categoryMatch = documentName.match(/^\[(Template|Guide|Legal|FAQ)\]\s*/i);
  const category = categoryMatch?.[1];
  let remainder = categoryMatch
    ? documentName.slice(categoryMatch[0].length)
    : documentName;

  const routingMatch = remainder.match(/\s*\[templates:([^:\]]+)(?::([^\]]+))?\]\s*$/i);
  let targetPage: string | undefined;
  let targetSection: string | undefined;
  let targetCountry: LibraryMarketCode | undefined;

  if (routingMatch) {
    targetPage = "templates";
    targetSection = routingMatch[1];
    const countryCode = routingMatch[2]?.toUpperCase();
    if (countryCode && LIBRARY_MARKET_CODES.includes(countryCode as LibraryMarketCode)) {
      targetCountry = countryCode as LibraryMarketCode;
    }
    remainder = remainder.slice(0, routingMatch.index).trim();
  }

  return {
    category,
    title: remainder.trim(),
    targetPage,
    targetSection,
    targetCountry,
  };
}
