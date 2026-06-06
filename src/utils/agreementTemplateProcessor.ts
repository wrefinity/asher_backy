/**
 * Server-side merge-tag processing for lease agreements sent to tenants.
 * Mirrors Landlord FE tagReplacement logic so stored processedContent is complete.
 */

import {
  applyLeaseContextToApplication,
  formatAgreementDate,
  resolveLeaseAgreementContext,
} from './leaseAgreementContext';
import {
  formatApplicationReference,
  joinAddress,
  resolveAgreementPropertyContext,
  resolveBedrooms,
  resolveBathrooms,
  resolveDepositValue,
  resolveGuarantorFields,
  resolveInitialDepositValue,
  getResidentialSpec,
  resolvePropertyAddress,
  resolvePropertyState,
  resolvePropertyType,
  resolveRentValue,
} from './agreementTagResolver';

const formatDate = formatAgreementDate;

const isSpecialTemplateTag = (tagKey: string): boolean =>
  tagKey.startsWith('input:') ||
  tagKey.startsWith('signature:') ||
  /^landlord[_\s]?signature$/i.test(tagKey) ||
  /^tenant[_\s]?signature$/i.test(tagKey);

/** Extract {{tag}} from TipTap span wrappers before replacement. */
export function normalizeTemplateTagMarkup(html: string): string {
  if (!html) return '';
  return html.replace(
    /<span[^>]*data-tag="([^"]*)"[^>]*>[\s\S]*?<\/span>/gi,
    (_, dataTag: string) => dataTag
  );
}

