/**
 * Validates a JSON file (array of property payloads) against BulkPropertyUploadSchema.
 * Used by FE E2E export — no cross-repo TypeScript imports.
 *
 * Run: cd AsherBE && npx tsx scripts/validate-bulk-upload-json.ts /path/to/payloads.json
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { BulkPropertyUploadSchema } from '../src/validations/schemas/properties.schema';

const inputPath = process.argv[2];
if (!inputPath) {
  console.error('Usage: tsx scripts/validate-bulk-upload-json.ts <payloads.json>');
  process.exit(1);
}

const absolute = resolve(process.cwd(), inputPath);
let payload: unknown;

try {
  payload = JSON.parse(readFileSync(absolute, 'utf8'));
} catch (error) {
  console.error(`❌ Could not read or parse ${absolute}`);
  console.error(error);
  process.exit(1);
}

const { error } = BulkPropertyUploadSchema.validate(payload, {
  abortEarly: false,
});

if (error) {
  console.error(`\n❌ BulkPropertyUploadSchema validation failed (${absolute})`);
  error.details.forEach((d) => console.error(`  - ${d.message}`));
  process.exit(1);
}

const count = Array.isArray(payload) ? payload.length : 0;
console.log(`✅ ${count} payload(s) passed BulkPropertyUploadSchema (${absolute})`);
