/**
 * Validates propertyPmsFormConfig markers in the BE copy only.
 * FE parity: run `npm run validate:pms-config` in AsherLandlordFE.
 *
 * Run: cd AsherBE && npm run validate:pms-config
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const bePath = resolve(__dirname, '../src/utils/propertyPmsFormConfig.ts');
const beSource = readFileSync(bePath, 'utf8');

const markers = [
  'UK_RESIDENTIAL_CERTS',
  'UK_COMMERCIAL_CERTS',
  'NG_RESIDENTIAL_CERTS',
  'NG_COMMERCIAL_CERTS',
  'getPropertyPmsFormConfig',
  'GAS_SAFETY',
  'EICR',
  'EPC',
  'LEAD_PAINT_DISCLOSURE',
];

let ok = true;

for (const marker of markers) {
  if (!beSource.includes(marker)) {
    console.error(`❌ Missing "${marker}" in BE propertyPmsFormConfig.ts`);
    ok = false;
  } else {
    console.log(`✅ ${marker}`);
  }
}

if (!ok) {
  process.exit(1);
}

console.log('\nBE PMS config marker check passed.');
console.log('Tip: also run `npm run validate:pms-config` in AsherLandlordFE for FE parity.');
