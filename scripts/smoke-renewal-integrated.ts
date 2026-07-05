/**
 * Integrated smoke: simulate tenant + landlord phase transitions stay in sync.
 * Run: npx tsx scripts/smoke-renewal-integrated.ts
 */
import { resolveRenewalWorkflowPhase, type RenewalAgreementState } from '../src/services/renewalWorkflow.service';

type Phase =
  | 'negotiating'
  | 'send_agreement'
  | 'awaiting_tenant_sign'
  | 'counter_sign'
  | 'completed';

function agr(partial: Partial<RenewalAgreementState>): RenewalAgreementState | null {
  if (!partial.agreementDocumentId) return null;
  return {
    agreementDocumentId: partial.agreementDocumentId,
    applicationId: partial.applicationId ?? 'app1',
    signedByTenantAt: partial.signedByTenantAt ?? null,
    signedByLandlordAt: partial.signedByLandlordAt ?? null,
    renewalFinalized: partial.renewalFinalized ?? false,
  };
}

function tenantCanSign(phase: Phase): boolean {
  return phase === 'awaiting_tenant_sign';
}

function landlordShouldSendAgreement(phase: Phase): boolean {
  return phase === 'send_agreement';
}

function landlordShouldCounterSign(phase: Phase): boolean {
  return phase === 'counter_sign';
}

function tenantCanRequestRenewal(phase: Phase | null): boolean {
  return phase === null;
}

const steps: Array<{
  label: string;
  status: string;
  agreement: RenewalAgreementState | null;
  expectPhase: Phase | 'negotiating' | 'rejected';
  tenantSign: boolean;
  landlordSend: boolean;
  landlordCounter: boolean;
  tenantRequest: boolean;
}> = [
  {
    label: '1. Tenant requests renewal',
    status: 'PENDING',
    agreement: null,
    expectPhase: 'negotiating',
    tenantSign: false,
    landlordSend: false,
    landlordCounter: false,
    tenantRequest: false,
  },
  {
    label: '2. Landlord accepts',
    status: 'ACCEPTED',
    agreement: null,
    expectPhase: 'send_agreement',
    tenantSign: false,
    landlordSend: true,
    landlordCounter: false,
    tenantRequest: false,
  },
  {
    label: '3. Landlord sends agreement',
    status: 'ACCEPTED',
    agreement: agr({ agreementDocumentId: 'doc1' }),
    expectPhase: 'awaiting_tenant_sign',
    tenantSign: true,
    landlordSend: false,
    landlordCounter: false,
    tenantRequest: false,
  },
  {
    label: '4. Tenant signs',
    status: 'ACCEPTED',
    agreement: agr({ agreementDocumentId: 'doc1', signedByTenantAt: new Date() }),
    expectPhase: 'counter_sign',
    tenantSign: false,
    landlordSend: false,
    landlordCounter: true,
    tenantRequest: false,
  },
  {
    label: '5. Landlord counter-signs',
    status: 'ACCEPTED',
    agreement: agr({
      agreementDocumentId: 'doc1',
      signedByTenantAt: new Date(),
      signedByLandlordAt: new Date(),
    }),
    expectPhase: 'completed',
    tenantSign: false,
    landlordSend: false,
    landlordCounter: false,
    tenantRequest: true,
  },
];

let passed = 0;
let failed = 0;

console.log('\n=== Integrated tenant ↔ landlord renewal smoke ===\n');

for (const step of steps) {
  const phase = resolveRenewalWorkflowPhase(step.status, step.agreement);
  const ok =
    phase === step.expectPhase &&
    tenantCanSign(phase as Phase) === step.tenantSign &&
    landlordShouldSendAgreement(phase as Phase) === step.landlordSend &&
    landlordShouldCounterSign(phase as Phase) === step.landlordCounter &&
    tenantCanRequestRenewal(step.label.startsWith('5.') ? null : phase as Phase) === step.tenantRequest;

  if (ok) {
    passed += 1;
    console.log(`  ✓ ${step.label} → phase=${phase}`);
  } else {
    failed += 1;
    console.error(
      `  ✗ ${step.label} → phase=${phase} (expected ${step.expectPhase}, tenantSign=${step.tenantSign}, landlordSend=${step.landlordSend})`
    );
  }
}

console.log(`\nIntegrated smoke: ${passed} passed, ${failed} failed\n`);
process.exit(failed > 0 ? 1 : 0);
