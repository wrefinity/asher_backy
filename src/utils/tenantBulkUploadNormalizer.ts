/**
 * Auto-corrects tenant bulk upload values that are semantically correct but
 * in the wrong format. Unfixable values are left unchanged for Joi / UI validation.
 */

export type TenantBulkNormalizeFix = {
  field: string;
  from: string;
  to: string;
};

const DATE_FIELDS = new Set([
  'dateOfFirstRent',
  'leaseStartDate',
  'leaseEndDate',
  'dateOfBirth',
  'expiryDate',
  'employmentStartDate',
]);

const YES_NO_FIELDS = new Set([
  'invited',
  'havePet',
  'youSmoke',
  'requireParking',
  'haveOutstandingDebts',
]);

const ZIP_FIELDS = new Set(['zip', 'employmentZipCode']);

const GENDER_MAP: Record<string, string> = {
  male: 'Male',
  m: 'Male',
  female: 'Female',
  f: 'Female',
  other: 'Other',
  o: 'Other',
};

const MARITAL_MAP: Record<string, string> = {
  single: 'Single',
  married: 'Married',
  divorced: 'Divorced',
  widowed: 'Widowed',
};

const TITLE_MAP: Record<string, string> = {
  mr: 'Mr',
  mrs: 'Mrs',
  ms: 'Ms',
  dr: 'Dr',
  miss: 'Ms',
};

const trimStr = (value: unknown): string =>
  value === null || value === undefined ? '' : String(value).trim();

const recordFix = (
  fixes: TenantBulkNormalizeFix[],
  field: string,
  from: string,
  to: string
) => {
  if (from !== to) {
    fixes.push({ field, from, to });
  }
};

export const normalizeTenantBulkDate = (value: unknown): string | null => {
  const trimmed = trimStr(value);
  if (!trimmed) return null;

  const isoMatch = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (isoMatch) {
    return `${isoMatch[1]}-${isoMatch[2]}-${isoMatch[3]}`;
  }

  const dmy = trimmed.match(/^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{4})$/);
  if (dmy) {
    const day = dmy[1].padStart(2, '0');
    const month = dmy[2].padStart(2, '0');
    return `${dmy[3]}-${month}-${day}`;
  }

  const parsed = new Date(trimmed);
  if (!Number.isNaN(parsed.getTime())) {
    return parsed.toISOString().split('T')[0];
  }

  return null;
};

export const normalizeTenantBulkYesNo = (value: unknown): string | null => {
  const upper = trimStr(value).toUpperCase();
  if (!upper) return null;
  if (['YES', 'Y', 'TRUE', '1'].includes(upper)) return 'YES';
  if (['NO', 'N', 'FALSE', '0'].includes(upper)) return 'NO';
  return null;
};

export const normalizeTenantBulkZip = (value: unknown): string | null => {
  const digits = trimStr(value).replace(/\D/g, '');
  return digits.length > 0 ? digits : null;
};

export const normalizeTenantBulkBoolean = (value: unknown): boolean | null => {
  if (typeof value === 'boolean') return value;
  const lower = trimStr(value).toLowerCase();
  if (!lower) return null;
  if (['true', 'yes', '1', 'y'].includes(lower)) return true;
  if (['false', 'no', '0', 'n'].includes(lower)) return false;
  return null;
};

export const normalizeTenantBulkRentStatus = (value: unknown): number | null => {
  const trimmed = trimStr(value);
  if (!trimmed) return null;
  if (trimmed === '0' || trimmed === '1') return Number(trimmed);
  const lower = trimmed.toLowerCase();
  if (['inactive', 'false', 'no'].includes(lower)) return 0;
  if (['active', 'true', 'yes'].includes(lower)) return 1;
  return null;
};

const normalizeEnum = (
  value: unknown,
  map: Record<string, string>
): string | null => {
  const key = trimStr(value).toLowerCase();
  if (!key) return null;
  if (Object.values(map).includes(trimStr(value))) {
    return Object.values(map).find(v => v === trimStr(value)) ?? null;
  }
  return map[key] ?? null;
};

const setIfChanged = (
  row: Record<string, unknown>,
  field: string,
  next: unknown,
  fixes: TenantBulkNormalizeFix[]
) => {
  const from = trimStr(row[field]);
  const to = trimStr(next);
  if (!to && !from) return;
  recordFix(fixes, field, from, to);
  row[field] = next;
};

