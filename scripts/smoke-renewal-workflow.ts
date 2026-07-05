/**
 * Smoke test: backend renewal workflow phase resolution + blocking rules.
 * Run: npx tsx scripts/smoke-renewal-workflow.ts
 */
import {
  isRenewalWorkflowBlocking,
  resolveRenewalWorkflowPhase,
  type RenewalAgreementState,
} from '../src/services/renewalWorkflow.service';

let passed = 0;
let failed = 0;

function assert(condition: boolean, label: string) {
  if (condition) {
    passed += 1;
    console.log(`  ✓ ${label}`);
  } else {
    failed += 1;
    console.error(`  ✗ ${label}`);
  }
}

function agreement(partial: Partial<RenewalAgreementState> & Pick<RenewalAgreementState, 'agreementDocumentId' | 'applicationId'>): RenewalAgreementState {
  return {
    signedByTenantAt: null,
    signedByLandlordAt: null,
    renewalFinalized: false,
    ...partial,
  };
}

console.log('\n=== Backend renewal workflow smoke ===\n');

console.log('Phase resolution');
assert(resolveRenewalWorkflowPhase('PENDING', null) === 'negotiating', 'PENDING → negotiating');
assert(resolveRenewalWorkflowPhase('COUNTER_OFFER', null) === 'negotiating', 'COUNTER_OFFER → negotiating');
assert(resolveRenewalWorkflowPhase('ACCEPTED', null) === 'send_agreement', 'ACCEPTED no agreement → send_agreement');
assert(
  resolveRenewalWorkflowPhase('ACCEPTED', agreement({ agreementDocumentId: 'a1', applicationId: 'app1' })) ===
    'awaiting_tenant_sign',
  'ACCEPTED + agreement unsigned → awaiting_tenant_sign'
);
assert(
  resolveRenewalWorkflowPhase(
    'ACCEPTED',
    agreement({
      agreementDocumentId: 'a1',
      applicationId: 'app1',
      signedByTenantAt: new Date(),
    })
  ) === 'counter_sign',
  'Tenant signed → counter_sign'
);
assert(
  resolveRenewalWorkflowPhase(
    'ACCEPTED',
    agreement({
      agreementDocumentId: 'a1',
      applicationId: 'app1',
      signedByTenantAt: new Date(),
      signedByLandlordAt: new Date(),
    })
  ) === 'completed',
  'Both signed → completed'
);

console.log('\nBlocking rules (cannot start new proposal)');
assert(isRenewalWorkflowBlocking('PENDING', 'negotiating'), 'PENDING blocks');
assert(isRenewalWorkflowBlocking('ACCEPTED', 'send_agreement'), 'ACCEPTED send_agreement blocks');
assert(isRenewalWorkflowBlocking('ACCEPTED', 'awaiting_tenant_sign'), 'ACCEPTED awaiting_tenant_sign blocks');
assert(isRenewalWorkflowBlocking('ACCEPTED', 'counter_sign'), 'ACCEPTED counter_sign blocks');
assert(!isRenewalWorkflowBlocking('ACCEPTED', 'completed'), 'ACCEPTED completed does not block');
assert(!isRenewalWorkflowBlocking('REJECTED', 'rejected'), 'REJECTED does not block');

console.log('\nAccept must NOT imply completed (regression)');
assert(
  resolveRenewalWorkflowPhase('ACCEPTED', null) !== 'completed',
  'Accept alone is never completed'
);
assert(
  resolveRenewalWorkflowPhase('ACCEPTED', null) !== 'awaiting_tenant_sign',
  'Accept alone is not awaiting_tenant_sign until agreement sent'
);

console.log(`\nBackend smoke: ${passed} passed, ${failed} failed\n`);
process.exit(failed > 0 ? 1 : 0);
