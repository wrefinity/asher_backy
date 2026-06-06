import {
  getApplicationAddressFormConfig,
  resolveApplicationMarket,
  type ApplicationAddressFormConfig,
  type SupportedApplicationMarket,
} from './applicationAddressFields';

import {
  applyTenancyHistoryMinimumToFormConfig,
  resolveMinimumTenancyHistoryYears,
} from './tenancyHistoryRules';

export type { SupportedApplicationMarket, ApplicationAddressFormConfig };
export { resolveApplicationMarket };

export interface IdentificationTypeOption {
  value: string;
  label: string;
}

export interface DocumentFieldConfig {
  key:
    | 'idDocument'
    | 'bankStatements'
    | 'proofOfIncome'
    | 'proofOfAddress'
    | 'proofOfBenefits';
  label: string;
  required: boolean;
}

export interface BenefitFieldConfig {
  key:
    | 'taxCredit'
    | 'childBenefit'
    | 'childMaintenance'
    | 'disabilityBenefit'
    | 'housingBenefit'
    | 'pension';
  label: string;
}

export interface ApplicationFormConfig {
  market: SupportedApplicationMarket | 'default';
  address: ApplicationAddressFormConfig;
  personal: {
    identificationTypes: IdentificationTypeOption[];
    idNumberLabel: string;
    issuingAuthorityLabel: string;
  };
  residential: {
    /** Collect previous landlord / agency details (typical for referencing). */
    showPreviousLandlord: boolean;
    /** When false, landlord block is optional (e.g. first-time renters). */
    requirePreviousLandlord: boolean;
    /** Hide landlord block when tenant selects own property or living with family. */
    skipLandlordWhenNotRenting: boolean;
    /** Total years of address history (current + previous) required from applicant. */
    minimumTenancyHistoryYears: number;
    /** Applicant-facing explanation of the minimum history requirement. */
    minimumTenancyHistoryHelp?: string;
  };
  employment: {
    showBenefitsSection: boolean;
    benefitFields: BenefitFieldConfig[];
    incomeLabel: string;
    incomeHelp?: string;
  };
  additional: {
    showRightToRent: boolean;
    rightToRentLabel: string;
    rightToRentHelp?: string;
    showParking: boolean;
    showPets: boolean;
    showSmoking: boolean;
    showOutstandingDebts: boolean;
  };
  documents: DocumentFieldConfig[];
  guarantor: {
    showStep: boolean;
    optional: boolean;
    description?: string;
    showMonthlyIncome: boolean;
    showIdFields: boolean;
  };
  declaration: {
    intro: string;
    bullets: string[];
    showCreditCheckConsent: boolean;
    creditCheckLabel?: string;
  };
}

/** Base config before market tenancy minimums are applied. */
export type ApplicationFormConfigDraft = Omit<ApplicationFormConfig, 'residential'> & {
  residential: Omit<
    ApplicationFormConfig['residential'],
    'minimumTenancyHistoryYears' | 'minimumTenancyHistoryHelp'
  >;
};

const UK_ID_TYPES: IdentificationTypeOption[] = [
  { value: 'passport', label: 'Passport (UK or other)' },
  { value: 'driving licence', label: 'Driving licence' },
  { value: 'national id', label: 'Biometric residence permit / share code document' },
];

const NG_ID_TYPES: IdentificationTypeOption[] = [
  { value: 'national id', label: 'National ID (NIN)' },
  { value: 'passport', label: 'International passport' },
  { value: 'driving licence', label: "Driver's licence" },
];

const US_ID_TYPES: IdentificationTypeOption[] = [
  { value: 'passport', label: 'Passport' },
  { value: 'driving licence', label: "Driver's license" },
  { value: 'national id', label: 'State ID card' },
];

const IE_ID_TYPES: IdentificationTypeOption[] = [
  { value: 'passport', label: 'Passport' },
  { value: 'driving licence', label: 'Driving licence' },
  { value: 'national id', label: 'Public Services Card' },
];