export const normalizeTenantBulkRow = (
  input: Record<string, unknown>
): { row: Record<string, unknown>; fixes: TenantBulkNormalizeFix[] } => {
  const row = { ...input };
  const fixes: TenantBulkNormalizeFix[] = [];

  for (const key of Object.keys(row)) {
    if (typeof row[key] === 'string') {
      const trimmed = trimStr(row[key]);
      if (trimmed !== row[key]) {
        recordFix(fixes, key, String(row[key]), trimmed);
        row[key] = trimmed;
      }
    }
  }

  if (typeof row.email === 'string' && row.email) {
    const lowered = row.email.toString().trim().toLowerCase();
    setIfChanged(row, 'email', lowered, fixes);
  }

  for (const field of DATE_FIELDS) {
    if (row[field] == null || row[field] === '') continue;
    const normalized = normalizeTenantBulkDate(row[field]);
    if (normalized) {
      setIfChanged(row, field, normalized, fixes);
    }
  }

  for (const field of ZIP_FIELDS) {
    if (row[field] == null || row[field] === '') continue;
    const normalized = normalizeTenantBulkZip(row[field]);
    if (normalized) {
      setIfChanged(row, field, normalized, fixes);
    }
  }

  for (const field of YES_NO_FIELDS) {
    if (row[field] == null || row[field] === '') continue;
    const normalized = normalizeTenantBulkYesNo(row[field]);
    if (normalized) {
      setIfChanged(row, field, normalized, fixes);
    }
  }

  if (row.gender != null && row.gender !== '') {
    const normalized =
      normalizeEnum(row.gender, GENDER_MAP) ??
      (Object.values(GENDER_MAP).includes(trimStr(row.gender))
        ? trimStr(row.gender)
        : null);
    if (normalized) setIfChanged(row, 'gender', normalized, fixes);
  }

  if (row.maritalStatus != null && row.maritalStatus !== '') {
    const normalized =
      normalizeEnum(row.maritalStatus, MARITAL_MAP) ??
      (Object.values(MARITAL_MAP).includes(trimStr(row.maritalStatus))
        ? trimStr(row.maritalStatus)
        : null);
    if (normalized) setIfChanged(row, 'maritalStatus', normalized, fixes);
  }

  if (row.title != null && row.title !== '') {
    const normalized =
      normalizeEnum(row.title, TITLE_MAP) ??
      (Object.values(TITLE_MAP).includes(trimStr(row.title))
        ? trimStr(row.title)
        : null);
    if (normalized) setIfChanged(row, 'title', normalized, fixes);
  }

  if (row.isCurrentLease != null && row.isCurrentLease !== '') {
    const normalized = normalizeTenantBulkBoolean(row.isCurrentLease);
    if (normalized !== null) {
      setIfChanged(row, 'isCurrentLease', normalized, fixes);
    }
  }

  if (row.rentstatus != null && row.rentstatus !== '') {
    const normalized = normalizeTenantBulkRentStatus(row.rentstatus);
    if (normalized !== null) {
      setIfChanged(row, 'rentstatus', normalized, fixes);
    }
  }

  if (row.nextOfKin && typeof row.nextOfKin === 'object') {
    const nok = { ...(row.nextOfKin as Record<string, unknown>) };
    const nokFixes: TenantBulkNormalizeFix[] = [];
    if (nok.email) {
      setIfChanged(nok, 'email', trimStr(nok.email).toLowerCase(), nokFixes);
    }
    for (const key of ['firstName', 'lastName', 'middleName', 'relationship', 'phoneNumber']) {
      if (typeof nok[key] === 'string') {
        const trimmed = trimStr(nok[key]);
        setIfChanged(nok, key, trimmed, nokFixes);
      }
    }
    nokFixes.forEach(fix => fixes.push({ ...fix, field: `nextOfKin.${fix.field}` }));
    row.nextOfKin = nok;
  }

  return { row, fixes };
};

export const normalizeTenantBulkPayload = (
  rows: Record<string, unknown>[]
): { rows: Record<string, unknown>[]; fixes: TenantBulkNormalizeFix[] } => {
  const allFixes: TenantBulkNormalizeFix[] = [];
  const normalizedRows = rows.map((row, index) => {
    const { row: normalized, fixes } = normalizeTenantBulkRow(row);
    fixes.forEach(fix =>
      allFixes.push({
        ...fix,
        field: `row ${index + 1} · ${fix.field}`,
      })
    );
    return normalized;
  });
  return { rows: normalizedRows, fixes: allFixes };
};

export const formatJoiBulkUploadErrors = (
  details: Array<{ message: string; path: (string | number)[] }>
): string[] =>
  details.map(detail => {
    const path = detail.path.filter(p => p !== 0 && p !== '0').join('.');
    const message = detail.message.replace(/"/g, "'");
    return path ? `Row field "${path}": ${message}` : message;
  });
