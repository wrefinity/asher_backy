/**
 * Validates a JSON file (array of tenant payloads) against tenantArraySchema.
 * Used by FE E2E export — no cross-repo TypeScript imports.
 *
 * Run: cd AsherBE && npx tsx scripts/validate-tenant-bulk-upload-json.ts /path/to/payloads.json
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { tenantArraySchema } from '../src/landlord/validations/schema/tenancy.schema';

const inputPath = process.argv[2];
if (!inputPath) {
  console.error('Usage: tsx scripts/validate-tenant-bulk-upload-json.ts <payloads.json>');
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

const { error } = tenantArraySchema.validate(payload, { abortEarly: false });

if (error) {
  console.error(`\n❌ tenantArraySchema validation failed (${absolute})`);
  error.details.forEach((d) => console.error(`  - ${d.message}`));
  process.exit(1);
}

const count = Array.isArray(payload) ? payload.length : 0;
console.log(`✅ ${count} tenant payload(s) passed tenantArraySchema (${absolute})`);