export function createAgreementTagMapping(
  application: any,
  property?: any,
  landlordUser?: any,
  leaseOptions: { agreementSentAt?: Date; landlordLeaseStartDate?: Date } = {}
): Record<string, string> {
  if (!application) return {};

  const propCtx = resolveAgreementPropertyContext(application, property);
  const effectiveProperty = propCtx.property;

  const leaseCtx = resolveLeaseAgreementContext(application, effectiveProperty, leaseOptions);
  const appWithLease = applyLeaseContextToApplication(application, leaseCtx);

  const personalDetails = appWithLease.personalDetails ?? application.personalDetails;
  const employmentInfo = appWithLease.employmentInfo ?? application.employmentInfo;
  const residentialInfo = appWithLease.residentialInfo ?? application.residentialInfo;
  const emergencyInfo = appWithLease.emergencyInfo ?? application.emergencyInfo;
  const questions = appWithLease.applicationQuestions?.[0] ?? application.applicationQuestions?.[0];
  const createdBy = appWithLease.user ?? application.user;
  const guarantorTags = resolveGuarantorFields(appWithLease);

  const landlordProfile =
    landlordUser?.profile ||
    effectiveProperty?.landlord?.user?.profile ||
    effectiveProperty?.landlord?.profile;
  const landlordEmail =
    landlordUser?.email ||
    effectiveProperty?.landlord?.user?.email ||
    effectiveProperty?.landlordEmail ||
    '';
  const landlordBusinessName =
    landlordUser?.landlords?.businessName ||
    effectiveProperty?.landlord?.businessName ||
    '';
  const landlordFirstLast = `${landlordProfile?.firstName ?? ''} ${landlordProfile?.lastName ?? ''}`.trim();
  const landlordName =
    landlordBusinessName ||
    landlordFirstLast ||
    landlordProfile?.fullname ||
    effectiveProperty?.landlordName ||
    '';

  const tenantFirst = personalDetails?.firstName ?? '';
  const tenantLast = personalDetails?.lastName ?? '';
  const tenantFullName = `${tenantFirst} ${tenantLast}`.trim();

  const rentValue = resolveRentValue(appWithLease, propCtx);
  const depositValue = resolveDepositValue(appWithLease, propCtx);
  const initialDepositValue = resolveInitialDepositValue(appWithLease, propCtx);
  const dueDateRaw = effectiveProperty?.dueDate || '';
  const rentDueDay = dueDateRaw
    ? String(new Date(dueDateRaw).getDate())
    : effectiveProperty?.rentDueDay?.toString() || '1';

  const propertyAddress =
    resolvePropertyAddress(propCtx) ||
    effectiveProperty?.location ||
    effectiveProperty?.address ||
    '';
  const appRef = formatApplicationReference(appWithLease.id || application.id);

  return {
    firstName: tenantFirst,
    lastName: tenantLast,
    middleName: personalDetails?.middleName || '',
    fullName: tenantFullName,
    tenantFullName,
    title: personalDetails?.title || '',
    email: personalDetails?.email || createdBy?.email || '',
    tenantEmail: personalDetails?.email || createdBy?.email || '',
    phoneNumber: personalDetails?.phoneNumber || '',
    tenantPhone: personalDetails?.phoneNumber || '',
    dateOfBirth: formatDate(personalDetails?.dob),
    nationality: personalDetails?.nationality || '',
    maritalStatus: personalDetails?.maritalStatus || '',
    identificationType: personalDetails?.identificationType || '',
    identificationNo: personalDetails?.identificationNo || '',
    address:
      residentialInfo?.address ||
      propertyAddress ||
      createdBy?.profile?.address ||
      '',
    city: residentialInfo?.city || effectiveProperty?.city || createdBy?.profile?.city || '',
    state:
      residentialInfo?.state ||
      resolvePropertyState(effectiveProperty) ||
      createdBy?.profile?.state ||
      '',
    country:
      residentialInfo?.country || effectiveProperty?.country || createdBy?.profile?.country || '',
    zipCode:
      residentialInfo?.zipCode ||
      effectiveProperty?.zipcode ||
      effectiveProperty?.zipCode ||
      createdBy?.profile?.zip ||
      '',
    landlordName,
    landlordEmail,
    landlordPhone: landlordProfile?.phoneNumber || property?.landlordPhone || '',
    landlordAddress: landlordProfile?.address || '',
    landlordCity: landlordProfile?.city || '',
    landlordState: landlordProfile?.state || '',
    landlordZipCode: landlordProfile?.zip || '',
    landlordCountry: landlordProfile?.country || '',
    landlordServiceAddress: joinAddress(
      landlordProfile?.address,
      landlordProfile?.city,
      landlordProfile?.state,
      landlordProfile?.zip,
      landlordProfile?.country
    ),
    landlordBusinessName,
    propertyName: effectiveProperty?.name || propCtx.listing?.listingEntity?.name || '',
    propertyAddress,
    propertyCity: effectiveProperty?.city || '',
    propertyState: resolvePropertyState(effectiveProperty),
    propertyCountry: effectiveProperty?.country || '',
    propertyZipCode: effectiveProperty?.zipcode || effectiveProperty?.zipCode || '',
    propertyType: resolvePropertyType(propCtx, application),
    bedrooms: resolveBedrooms(propCtx),
    bathrooms: resolveBathrooms(propCtx),
    propertySize:
      effectiveProperty?.propertySize?.toString() ||
      effectiveProperty?.propertysize?.toString() ||
      effectiveProperty?.totalArea?.toString() ||
      '',
    furnished:
      propCtx.unit?.furnished?.toString() ||
      propCtx.room?.furnished?.toString() ||
      getResidentialSpec(effectiveProperty)?.furnished?.toString() ||
      effectiveProperty?.furnished?.toString() ||
      '',
    rentAmount: rentValue,
    monthlyRent: rentValue,
    securityDeposit: depositValue,
    initialDeposit: initialDepositValue,
    dueDate: dueDateRaw ? formatDate(dueDateRaw) : `Day ${rentDueDay} of each month`,
    rentDueDay,
    currency: effectiveProperty?.currency || propCtx.listing?.property?.currency || '',
    currentDate: new Date().toLocaleDateString(),
    startDate: formatDate(leaseCtx.leaseStartDate) || new Date().toLocaleDateString(),
    endDate: formatDate(leaseCtx.leaseEndDate),
    leaseStartDate: formatDate(leaseCtx.leaseStartDate),
    leaseEndDate: formatDate(leaseCtx.leaseEndDate),
    moveInDate: formatDate(leaseCtx.moveInDate),
    leaseTerm: leaseCtx.leaseTermDisplay,
    applicationId: appRef,
    referenceNumber: appRef,
    status: appWithLease.status || application.status || '',
    createdAt: formatDate(appWithLease.createdAt ?? application.createdAt),
    updatedAt: formatDate(appWithLease.updatedAt ?? application.updatedAt),
    ...guarantorTags,
    employmentStatus: employmentInfo?.employmentStatus || '',
    employerCompany: employmentInfo?.employerCompany || employmentInfo?.businessName || '',
    employerEmail: employmentInfo?.employerEmail || '',
    employerPhone: employmentInfo?.employerPhone || '',
    positionTitle: employmentInfo?.positionTitle || '',
    monthlyIncome: employmentInfo?.monthlyOrAnualIncome || '',
    employmentStartDate: formatDate(employmentInfo?.startDate),
    employmentAddress: employmentInfo?.address || '',
    employmentCity: employmentInfo?.city || '',
    employmentState: employmentInfo?.state || '',
    employmentCountry: employmentInfo?.country || '',
    employmentZipCode: employmentInfo?.zipCode || '',
    emergencyContactName: emergencyInfo?.fullname || '',
    emergencyContactPhone: emergencyInfo?.phoneNumber || '',
    emergencyContactRelationship: emergencyInfo?.relationship || '',
    petPolicy: questions?.havePet || '',
    smokingPolicy: questions?.youSmoke || '',
    parkingPolicy: questions?.requireParking || '',
    additionalOccupants: questions?.additionalOccupants || '',
    'bill:rentAmount': rentValue,
    'bill:securityDeposit': depositValue,
    'bill:monthlyRent': rentValue,
    'bill:total': rentValue,
    'payment:method': effectiveProperty?.paymentMethod || 'Bank transfer / standing order',
    'payment:dueDate': dueDateRaw ? formatDate(dueDateRaw) : `Day ${rentDueDay} of each month`,
    'payment:lateFee': 'Statutory interest after 14 days (Tenant Fees Act 2019)',
    'payment:lateFeePercent': '3% above Bank of England base rate',
    'payment:terms': effectiveProperty?.paymentTerms || 'Monthly in advance',
  };
}

