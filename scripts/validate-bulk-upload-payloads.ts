/**
 * Validates representative bulk-upload API payloads against BulkPropertyUploadSchema.
 *
 * BE owns Joi validation only. CSV → payload mapping is tested in AsherLandlordFE
 * (see src/services/properties/bulkUpload/bulkUpload.flow.test.ts).
 *
 * Run: cd AsherBE && npm run validate:bulk-upload
 */
import { readFileSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { BulkPropertyUploadSchema } from '../src/validations/schemas/properties.schema';

const fixturesDir = resolve(__dirname, 'fixtures/bulk-upload');

const fixtureFiles = readdirSync(fixturesDir)
  .filter((name) => name.endsWith('.json'))
  .sort();

let ok = 0;

for (const file of fixtureFiles) {
  const label = file.replace(/\.json$/, '').replace(/-/g, ' ');
  const raw = readFileSync(resolve(fixturesDir, file), 'utf8');
  let payload: unknown;

  try {
    payload = JSON.parse(raw);
  } catch {
    console.error(`\n❌ ${label} — invalid JSON in fixture`);
    continue;
  }

  const { error } = BulkPropertyUploadSchema.validate(payload, {
    abortEarly: false,
  });

  if (error) {
    console.error(`\n❌ ${label}`);
    error.details.forEach((d) => console.error(`  - ${d.message}`));
    continue;
  }

  const hasOps = Array.isArray(payload)
    && payload.some(
      (row) =>
        row &&
        typeof row === 'object' &&
        ('operationalProfileJson' in row || 'operationalProfile' in row)
    );

  console.log(`✅ ${label}${hasOps ? ' (operational profile present)' : ''}`);
  ok += 1;
}

console.log(`\n${ok}/${fixtureFiles.length} fixture payloads passed Joi validation`);

if (ok !== fixtureFiles.length) {
  process.exit(1);
}