const DEFAULT_ID_TYPES: IdentificationTypeOption[] = [
  { value: 'passport', label: 'Passport' },
  { value: 'driving licence', label: 'Driving licence' },
  { value: 'national id', label: 'National ID' },
];

const UK_BENEFITS: BenefitFieldConfig[] = [
  { key: 'taxCredit', label: 'Tax credits' },
  { key: 'childBenefit', label: 'Child benefit' },
  { key: 'childMaintenance', label: 'Child maintenance' },
  { key: 'disabilityBenefit', label: 'Disability benefit' },
  { key: 'housingBenefit', label: 'Housing benefit / Universal Credit' },
  { key: 'pension', label: 'Pension' },
];

export function getApplicationFormConfig(
  country?: string | null,
  landlordMinimumYears?: number | null
): ApplicationFormConfig {
  const market = resolveApplicationMarket(country);
  const address = getApplicationAddressFormConfig(country);
  let config: ApplicationFormConfigDraft;

  switch (market) {
    case 'United Kingdom':
      config = {
        market,
        address,
        personal: {
          identificationTypes: UK_ID_TYPES,
          idNumberLabel: 'ID / document number',
          issuingAuthorityLabel: 'Issuing authority (e.g. HMPO, DVLA, Home Office)',
        },
        residential: {
          showPreviousLandlord: true,
          requirePreviousLandlord: true,
          skipLandlordWhenNotRenting: true,
        },
        employment: {
          showBenefitsSection: true,
          benefitFields: UK_BENEFITS,
          incomeLabel: 'Gross monthly income',
          incomeHelp: 'Before tax. Include salary and regular income.',
        },
        additional: {
          showRightToRent: true,
          rightToRentLabel: 'Right to rent status',
          rightToRentHelp:
            'Landlords must verify you can legally rent in England. Select the option that applies — you may need to provide documents or a share code later.',
          showParking: true,
          showPets: true,
          showSmoking: true,
          showOutstandingDebts: true,
        },
        documents: [
          {
            key: 'idDocument',
            label: 'Photo ID (passport or driving licence)',
            required: true,
          },
          {
            key: 'proofOfAddress',
            label: 'Proof of current address (utility bill or bank statement, within 3 months)',
            required: true,
          },
          {
            key: 'bankStatements',
            label: 'Last 3 months bank statements (PDF — not screenshots)',
            required: true,
          },
          {
            key: 'proofOfIncome',
            label: 'Proof of income (recent payslips, accounts, or employment contract)',
            required: true,
          },
          {
            key: 'proofOfBenefits',
            label: 'Proof of benefits (if you receive Universal Credit or housing benefit)',
            required: false,
          },
        ],
        guarantor: {
          showStep: true,
          optional: false,
          description:
            'A UK guarantor is often required if your income is below the usual affordability threshold. Provide their name and contact details only — they complete the full reference form separately.',
          showMonthlyIncome: false,
          showIdFields: false,
        },
        declaration: {
          intro:
            'This declaration forms part of your rental application. Read each statement carefully and confirm individually before signing.',
          bullets: [
            'I confirm that all information I have provided in this application — including personal details, residential history, employment, references, guarantor contact, and uploaded documents — is true, complete, and accurate to the best of my knowledge.',
            'I understand that any false, misleading, or incomplete information may result in my application being rejected, an offer being withdrawn, or a tenancy being terminated if discovered after move-in.',
            'I consent to the landlord or their agent contacting my employer, previous landlords, personal and professional referees, and my nominated guarantor to verify the information I have supplied.',
            'I consent to referencing and screening checks including employment verification, landlord references, and soft credit or affordability checks, where permitted under applicable UK law.',
            'I understand the landlord must verify my right to rent in England before a tenancy begins, and I will provide any documents or share codes required when asked.',
            'I understand this application does not guarantee a tenancy and that any holding deposit or application fee (if applicable) will be handled according to the terms communicated to me.',
          ],
          showCreditCheckConsent: true,
          creditCheckLabel:
            'I consent to soft credit and affordability checks for this application.',
        },
      };
      break;

    case 'Nigeria':
      config = {
        market,
        address,
        personal: {
          identificationTypes: NG_ID_TYPES,
          idNumberLabel: 'ID number (NIN, passport, or BVN if applicable)',
          issuingAuthorityLabel: 'Issuing authority (e.g. NIMC, FRSC, Immigration)',
        },
        residential: {
          showPreviousLandlord: true,
          requirePreviousLandlord: true,
          skipLandlordWhenNotRenting: true,
        },
        employment: {
          showBenefitsSection: false,
          benefitFields: [],
          incomeLabel: 'Monthly income (NGN)',
          incomeHelp: 'Your regular monthly income from employment or business.',
        },
        additional: {
          showRightToRent: false,
          rightToRentLabel: '',
          showParking: true,
          showPets: true,
          showSmoking: true,
          showOutstandingDebts: true,
        },
        documents: [
          {
            key: 'idDocument',
            label: 'Valid photo ID (NIN slip/card, passport, or driver\'s licence)',
            required: true,
          },
          {
            key: 'proofOfAddress',
            label: 'Proof of current address (utility bill or bank statement)',
            required: true,
          },
          {
            key: 'bankStatements',
            label: 'Last 3 months bank statements',
            required: true,
          },
          {
            key: 'proofOfIncome',
            label: 'Proof of income (payslip, employment letter, or business account statement)',
            required: true,
          },
          {
            key: 'proofOfBenefits',
            label: 'Additional supporting document (optional)',
            required: false,
          },
        ],
        guarantor: {
          showStep: true,
          optional: false,
          description:
            'A guarantor with verifiable income is commonly required in Nigeria. Provide their name and contact details only — they complete the full reference form separately.',
          showMonthlyIncome: false,
          showIdFields: false,
        },
        declaration: {
          intro: 'Confirm the following to submit your rental application.',
          bullets: [
            'All information provided is accurate and complete.',
            'I consent to employment and landlord reference checks.',
            'I consent to verification of my identity documents where required.',
            'I understand false information may result in rejection.',
          ],
          showCreditCheckConsent: false,
        },
      };
      break;

    case 'United States':
      config = {
        market,
        address,
        personal: {
          identificationTypes: US_ID_TYPES,
          idNumberLabel: 'ID / document number',
          issuingAuthorityLabel: 'Issuing state or authority',
        },
        residential: {
          showPreviousLandlord: true,
          requirePreviousLandlord: true,
          skipLandlordWhenNotRenting: true,
        },
        employment: {
          showBenefitsSection: false,
          benefitFields: [],
          incomeLabel: 'Gross monthly income (USD)',
          incomeHelp: 'Before tax. Include wages and regular income.',
        },
        additional: {
          showRightToRent: false,
          rightToRentLabel: '',
          showParking: true,
          showPets: true,
          showSmoking: true,
          showOutstandingDebts: true,
        },
        documents: [
          {
            key: 'idDocument',
            label: 'Government-issued photo ID (driver\'s license, state ID, or passport)',
            required: true,
          },
          {
            key: 'proofOfAddress',
            label: 'Proof of current address (if different from ID)',
            required: false,
          },
          {
            key: 'bankStatements',
            label: 'Recent bank statements (typically last 2 months)',
            required: true,
          },
          {
            key: 'proofOfIncome',
            label: 'Proof of income (pay stubs, offer letter, or tax return)',
            required: true,
          },
          {
            key: 'proofOfBenefits',
            label: 'Additional income verification (optional)',
            required: false,
          },
        ],
        guarantor: {
          showStep: true,
          optional: true,
          description:
            'Provide your guarantor\'s name and contact details if requested. They complete employment, ID, and documents on their own reference form.',
          showMonthlyIncome: false,
          showIdFields: false,
        },
        declaration: {
          intro: 'Please review and confirm before submitting.',
          bullets: [
            'All information provided is true and complete.',
            'I consent to rental history and employment verification.',
            'I understand the landlord may run background and credit screening as permitted by law.',
            'I understand application fees (if any) are non-refundable unless stated otherwise.',
          ],
          showCreditCheckConsent: true,
          creditCheckLabel:
            'I authorize screening including credit and background checks as permitted under applicable state and federal law (including FCRA where applicable).',
        },
      };
      break;

    case 'Ireland':
      config = {
        market,
        address,
        personal: {
          identificationTypes: IE_ID_TYPES,
          idNumberLabel: 'Document number',
          issuingAuthorityLabel: 'Issuing authority (e.g. DFAT, NDLS, DSP)',
        },
        residential: {
          showPreviousLandlord: true,
          requirePreviousLandlord: true,
          skipLandlordWhenNotRenting: true,
        },
        employment: {
          showBenefitsSection: false,
          benefitFields: [],
          incomeLabel: 'Gross monthly income',
          incomeHelp: 'Before tax. Include salary and regular income.',
        },
        additional: {
          showRightToRent: false,
          rightToRentLabel: '',
          showParking: true,
          showPets: true,
          showSmoking: true,
          showOutstandingDebts: true,
        },
        documents: [
          {
            key: 'idDocument',
            label: 'Photo ID (passport, driving licence, or Public Services Card)',
            required: true,
          },
          {
            key: 'proofOfAddress',
            label: 'Proof of current address (utility bill or bank statement)',
            required: true,
          },
          {
            key: 'bankStatements',
            label: 'Recent bank statements (last 3 months)',
            required: true,
          },
          {
            key: 'proofOfIncome',
            label: 'Proof of income (payslips or employment summary)',
            required: true,
          },
          {
            key: 'proofOfBenefits',
            label: 'Additional supporting document (optional)',
            required: false,
          },
        ],
        guarantor: {
          showStep: true,
          optional: true,
          description:
            'Provide your guarantor\'s name and contact details if required. They complete the full reference form separately.',
          showMonthlyIncome: false,
          showIdFields: false,
        },
        declaration: {
          intro: 'Please confirm the following declarations.',
          bullets: [
            'All information provided is true and complete.',
            'I consent to reference checks with employers and previous landlords.',
            'I understand the landlord must register the tenancy with the RTB where applicable.',
            'I understand false information may lead to rejection.',
          ],
          showCreditCheckConsent: false,
        },
      };
      break;

    default:
      config = {
        market: 'default',
        address,
        personal: {
          identificationTypes: DEFAULT_ID_TYPES,
          idNumberLabel: 'ID number',
          issuingAuthorityLabel: 'Issuing authority',
        },
        residential: {
          showPreviousLandlord: true,
          requirePreviousLandlord: true,
          skipLandlordWhenNotRenting: true,
        },
        employment: {
          showBenefitsSection: false,
          benefitFields: [],
          incomeLabel: 'Monthly income',
        },
        additional: {
          showRightToRent: false,
          rightToRentLabel: '',
          showParking: true,
          showPets: true,
          showSmoking: true,
          showOutstandingDebts: true,
        },
        documents: [
          { key: 'idDocument', label: 'Photo ID', required: true },
          { key: 'bankStatements', label: 'Bank statements', required: true },
          { key: 'proofOfIncome', label: 'Proof of income', required: true },
          { key: 'proofOfAddress', label: 'Proof of address', required: false },
          { key: 'proofOfBenefits', label: 'Additional document', required: false },
        ],
        guarantor: {
          showStep: true,
          optional: true,
          description:
            'Provide your guarantor\'s name and contact details if required. They complete the full reference form separately.',
          showMonthlyIncome: false,
          showIdFields: false,
        },
        declaration: {
          intro: 'Please confirm before submitting.',
          bullets: [
            'All information provided is true and accurate.',
            'I consent to reference and verification checks.',
          ],
          showCreditCheckConsent: false,
        },
      };
      break;
  }

  const minimumYears = resolveMinimumTenancyHistoryYears(
    landlordMinimumYears,
    country
  );
  return applyTenancyHistoryMinimumToFormConfig(config, minimumYears, country);
}
