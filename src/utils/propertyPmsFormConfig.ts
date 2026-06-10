/**
 * Country-aware PMS operational profile configuration.
 * Keep in sync with AsherLandlordFE/src/utils/propertyPmsFormConfig.ts
 */
import { PropertySpecificationType } from '@prisma/client';
import { canonicalizeListingMarketCountry } from './listingMarketCountries';

export type PmsMarket = 'UK' | 'NG' | 'US' | 'IE' | 'default';
export type PmsSpecification = 'RESIDENTIAL' | 'COMMERCIAL';

export type PropertyComplianceCertTypeKey =
  | 'GAS_SAFETY'
  | 'EICR'
  | 'EPC'
  | 'FIRE_RISK_ASSESSMENT'
  | 'LEGIONELLA'
  | 'HMO_LICENCE'
  | 'ASBESTOS'
  | 'PAT_TESTING'
  | 'SMOKE_CO_ALARM'
  | 'LEAD_PAINT_DISCLOSURE'
  | 'BUSINESS_FIRE_SAFETY'
  | 'EMERGENCY_LIGHTING'
  | 'PLANNING_PERMISSION'
  | 'OTHER';

export type CertRequirement = 'required' | 'recommended' | 'optional' | 'hidden';

export interface PmsCertConfig {
  type: PropertyComplianceCertTypeKey;
  label: string;
  requirement: CertRequirement;
  renewalMonths?: number;
}

export interface PmsSectionConfig {
  visible: boolean;
  certs?: PmsCertConfig[];
  utilityTypes?: string[];
  insuranceTypes?: string[];
}

export interface PropertyPmsFormConfig {
  market: PmsMarket;
  specification: PmsSpecification;
  sections: {
    compliance: PmsSectionConfig;
    insurance: PmsSectionConfig;
    utilities: PmsSectionConfig;
    ownership: PmsSectionConfig;
  };
}

const UK_RESIDENTIAL_CERTS: PmsCertConfig[] = [
  { type: 'GAS_SAFETY', label: 'Gas Safety (CP12)', requirement: 'recommended', renewalMonths: 12 },
  { type: 'EICR', label: 'Electrical (EICR)', requirement: 'recommended', renewalMonths: 60 },
  { type: 'EPC', label: 'Energy Performance (EPC)', requirement: 'recommended', renewalMonths: 120 },
  { type: 'FIRE_RISK_ASSESSMENT', label: 'Fire risk assessment', requirement: 'recommended' },
  { type: 'SMOKE_CO_ALARM', label: 'Smoke & CO alarms', requirement: 'recommended' },
  { type: 'LEGIONELLA', label: 'Legionella risk assessment', requirement: 'optional' },
  { type: 'HMO_LICENCE', label: 'HMO licence', requirement: 'optional' },
  { type: 'PAT_TESTING', label: 'PAT testing', requirement: 'optional' },
];

const UK_COMMERCIAL_CERTS: PmsCertConfig[] = [
  { type: 'EPC', label: 'Energy Performance (EPC)', requirement: 'recommended', renewalMonths: 120 },
  { type: 'FIRE_RISK_ASSESSMENT', label: 'Fire risk assessment', requirement: 'recommended' },
  { type: 'BUSINESS_FIRE_SAFETY', label: 'Business fire safety', requirement: 'recommended' },
  { type: 'EMERGENCY_LIGHTING', label: 'Emergency lighting test', requirement: 'recommended' },
  { type: 'ASBESTOS', label: 'Asbestos register', requirement: 'optional' },
  { type: 'PLANNING_PERMISSION', label: 'Planning / use class', requirement: 'optional' },
];

const NG_RESIDENTIAL_CERTS: PmsCertConfig[] = [
  { type: 'FIRE_RISK_ASSESSMENT', label: 'Fire safety certificate', requirement: 'recommended' },
  { type: 'OTHER', label: 'Certificate of occupancy / building approval', requirement: 'optional' },
];

const NG_COMMERCIAL_CERTS: PmsCertConfig[] = [
  { type: 'FIRE_RISK_ASSESSMENT', label: 'Fire safety certificate', requirement: 'recommended' },
  { type: 'PLANNING_PERMISSION', label: 'Business permit / operational licence', requirement: 'recommended' },
  { type: 'OTHER', label: 'Building approval', requirement: 'optional' },
];

const US_RESIDENTIAL_CERTS: PmsCertConfig[] = [
  { type: 'LEAD_PAINT_DISCLOSURE', label: 'Lead paint disclosure (pre-1978)', requirement: 'recommended' },
  { type: 'SMOKE_CO_ALARM', label: 'Smoke & CO detectors', requirement: 'recommended' },
  { type: 'FIRE_RISK_ASSESSMENT', label: 'Fire safety', requirement: 'optional' },
];

const US_COMMERCIAL_CERTS: PmsCertConfig[] = [
  { type: 'FIRE_RISK_ASSESSMENT', label: 'Fire safety inspection', requirement: 'recommended' },
  { type: 'PLANNING_PERMISSION', label: 'Zoning / occupancy certificate', requirement: 'recommended' },
];

const UK_UTILITIES = ['ELECTRICITY', 'GAS', 'WATER', 'BROADBAND', 'COUNCIL_TAX'];
const NG_UTILITIES = ['ELECTRICITY', 'GENERATOR', 'WATER', 'ESTATE_SECURITY', 'BROADBAND'];
const US_UTILITIES = ['ELECTRICITY', 'GAS', 'WATER', 'SEWER', 'TRASH', 'BROADBAND'];
const UK_COMM_UTILITIES = [...UK_UTILITIES, 'BUSINESS_RATES'];
const NG_COMM_UTILITIES = [...NG_UTILITIES];
const US_COMM_UTILITIES = [...US_UTILITIES];

