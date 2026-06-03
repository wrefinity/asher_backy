/**
 * Validates FE bulk-upload payloads against BulkPropertyUploadSchema.
 * Run: cd AsherBE && npx tsx scripts/validate-bulk-upload-payloads.ts
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import Papa from 'papaparse';
import { BulkPropertyUploadSchema } from '../src/validations/schemas/properties.schema';
import { transformBulkPropertyData } from '../../AsherLandlordFE/src/services/properties/bulkUpload/transformBulkPropertyData';
import { mapCsvRowForBulkUpload } from '../../AsherLandlordFE/src/services/properties/bulkUpload/bulkUpload.flow.helpers';

const feTemplates = resolve(__dirname, '../../AsherLandlordFE/public/templates/properties');

const runCase = (
  label: string,
  file: string,
  type: string,
  subtype: string
) => {
  const raw = readFileSync(resolve(feTemplates, file), 'utf8');
  const parsed = Papa.parse<Record<string, string>>(raw, {
    header: true,
    skipEmptyLines: true,
  });
  const headers = parsed.meta.fields ?? [];
  const mapped = mapCsvRowForBulkUpload(
    parsed.data[0],
    headers,
    type,
    subtype
  );
  const payload = transformBulkPropertyData(mapped, type, subtype);
  const { error } = BulkPropertyUploadSchema.validate([payload], {
    abortEarly: false,
  });
  if (error) {
    console.error(`\n❌ ${label}`);
    error.details.forEach(d => console.error(`  - ${d.message}`));
    return false;
  }
  console.log(`✅ ${label}`);
  return true;
};

const cases: Array<[string, string, string, string]> = [
  ['Residential HOUSE', 'residential_house_template.csv', 'RESIDENTIAL', 'HOUSE'],
  ['Residential FLAT', 'residential_house_template.csv', 'RESIDENTIAL', 'FLAT'],
  ['Commercial OFFICE', 'commercial_office_template.csv', 'COMMERCIAL', 'OFFICE'],
  ['Commercial RETAIL', 'commercial_template.csv', 'COMMERCIAL', 'RETAIL'],
  ['Commercial INDUSTRIAL', 'commercial_template.csv', 'COMMERCIAL', 'INDUSTRIAL'],
  ['Commercial WAREHOUSE', 'commercial_template.csv', 'COMMERCIAL', 'WAREHOUSE'],
];

let ok = 0;
for (const c of cases) {
  if (runCase(...c)) ok += 1;
}

console.log(`\n${ok}/${cases.length} payloads passed Joi validation`);
process.exit(ok === cases.length ? 0 : 1);