const TENANT_SIGNATURE_HTML = `<div class="tenant-agreement-signature tenant-signature" data-signature-role="tenant" role="button" tabindex="0" aria-label="Sign as tenant" style="border: 2px dashed #6366f1; padding: 12px 20px; margin: 8px 0; border-radius: 8px; background: #f5f3ff; cursor: pointer; display: inline-block; min-width: 220px; text-align: center; color: #4338ca; font-weight: 600; user-select: none; pointer-events: auto;">Click here to sign as Tenant</div>`;

const LANDLORD_SIGNATURE_PENDING_HTML = `<div class="tenant-agreement-signature landlord-signature-pending" data-signature-role="landlord" style="border: 1px dashed #94a3b8; padding: 12px 20px; margin: 8px 0; border-radius: 8px; background: #f8fafc; display: inline-block; min-width: 220px; text-align: center; color: #64748b; font-style: italic;">Landlord signature pending</div>`;

const WITNESS_SIGNATURE_HTML = `<div class="tenant-agreement-signature witness-signature" data-signature-role="witness" style="border: 1px dashed #cbd5e1; padding: 10px 16px; margin: 8px 0; border-radius: 8px; background: #f1f5f9; display: inline-block; min-width: 200px; text-align: center; color: #475569;">Witness / Guarantor signature</div>`;

const INPUT_TEXT =
  '<input type="text" style="border: 1px solid #cbd5e1; padding: 4px; margin: 2px; border-radius: 4px; min-width: 120px;" placeholder="Enter text..." readonly />';
const INPUT_CHECKBOX = '<input type="checkbox" style="margin: 0 4px;" disabled />';
const INPUT_DATE =
  '<input type="date" style="border: 1px solid #cbd5e1; padding: 4px; margin: 2px; border-radius: 4px;" readonly />';

