/**
 * Resolves lease agreement merge tags from application, property, listing, unit/room,
 * and guarantor sources. Field names in templates often differ from DB/API shapes.
 */

export const joinAddress = (...parts: Array<string | null | undefined>): string =>
  parts.map((p) => (p ?? '').trim()).filter(Boolean).join(', ');

export const toDisplayString = (value: unknown): string => {
  if (value == null || value === '') return '';
  if (typeof value === 'object' && value !== null && 'toString' in value) {
    return String(value);
  }
  return String(value);
};

/** Human-readable application reference (not raw CUID). */
export const formatApplicationReference = (applicationId?: string | null): string => {
  if (!applicationId) return '';
  return `APP-${String(applicationId).slice(-8).toUpperCase()}`;
};

export const resolvePropertyState = (property?: any): string => {
  if (!property) return '';
  if (typeof property.state === 'object' && property.state !== null) {
    return property.state.name || property.state.id || '';
  }
  if (typeof property.state === 'string') return property.state;
  return property.stateId || property.stateName || '';
};

export interface AgreementPropertyContext {
  property: any;
  listing?: any;
  unit?: any;
  room?: any;
  propertyListing?: any;
}

/** Merge property + listing + unit/room + propertyListing for tag resolution. */
export function resolveAgreementPropertyContext(
  application?: any,
  property?: any,
  options: { listing?: any; units?: any; rooms?: any } = {}
): AgreementPropertyContext {
  const baseProperty =
    property ||
    application?.properties ||
    application?.applicationInvites?.properties ||
    null;

  const listing = options.listing ?? application?.listing ?? null;
  const listingProperty = listing?.property ?? null;
  const listingEntity = listing?.listingEntity ?? null;

  const unit =
    options.units ??
    application?.units ??
    (listingEntity?.type === 'unit' ? listingEntity : null);

  const room =
    options.rooms ??
    application?.rooms ??
    (listingEntity?.type === 'room' ? listingEntity : null);

  const propertyListing = application?.propertyListing ?? null;

  const mergedProperty = baseProperty
    ? {
        ...baseProperty,
        ...(listingProperty
          ? {
              address: listingProperty.address || baseProperty.address,
              city: listingProperty.city || baseProperty.city,
              country: listingProperty.country || baseProperty.country,
              zipcode: listingProperty.zipcode || baseProperty.zipcode,
              state: listingProperty.state || baseProperty.state,
            }
          : {}),
      }
    : listingProperty
      ? { ...listingProperty }
      : null;

  return {
    property: mergedProperty,
    listing,
    unit,
    room,
    propertyListing,
  };
}

export const getResidentialSpec = (property?: any) => {
  const spec = property?.specification;
  if (Array.isArray(spec)) {
    return spec[0]?.residential ?? property?.residential ?? null;
  }
  return spec?.residential ?? property?.residential ?? null;
};

export function resolveBedrooms(ctx: AgreementPropertyContext): string {
  const { property, listing, unit, room } = ctx;
  const listingProp = listing?.property;
  const residential = getResidentialSpec(property);

  const value =
    unit?.bedrooms ??
    listingProp?.bedrooms ??
    property?.bedrooms ??
    residential?.bedrooms ??
    property?.noBedRoom ??
    room?.bedrooms ??
    (room ? 1 : null);

  return value != null ? String(value) : '';
}

export function resolveBathrooms(ctx: AgreementPropertyContext): string {
  const { property, listing, unit, room } = ctx;
  const listingProp = listing?.property;
  const residential = getResidentialSpec(property);

  const value =
    unit?.bathrooms ??
    listingProp?.bathrooms ??
    property?.bathrooms ??
    residential?.bathrooms ??
    property?.noBathRoom ??
    room?.bathrooms ??
    (room?.ensuite ? 1 : null);

  return value != null ? String(value) : '';
}

export function resolvePropertyType(ctx: AgreementPropertyContext, application?: any): string {
  const { property, listing, unit, propertyListing } = ctx;
  const raw =
    property?.specificationType ||
    listing?.listAs ||
    propertyListing?.listAs ||
    unit?.unitType ||
    property?.type ||
    property?.propertyType ||
    application?.propertyType ||
    listing?.listingType ||
    '';

  if (!raw) return '';
  return String(raw)
    .replace(/_/g, ' ')
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

export function resolvePropertyAddress(ctx: AgreementPropertyContext): string {
  const { property, listing } = ctx;
  const listingProp = listing?.property;
  const prop = property || listingProp;
  if (!prop) return '';

  return joinAddress(
    prop.address,
    prop.address2,
    prop.city,
    resolvePropertyState(prop),
    prop.zipcode || prop.zipCode,
    prop.country
  );
}

export function resolveRentValue(application?: any, ctx?: AgreementPropertyContext): string {
  const fromApp = application?.rentAmountPaid;
  if (fromApp != null && fromApp !== '') return toDisplayString(fromApp);

  const { property, listing, unit, room, propertyListing } = ctx || {};
  const candidates = [
    listing?.price,
    propertyListing?.price,
    unit?.price,
    unit?.entityPrice,
    room?.price,
    room?.entityPrice,
    property?.price,
    property?.rentalFee,
    listing?.property?.price,
  ];

  for (const candidate of candidates) {
    const value = toDisplayString(candidate);
    if (value) return value;
  }
  return '';
}

export function resolveDepositValue(application?: any, ctx?: AgreementPropertyContext): string {
  const fromApp = application?.securityDeposit;
  if (fromApp != null && fromApp !== '') return toDisplayString(fromApp);

  const { property, listing, propertyListing } = ctx || {};
  const candidates = [
    listing?.securityDeposit,
    propertyListing?.securityDeposit,
    property?.securityDeposit,
    property?.initialDeposit,
  ];

  for (const candidate of candidates) {
    const value = toDisplayString(candidate);
    if (value) return value;
  }
  return '';
}

/** UK securityDeposit and NG initialDeposit both map to the same stored deposit field. */
export function resolveInitialDepositValue(application?: any, ctx?: AgreementPropertyContext): string {
  const deposit = resolveDepositValue(application, ctx);
  if (deposit) return deposit;

  const { property } = ctx || {};
  return toDisplayString(property?.initialDeposit);
}

export interface GuarantorTagFields {
  guarantorName: string;
  guarantorEmail: string;
  guarantorPhone: string;
  guarantorAddress: string;
  guarantorRelationship: string;
  guarantorIncome: string;
  guarantorEmployer: string;
  guarantorIdentificationType: string;
  guarantorIdentificationNo: string;
}

/** Merge applicant guarantor step + guarantor reference form (GuarantorAgreement). */
export function resolveGuarantorFields(application?: any): GuarantorTagFields {
  const info = application?.guarantorInformation;
  const agreement = application?.guarantorAgreement;

  const agreementName = [agreement?.firstName, agreement?.middleName, agreement?.lastName]
    .filter(Boolean)
    .join(' ')
    .trim();

  return {
    guarantorName: info?.fullName || agreementName || '',
    guarantorEmail: info?.email || agreement?.emailAddress || '',
    guarantorPhone: info?.phoneNumber || agreement?.contactNumber || '',
    guarantorAddress: info?.address || '',
    guarantorRelationship: info?.relationship || '',
    guarantorIncome: info?.monthlyIncome || '',
    guarantorEmployer: info?.employerName || '',
    guarantorIdentificationType: info?.identificationType || '',
    guarantorIdentificationNo: info?.identificationNo || '',
  };
}