const UK_INSURANCE = ['BUILDINGS', 'CONTENTS', 'LANDLORD', 'PUBLIC_LIABILITY', 'RENT_GUARANTEE'];
const COMM_INSURANCE = ['COMMERCIAL_COMBINED', 'PUBLIC_LIABILITY', 'BUILDINGS', 'OTHER'];

export function resolvePmsMarket(country?: string | null): PmsMarket {
  const canonical = canonicalizeListingMarketCountry(country || '');
  switch (canonical) {
    case 'United Kingdom':
      return 'UK';
    case 'Nigeria':
      return 'NG';
    case 'United States':
      return 'US';
    case 'Ireland':
      return 'IE';
    default:
      return 'default';
  }
}

function buildConfig(
  market: PmsMarket,
  specification: PmsSpecification
): PropertyPmsFormConfig {
  const isCommercial = specification === 'COMMERCIAL';

  let certs: PmsCertConfig[] = [];
  let utilityTypes: string[] = UK_UTILITIES;
  let insuranceTypes: string[] = isCommercial ? COMM_INSURANCE : UK_INSURANCE;

  if (market === 'UK') {
    certs = isCommercial ? UK_COMMERCIAL_CERTS : UK_RESIDENTIAL_CERTS;
    utilityTypes = isCommercial ? UK_COMM_UTILITIES : UK_UTILITIES;
  } else if (market === 'NG') {
    certs = isCommercial ? NG_COMMERCIAL_CERTS : NG_RESIDENTIAL_CERTS;
    utilityTypes = isCommercial ? NG_COMM_UTILITIES : NG_UTILITIES;
    insuranceTypes = isCommercial ? COMM_INSURANCE : UK_INSURANCE;
  } else if (market === 'US') {
    certs = isCommercial ? US_COMMERCIAL_CERTS : US_RESIDENTIAL_CERTS;
    utilityTypes = isCommercial ? US_COMM_UTILITIES : US_UTILITIES;
    insuranceTypes = isCommercial ? COMM_INSURANCE : UK_INSURANCE;
  } else if (market === 'IE') {
    certs = isCommercial ? UK_COMMERCIAL_CERTS : UK_RESIDENTIAL_CERTS;
    utilityTypes = isCommercial ? UK_COMM_UTILITIES : UK_UTILITIES;
  } else {
    certs = isCommercial ? UK_COMMERCIAL_CERTS : UK_RESIDENTIAL_CERTS;
  }

  return {
    market,
    specification,
    sections: {
      compliance: { visible: true, certs },
      insurance: { visible: true, insuranceTypes },
      utilities: { visible: true, utilityTypes },
      ownership: { visible: true },
    },
  };
}

export function getPropertyPmsFormConfig(
  country?: string | null,
  specificationType?: PropertySpecificationType | string | null
): PropertyPmsFormConfig {
  const market = resolvePmsMarket(country);
  const spec: PmsSpecification =
    specificationType === PropertySpecificationType.COMMERCIAL ||
    specificationType === 'COMMERCIAL'
      ? 'COMMERCIAL'
      : 'RESIDENTIAL';
  return buildConfig(market, spec);
}

export function getRecommendedCertTypes(config: PropertyPmsFormConfig): PropertyComplianceCertTypeKey[] {
  return (config.sections.compliance.certs || [])
    .filter((c) => c.requirement === 'required' || c.requirement === 'recommended')
    .map((c) => c.type);
}

export interface OperationalCompletenessResult {
  score: number;
  complete: boolean;
  missing: string[];
  expiringSoon: string[];
  expired: string[];
}

export function computeOperationalCompleteness(
  config: PropertyPmsFormConfig,
  data: {
    complianceRecords?: Array<{ certType: string; expiryDate?: Date | string | null; status?: string }>;
    insurancePolicies?: unknown[];
    utilityAccounts?: unknown[];
    ownershipProfile?: Record<string, unknown> | null;
  }
): OperationalCompletenessResult {
  const missing: string[] = [];
  const expiringSoon: string[] = [];
  const expired: string[] = [];
  const now = Date.now();
  const soonThreshold = now + 90 * 24 * 60 * 60 * 1000;

  const recommended = config.sections.compliance.certs || [];
  const records = (data.complianceRecords || []).filter(Boolean);

  for (const cert of recommended) {
    if (cert.requirement === 'hidden' || cert.requirement === 'optional') continue;
    const record = records.find((r) => r.certType === cert.type);
    if (!record) {
      missing.push(cert.label);
      continue;
    }
    if (record.expiryDate) {
      const exp = new Date(record.expiryDate).getTime();
      if (exp < now) expired.push(cert.label);
      else if (exp < soonThreshold) expiringSoon.push(cert.label);
    }
  }

  if (config.sections.insurance.visible && !(data.insurancePolicies?.length)) {
    missing.push('Insurance policy');
  }

  if (config.sections.ownership.visible && !data.ownershipProfile?.ownerEntityName) {
    missing.push('Ownership details');
  }

  const totalChecks = Math.max(recommended.filter((c) => c.requirement !== 'optional').length + 2, 1);
  const penalty = missing.length + expired.length + expiringSoon.length * 0.5;
  const score = Math.max(0, Math.min(100, Math.round(((totalChecks - penalty) / totalChecks) * 100)));

  return {
    score,
    complete: missing.length === 0 && expired.length === 0,
    missing,
    expiringSoon,
    expired,
  };
}