function applySignatureAndInputTags(content: string, forTenantView = false): string {
  let result = content;
  result = result.replace(/\{\{input:text\}\}/g, INPUT_TEXT);
  result = result.replace(/\{\{input:checkbox\}\}/g, INPUT_CHECKBOX);
  result = result.replace(/\{\{input:date\}\}/g, INPUT_DATE);
  result = result.replace(/\[input:text\]/gi, INPUT_TEXT);
  result = result.replace(/\[input:checkbox\]/gi, INPUT_CHECKBOX);
  result = result.replace(/\[input:date\]/gi, INPUT_DATE);

  const landlordSig = forTenantView ? LANDLORD_SIGNATURE_PENDING_HTML : LANDLORD_SIGNATURE_PENDING_HTML;
  const tenantSig = forTenantView ? TENANT_SIGNATURE_HTML : TENANT_SIGNATURE_HTML;

  const signaturePatterns: Array<[RegExp, string]> = [
    [/\{\{(?:landlord[_\s]?signature|signature[:\s]landlord)\}\}/gi, landlordSig],
    [/\{\{(?:tenant[_\s]?signature|signature[:\s]tenant)\}\}/gi, tenantSig],
    [/\{\{(?:signature[:\s]witness|witness[_\s]?signature)\}\}/gi, WITNESS_SIGNATURE_HTML],
    [/\{\{(?:signature[:\s]guarantor|guarantor[_\s]?signature)\}\}/gi, WITNESS_SIGNATURE_HTML],
    [/\[signature:landlord[^\]]*\]/gi, landlordSig],
    [/\[signature:tenant[^\]]*\]/gi, tenantSig],
    [/\[signature:witness[^\]]*\]/gi, WITNESS_SIGNATURE_HTML],
    [/\[signature:guarantor[^\]]*\]/gi, WITNESS_SIGNATURE_HTML],
    [/\[landlord[_\s]?signature\]/gi, landlordSig],
    [/\[tenant[_\s]?signature\]/gi, tenantSig],
  ];

  for (const [pattern, replacement] of signaturePatterns) {
    result = result.replace(pattern, replacement);
  }

  // Landlord FE preview placeholders → tenant-facing zones
  result = result.replace(
    /<div class="signature-placeholder tenant-signature"[^>]*>[\s\S]*?<\/div>/gi,
    TENANT_SIGNATURE_HTML
  );
  result = result.replace(
    /<div class="signature-placeholder landlord-signature"[^>]*>[\s\S]*?<\/div>/gi,
    LANDLORD_SIGNATURE_PENDING_HTML
  );

  return result;
}

/**
 * Replace merge tags in agreement HTML using application + property + landlord data.
 */
export function processAgreementTemplateContent(
  rawContent: string,
  application: any,
  property?: any,
  landlordUser?: any,
  options: {
    forTenantView?: boolean;
    agreementSentAt?: Date;
    landlordLeaseStartDate?: Date;
  } = {}
): string {
  if (!rawContent?.trim()) return rawContent || '';

  const normalized = normalizeTemplateTagMarkup(rawContent);
  const tagMapping = createAgreementTagMapping(
    application,
    property,
    landlordUser,
    {
      agreementSentAt: options.agreementSentAt,
      landlordLeaseStartDate: options.landlordLeaseStartDate,
    }
  );
  let processed = normalized;

  processed = processed.replace(/\{\{([^}]+)\}\}/g, (match, tagKey: string) => {
    if (isSpecialTemplateTag(tagKey)) return match;
    const value = tagMapping[tagKey];
    if (value !== undefined && value !== '') {
      return `<strong>${value}</strong>`;
    }
    return '—';
  });

  // Replace leftover bracket tags from older sends
  processed = processed.replace(/\[([a-zA-Z0-9:_-]+)\]/g, (match, tagKey: string) => {
    if (isSpecialTemplateTag(tagKey)) return match;
    const value = tagMapping[tagKey];
    if (value !== undefined && value !== '') {
      return `<strong>${value}</strong>`;
    }
    return '—';
  });

  processed = applySignatureAndInputTags(processed, options.forTenantView ?? true);
  return processed;
}
