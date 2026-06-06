# Tenant Screening — Current Logic & Enterprise Specification

> **Purpose:** Document what Asher screening does today, what the disabled/planned code intends to check, and the recommended enterprise-grade rules for trustworthy tenant screening.
>
> **Last updated:** 2026-06-06  
> **Repos:** `AsherBE` (backend), `AsherLandlordFE` (landlord UI)

---

## Table of contents

1. [Overview](#1-overview)
2. [The six screening checks (UI)](#2-the-six-screening-checks-ui)
3. [End-to-end flow today](#3-end-to-end-flow-today)
4. [Current production logic (what actually runs)](#4-current-production-logic-what-actually-runs)
5. [Frontend rules & gating](#5-frontend-rules--gating)
6. [Disabled logic in `screener.ts`](#6-disabled-logic-in-screenerts)
7. [External reference validation (outside screening button)](#7-external-reference-validation-outside-screening-button)
8. [Planned document verification (commented out)](#8-planned-document-verification-commented-out)
9. [Known issues in current/planned code](#9-known-issues-in-currentplanned-code)
10. [Enterprise-grade screening specification (recommended)](#10-enterprise-grade-screening-specification-recommended)
11. [Decision matrix: pass, fail, pending, skip](#11-decision-matrix-pass-fail-pending-skip)
12. [Implementation checklist](#12-implementation-checklist)

---

## 1. Overview

Screening in Asher is triggered by the landlord clicking **Run Screening** on the tenant application review page. The UI shows six checklist items stored as `YesNo?` fields on the `application` record:

| DB field | UI label |
|----------|----------|
| `creditCheckStatus` | Credit and background check |
| `employmentVerificationStatus` | Employment verification |
| `incomeVerificationStatus` | Income verification |
| `guarantorVerificationStatus` | Guarantor verification |
| `refereeVerificationStatus` | Referee verification |
| `landlordVerificationStatus` | Landlord verification |

**API endpoint:** `PATCH /api/landlord/application/references/screening/:applicationId`

**Critical fact:** Today, clicking Run Screening does **not** run real checks. It bulk-sets all six fields to `YES` after confirming three reference records exist. Real comparison logic exists in `src/utils/screener.ts` but is **commented out** in the controller.

---

## 2. The six screening checks (UI)

### Data model

```prisma
// prisma/schema/application.prisma
employmentVerificationStatus YesNo?
incomeVerificationStatus     YesNo?
creditCheckStatus            YesNo?
landlordVerificationStatus   YesNo?
guarantorVerificationStatus  YesNo?
refereeVerificationStatus    YesNo?
```

`YesNo` values: `YES` | `NO` | `null` (not yet evaluated).

### UI behaviour (`CheckList.tsx`)

- Checkbox **checked** → status is `YES`
- Checkbox **unchecked** → status is `null` or `NO`
- Badge **"In progress"** (orange) → at least one field is not `YES`
- Badge **"Passed"** (green) → all six fields are `YES`
- Checkboxes are **read-only** — landlord cannot tick them manually

---

## 3. End-to-end flow today

```
Landlord FE                          Asher BE                           Database
───────────                          ────────                           ────────
[References complete]                —                                  referenceForm,
[Run Screening visible]                                                 guarantorAgreement,
                                                                        employeeReference exist

Click "Run Screening"
  → Progress modal (cosmetic)          PATCH .../screening/:id
                                       ├─ Validate applicationId
                                       ├─ Load application
                                       ├─ Require 3 reference records
                                       └─ Set ALL 6 statuses → YES      application.*VerificationStatus

Invalidate React Query               200 { screener }                   —
Refetch application                  —                                  —
CheckList → all ticked               —                                  —
Approve / Reject buttons appear      —                                  —
```

There is **no polling**, **no async job**, and **no per-check failure reporting** in production.

---

## 4. Current production logic (what actually runs)

**File:** `src/landlord/controllers/applicant.controller.ts` → `updateApplicationVerificationStatus`

### Pre-conditions (gate before screening)

| # | Rule | On failure |
|---|------|------------|
| 1 | `applicationId` present in URL | `400` — Application ID is required |
| 2 | Application exists | `404` — Application not found |
| 3 | `application.referenceForm` is not null | `400` — reference form not completed |
| 4 | `application.guarantorAgreement` is not null | `400` — guarantor agreement missing |
| 5 | `application.employeeReference` is not null | `400` — employee reference missing |

**What is NOT checked today:**

- Reference form `status` (e.g. `COMPLETED`, `SUBMITTED`)
- Nomination acceptance (`nominationStatus === ACCEPTED`)
- Guarantor signature / employer declaration
- Any cross-field data matching
- Uploaded documents
- Credit bureau or background provider
- Referee records (`application.referee`)
- Income vs rent affordability

### Action on success

All six fields are set to `YesNo.YES` in one update — **regardless of data quality**:

```typescript
await ApplicationInvitesService.updateVerificationStatus(applicationId, {
  employmentVerificationStatus: YesNo.YES,
  incomeVerificationStatus: YesNo.YES,
  creditCheckStatus: YesNo.YES,
  landlordVerificationStatus: YesNo.YES,
  guarantorVerificationStatus: YesNo.YES,
  refereeVerificationStatus: YesNo.YES,
});
```

### What each check actually validates in production

| Check | Validated? | What happens |
|-------|------------|--------------|
| Credit and background check | **No** | Auto-marked `YES` |
| Employment verification | **No** | Auto-marked `YES` |
| Income verification | **No** | Auto-marked `YES` |
| Guarantor verification | **No** | Auto-marked `YES` |
| Referee verification | **No** | Auto-marked `YES` |
| Landlord verification | **No** | Auto-marked `YES` |

**Trust level today:** Low. Screening is a workflow unlock step, not verification.

---

## 5. Frontend rules & gating

**Files:** `Applications.tsx`, `ApplicationAction.tsx`, `ApplicationButtonActions.tsx`

### When "Run Screening" button shows

```typescript
referencesFilled && !screenPassed
```

**`referencesFilled`** — all three reference objects are non-null:

- `employeeReference`
- `guarantorAgreement`
- `referenceForm`

**`screenPassed`** — all six verification statuses equal `'YES'`.

### When Approve / Reject buttons show

```typescript
screenPassed && !hideApproveAndReject
```

Where `hideApproveAndReject` is true if `statuesCompleted.length > 0` (application has already progressed past initial decision).

### Progress modal

The progress bar increments on a **300ms timer to 90%** — it is **not** tied to backend progress or individual checks.

### After successful screening

React Query invalidates `['application', applicationID]` and refetches. No structured failure payload is consumed by the UI.

---

## 6. Disabled logic in `screener.ts`

**File:** `src/utils/screener.ts`  
**Status:** Implemented but **not called** (commented out in controller).

These three functions were intended to run before bulk-updating statuses. Each returns a single boolean (`true` = pass, `false` = fail). **All sub-checks must pass** (AND logic).

---

### 6.1 Guarantor verification (`guarantorScreener`)

**Maps to:** `guarantorVerificationStatus`

**Compares:**

| Source A — tenant application | Source B — guarantor reference form |
|-------------------------------|-------------------------------------|
| `guarantorInformation.fullName` | `guarantorAgreement.firstName`, `middleName`, `lastName` |
| `guarantorInformation.dateOfBirth` | `guarantorAgreement.dateOfBirth` |
| `guarantorInformation.nationalInsuranceNumber` | `guarantorAgreement.nationalInsuranceNumber` |

**Rules:**

1. **Name match** — `fullName` (lowercased, trimmed) must exactly equal one of:
   - `{firstName} {lastName}`
   - `{firstName} {middleName} {lastName}`
   - `{firstName} {middleName}`
   - `{firstName}` alone
   - `{lastName}` alone

2. **DOB match** — both dates normalized to `YYYY-MM-DD` (ISO date part); both must exist and match.

3. **NIN match** — both NIN values trimmed, uppercased; both must exist and match.

**Pass:** `isNameMatch && isDobMatch && isNinMatch`

**Not checked (gaps):**

- `guarantorInformation.email` vs `guarantorAgreement.emailAddress`
- `guarantorInformation.phoneNumber` vs `guarantorAgreement.contactNumber`
- `signedByGuarantor`, `guarantorSignature`, `guarantorSignedAt`
- `nominationStatus === ACCEPTED`
- Guarantor income / affordability
- Uploaded guarantor documents
- `guarantorEmployment` JSON on agreement

---

### 6.2 Employment verification (`employmentScreener`)

**Maps to:** `employmentVerificationStatus`

**Compares:**

| Source A — `employeeReference` (employer form) | Source B — `employmentInfo` (tenant application) |
|------------------------------------------------|--------------------------------------------------|
| `employeeName` | `employerCompany` ⚠️ |
| `jobTitle` | `positionTitle` |
| `companyName` | `employerCompany` |
| `emailAddress` | `employerEmail` |
| `employmentStartDate` | `startDate` |

**Rules:**

1. Both records must exist; otherwise **fail immediately**.
2. All string comparisons: trim + lowercase.
3. Date comparison: `YYYY-MM-DD` equality on start dates.
4. **Pass:** all five booleans must be true.

**Likely bug:** `employeeName` is compared to `employerCompany`, not the applicant's name. This would almost always fail if enabled as written.

**Not checked (gaps):**

- Applicant name on employee reference vs `personalDetails`
- `nominationStatus === ACCEPTED` on employment record
- Employer performance scores (`workPerformance`, `wouldReemploy`, etc.)
- `declarationConfirmed`, signature, `date` on reference form
- Self-employed / freelance paths (`businessName`, benefits income)
- Employment end date consistency

---

### 6.3 Landlord verification (`landlordScreener`)

**Maps to:** `landlordVerificationStatus`

**Required records:**

- `residentialInfo` (with `prevAddresses`)
- `referenceForm` (landlord reference)
- `referenceForm.tenancyReferenceHistory`
- `referenceForm.externalLandlord`
- `referenceForm.conduct`

**Compares:**

| Check | Source A | Source B |
|-------|----------|----------|
| Landlord name | `residentialInfo.landlordOrAgencyName` | `externalLandlord.name` |
| Landlord phone | `residentialInfo.landlordOrAgencyPhoneNumber` | `externalLandlord.contactNumber` |
| Landlord email | `residentialInfo.landlordOrAgencyEmail` | `externalLandlord.emailAddress` |
| Tenant name | `tenancyReferenceHistory.tenantName` | `application.user.profile.firstName` ⚠️ |
| Address | `tenancyReferenceHistory.currentAddress` | `residentialInfo.address` |
| Length of residence | `residentialInfo.lengthOfResidence` | any `prevAddresses[].lengthOfResidence` |
| Reason for leaving | `residentialInfo.reasonForLeaving` | `tenancyReferenceHistory.reasonForLeaving` |
| Rent payment | — | `conduct.rentOnTime === true` |

**Pass:** all eight conditions must be true.

**Likely bugs / gaps:**

- Tenant name compared to **first name only**, not full name from `personalDetails`
- `lengthOfResidenceMatch` searches `prevAddresses` but not current `residentialInfo.lengthOfResidence` directly
- Phone/email matching is exact string — no normalization for `+44` vs `0` formats
- Does not check `referenceForm.status`, signature, or nomination acceptance
- Does not evaluate `rentArrears`, `complaints`, `rentAgain`, property condition
- Address matching is exact string — no fuzzy/normalized address comparison

---

### 6.4 Checks with no `screener.ts` implementation

| Check | Status in codebase |
|-------|-------------------|
| Credit and background check | No screener; no active third-party integration |
| Income verification | No screener; planned via documents (commented out) |
| Referee verification | No screener; `referees` model populated separately |

---

## 7. External reference validation (outside screening button)

These validations happen **before** screening, when references are nominated and submitted. They are **not** part of Run Screening today but are essential context.

### 7.1 Nomination flow (employer, guarantor, landlord)

Each nominee receives an invite and responds with `ACCEPTED` or `DECLINED`:

| Entity | Field | Values |
|--------|-------|--------|
| `EmploymentInformation` | `nominationStatus` | `PENDING` → `ACCEPTED` / `DECLINED` |
| `guarantorInformation` | `nominationStatus` | `PENDING` → `ACCEPTED` / `DECLINED` |
| `residentialInformation` | `nominationStatus` | `PENDING` → `ACCEPTED` / `DECLINED` |

**Services:** `employmentinfo.services.ts`, `guarantor.services.ts`, `externallandlord.service.ts`

**On DECLINED:**

- Nomination marked declined with timestamp
- Tenant notified (email + in-app)
- Landlord notified
- Relevant application step may be rolled back

**Screening should require:** `nominationStatus === ACCEPTED` for all three nominees before running checks.

---

### 7.2 Reference form submission validation (Joi schemas)

**File:** `src/validations/schemas/reference.schema.ts`

#### Landlord reference form

- `externalLandlord`: name, contactNumber (phone pattern), email (valid email)
- `tenancyHistory`: tenantName, currentAddress, rent amount pattern, optional dates
- `conduct`: boolean flags for rent behaviour, arrears, complaints, etc.

#### Guarantor agreement

- Identity: title, firstName, lastName, DOB, contact, email
- `signedByGuarantor: true` required
- `guarantorSignature` and `guarantorSignedAt` required
- Optional `guarantorEmployment` with employment-type-specific rules
- Documents array required on create schema

#### Employee reference

- `employeeName` required
- `emailAddress` optional email format
- Performance scores 0–5 optional
- `wouldReemploy` — if false, explanation required
- `date` required

**Note:** Joi validates **shape and format** at submission time — not cross-record consistency with the tenant application (that was meant to be `screener.ts`).

---

### 7.3 Referee data (tenant application step)

**Model:** `referees` linked via `application.refereeId`

Required fields when saved:

- `professionalReferenceName`, `personalReferenceName`
- `personalEmail`, `professionalEmail`
- `personalPhoneNumber`, `professionalPhoneNumber`
- `personalRelationship`, `professionalRelationship`

**No external confirmation workflow** exists today — tenant enters referee details; referees are not emailed to confirm.

---

## 8. Planned document verification (commented out)

**File:** `src/services/document_verification.services.ts` (fully commented)

Intended mapping of uploaded `propertyDocument.docType` to verification fields:

| Verification field | Required document type(s) |
|--------------------|---------------------------|
| `employmentVerificationStatus` | `EMPLOYMENT_LETTER` |
| `incomeVerificationStatus` | `PAY_STUB`, `TAX_RETURN`, and/or `BANK_STATEMENT` |
| `creditCheckStatus` | `CREDIT_REPORT`, `BACKGROUND_CHECK` |
| `landlordVerificationStatus` | `LANDLORD_REFERENCE` |
| `guarantorVerificationStatus` | `GUARANTOR_INCOME`, `GUARANTOR_EMPLOYMENT` |
| `refereeVerificationStatus` | `REFEREE_CONFIRMATION` |

When all required docs for a category exist → set that field to `YES`.  
When all six are `YES` → set application status to `SCREENING_COMPLETE`.

**Status:** Not active. Document enum exists in `prisma/schema/document.prisma` but service is disabled.

---

## 9. Known issues in current/planned code

| # | Issue | Impact |
|---|-------|--------|
| 1 | Production bypasses all checks | Screening provides false confidence |
| 2 | `employmentScreener` compares `employeeName` to `employerCompany` | Would fail incorrectly if enabled |
| 3 | `landlordScreener` compares tenant name to `profile.firstName` only | Misses middle/last name mismatches |
| 4 | No credit/background provider | Credit checkbox is meaningless |
| 5 | No income affordability math | Income checkbox is meaningless |
| 6 | No referee confirmation | Referee checkbox is meaningless |
| 7 | Exact string matching on names/addresses/phones | High false-negative rate |
| 8 | No audit trail per screening run | Cannot defend decisions legally |
| 9 | No `NO` state used in production | Failed checks cannot be represented |
| 10 | Nomination acceptance not enforced at screening | Declined/pending nominees could still "pass" |

---

## 10. Enterprise-grade screening specification (recommended)

This section defines **trustworthy** screening rules suitable for landlord decision-making, UK/US compliance, and audit defence.

### 10.1 Design principles

1. **Independent checks** — each of the six items is evaluated separately; one failure does not auto-fail unrelated items (unless configured).
2. **Evidence-based** — every `YES` must cite evidence (reference form field, document, provider report, or manual review).
3. **Fail closed** — missing data → `PENDING` or `NO`, never `YES`.
4. **Structured output** — return per-check `{ status, reasons[], evidence[], checkedAt }`.
5. **Audit everything** — persist `ApplicationScreeningRun` with actor, timestamp, inputs hash, and results JSON.
6. **Market-aware** — UK (Right to Rent, soft credit, NI number) vs US (FCRA, SSN last-4, state rules) from `applicationFormConfig` / property market.
7. **Human override** — landlord can override a failed check with mandatory reason (logged).
8. **Re-runnable** — re-screen only stale/failed checks after tenant updates data.

---

### 10.2 Global pre-conditions (before any check runs)

| ID | Rule | Fail action |
|----|------|-------------|
| PRE-01 | Application status is `SUBMITTED` or later (not draft) | Block — "Application incomplete" |
| PRE-02 | Landlord owns the property / invite | Block — 403 |
| PRE-03 | Tenant consent captured on declaration (screening checkbox ticked) | Block — "Consent required" |
| PRE-04 | All three reference records exist | Block — same as today |
| PRE-05 | All three nominations `nominationStatus === ACCEPTED` | Block — "Reference not accepted" |
| PRE-06 | No nomination `DECLINED` without tenant re-nomination | Block |
| PRE-07 | Application not already `APPROVED` / `DECLINED` | Block or require re-open |
| PRE-08 | Identity verification complete (if required by landlord global settings) | Block or warn |

---

### 10.3 Check 1 — Employment verification

**Goal:** Confirm the employer reference corresponds to the employment details the tenant declared, and the employer attests positively.

#### Data sources

- Tenant: `employmentInfo`, `personalDetails`
- External: `employeeReference`
- Nomination: `employmentInfo.nominationStatus`

#### Rules

| ID | Rule | Pass | Fail |
|----|------|------|------|
| EMP-01 | Nomination accepted | `ACCEPTED` | `PENDING` / `DECLINED` |
| EMP-02 | Reference form submitted (`date` present, `declarationConfirmed === true`) | Yes | No |
| EMP-03 | Applicant name match — fuzzy match `employeeReference.employeeName` against `{firstName middleName lastName}` from `personalDetails` | ≥ 85% similarity | No |
| EMP-04 | Company match — `employeeReference.companyName` ≈ `employmentInfo.employerCompany` OR `businessName` (self-employed) | Match | No |
| EMP-05 | Job title match — `employeeReference.jobTitle` ≈ `employmentInfo.positionTitle` | Match | No |
| EMP-06 | Employer email domain match — reference `emailAddress` domain matches `employmentInfo.employerEmail` domain (or exact email) | Match | No |
| EMP-07 | Start date match — within **30 days** tolerance | Match | No |
| EMP-08 | Employment still active OR end date explained | Pass | Review flag |
| EMP-09 | Positive reference — `wouldReemploy !== false` AND `workPerformance >= 3` (if scored) | Pass | Manual review |
| EMP-10 | Referee is not tenant email/phone | Pass | Fraud flag |

#### Enterprise extras

- Verify employer email is not a free provider (gmail.com) unless self-employed
- Cross-check employer phone against company registry (optional, UK: Companies House)
- Store referee identity: `refereeName`, `refereePosition`

---

### 10.4 Check 2 — Income verification

**Goal:** Tenant income supports rent + affordability policy.

#### Data sources

- `employmentInfo.monthlyOrAnualIncome`, benefits fields, `guarantorInformation.monthlyIncome`
- Uploaded docs: payslips, bank statements, tax returns
- Listing: monthly rent from property / unit / room
- Global settings: max rent-to-income ratio (recommend default **30–33%** gross)

#### Rules

| ID | Rule | Pass | Fail |
|----|------|------|------|
| INC-01 | Declared gross monthly income parsed and > 0 | Yes | No |
| INC-02 | `(monthlyRent / grossMonthlyIncome) <= maxRatio` | Pass | No |
| INC-03 | At least **2 of 3** income documents uploaded OR employer reference states income | Pass | Pending |
| INC-04 | Document income within **±15%** of declared income | Pass | Manual review |
| INC-05 | If benefits declared — benefit amounts consistent with doc evidence | Pass | Review |
| INC-06 | If guarantor required (income below threshold) — guarantor income included in combined affordability | Pass | No |

#### Enterprise extras

- Open banking verification (UK: TrueLayer / Plaid) for bank statement authenticity
- Detect duplicate/redacted payslip images
- Currency normalization via existing `currencyContext`

---

### 10.5 Check 3 — Credit and background check

**Goal:** Assess creditworthiness and serious adverse history via regulated provider.

#### Data sources

- Third-party: Experian / Equifax / TransUnion / Checkr (market-specific)
- Consent timestamp + permissible purpose logged
- Optional manual upload: `CREDIT_REPORT`, `BACKGROUND_CHECK` documents

#### Rules

| ID | Rule | Pass | Fail |
|----|------|------|------|
| CR-01 | Written consent on file with timestamp | Yes | Block |
| CR-02 | Provider report retrieved successfully | Yes | Pending (async) |
| CR-03 | Credit score ≥ landlord-configured minimum (e.g. 600 US / band UK) | Pass | Fail |
| CR-04 | No undisclosed bankruptcies / CCJs / evictions in lookback (e.g. 7 years US, 6 years UK) | Pass | Fail |
| CR-05 | Identity on report matches applicant (`personalDetails` name + DOB + address) | Pass | Fail |
| CR-06 | Background check — no disqualifying criminal records per landlord policy & local law | Pass | Fail / review |
| CR-07 | Report age ≤ **90 days** | Pass | Re-run required |

#### Compliance

- **US:** FCRA adverse action workflow if declined based on credit
- **UK:** GDPR lawful basis, soft vs hard search distinction per consent text in `applicationFormConfig`

#### Implementation note

This check is **async**. Screening run should set `creditCheckStatus` to `PENDING`/`IN_PROGRESS` until webhook completes.

---

### 10.6 Check 4 — Guarantor verification

**Goal:** Confirm nominated guarantor accepted role, identity matches, and can support tenant financially.

#### Data sources

- `guarantorInformation`, `guarantorAgreement` (+ documents, `guarantorEmployment` JSON)
- Nomination status

#### Rules

| ID | Rule | Pass | Fail |
|----|------|------|------|
| GUA-01 | Nomination accepted | `ACCEPTED` | No |
| GUA-02 | Agreement signed — `signedByGuarantor === true`, signature + `guarantorSignedAt` present | Yes | No |
| GUA-03 | Name match — fuzzy match `guarantorInformation.fullName` vs agreement name parts | Pass | No |
| GUA-04 | DOB match (exact date) | Pass | No |
| GUA-05 | ID match — NIN (UK) or ID number (US) if collected | Pass | Review if missing |
| GUA-06 | Contact match — email and phone consistent (normalized) | Pass | Review |
| GUA-07 | Guarantor is not the applicant (different email/phone/ID) | Pass | Fraud flag |
| GUA-08 | Guarantor affordability — guarantor income ≥ policy threshold for rent | Pass | No |
| GUA-09 | Required docs: `GUARANTOR_INCOME` + `GUARANTOR_EMPLOYMENT` if configured | Pass | Pending |
| GUA-10 | Relationship plausible (not identical address as applicant unless family) | Pass | Review |

---

### 10.7 Check 5 — Referee verification

**Goal:** Independent character references confirmed by referees themselves — not just tenant-entered contacts.

#### Phase A (minimum viable)

| ID | Rule | Pass | Fail |
|----|------|------|------|
| REF-01 | `application.referee` record exists | Yes | No |
| REF-02 | Personal + professional names, emails, phones all populated | Yes | No |
| REF-03 | Referee emails ≠ tenant email; phones ≠ tenant phone | Pass | Fraud flag |
| REF-04 | Personal and professional referees are different people | Pass | Review |

#### Phase B (enterprise — recommended)

| ID | Rule | Pass | Fail |
|----|------|------|------|
| REF-05 | Tokenized email sent to each referee | Sent | Pending |
| REF-06 | Referee completes confirmation form (`REFEREE_CONFIRMATION` doc or web form) | Pass | Pending |
| REF-07 | Referee confirms knowing applicant ≥ configured months | Pass | Review |
| REF-08 | Referee not same as employer/landlord/guarantor contact | Pass | Fraud flag |

---

### 10.8 Check 6 — Landlord verification

**Goal:** Previous landlord reference aligns with tenant residential history and attests good tenancy.

#### Data sources

- `residentialInfo` (+ `prevAddresses`)
- `referenceForm` → `tenancyReferenceHistory`, `externalLandlord`, `conduct`

#### Rules

| ID | Rule | Pass | Fail |
|----|------|------|------|
| LL-01 | Nomination accepted | `ACCEPTED` | No |
| LL-02 | Reference form status `SUBMITTED` or `COMPLETED` | Yes | No |
| LL-03 | Landlord/agency identity match — name, email, phone (normalized E.164 / lowercase email) | Pass | No |
| LL-04 | Tenant name fuzzy match — `tenancyReferenceHistory.tenantName` vs full applicant name | Pass | No |
| LL-05 | Address match — normalized (strip punctuation, postcode/US ZIP extract, fuzzy ≥ 90%) | Pass | No |
| LL-06 | Tenancy dates overlap with declared `lengthOfResidence` (± 60 days) | Pass | Review |
| LL-07 | `conduct.rentOnTime === true` | Pass | Fail |
| LL-08 | `conduct.rentArrears !== true` | Pass | Fail |
| LL-09 | `conduct.complaints !== true` OR explained acceptably | Pass | Review |
| LL-10 | `conduct.rentAgain !== false` | Pass | Review |
| LL-11 | Monthly rent on reference ≈ declared `monthlyRentPaid` (± 10%) | Pass | Review |
| LL-12 | Reason for leaving consistent | Pass | Review |

#### Enterprise extras

- Detect self-referencing (landlord email = tenant email domain/person)
- VOIP-only landlord phone → manual review flag

---

### 10.9 Fraud & integrity signals (cross-cutting)

Run on every screening. Does not replace individual checks but adds risk score.

| Signal | Description | Action |
|--------|-------------|--------|
| FRD-01 | Same email/phone across applicant, guarantor, landlord, employer | High risk — manual review |
| FRD-02 | Reference submitted IP same as tenant signup IP | Review |
| FRD-03 | Reference completed unrealistically fast (< 5 min after invite) | Review |
| FRD-04 | Copy-paste address across unrelated fields with typos fixed | Review |
| FRD-05 | Document metadata inconsistent (payslip date vs employment start) | Review |
| FRD-06 | Multiple applications same guarantor across properties | Review |

Store `riskScore` 0–100 and `riskFlags[]` on screening run.

---

### 10.10 Normalization standards (apply everywhere)

To reduce false failures:

```
names     → lowercase, trim, collapse spaces, remove punctuation, fuzzy (Levenshtein / token sort)
emails    → lowercase, trim, Gmail dot/plus normalization
phones    → E.164 via libphonenumber, strip extensions
dates     → UTC date part comparison; allow configurable tolerance windows
addresses → extract postcode/ZIP; compare street + postcode; optional geocode distance < 100m
money     → normalize currency, monthly vs annual (/12)
```

---

### 10.11 Overall screening outcome

| Outcome | Condition | Landlord UI |
|---------|-----------|-------------|
| **PASSED** | All required checks `YES` (skipped checks excluded by policy) | Badge green; Approve/Reject enabled |
| **PARTIAL** | Some `YES`, some `NO`/`PENDING` | Orange badge; show failed items; block approve by default |
| **FAILED** | Any mandatory check `NO` | Red badge; Reject suggested; allow override with reason |
| **PENDING** | Async credit check in flight | Spinner on credit row; poll every 5s |

**Required vs optional checks** should be configurable per landlord global settings (e.g. guarantor check skipped when no guarantor on application).

---

### 10.12 Audit & compliance requirements

Every screening run must log:

- `runId`, `applicationId`, `triggeredByUserId`, `triggeredAt`
- Market (`UK` / `US`)
- Per-check input snapshot hash (not necessarily full PII export)
- Per-check result + reasons
- Provider reference IDs (credit bureau case ID)
- Override actions with landlord reason

Retention: align with local tenancy law (typically 6–7 years for tenancy records).

---

## 11. Decision matrix: pass, fail, pending, skip

| Check | Can skip? | When to skip | Async? |
|-------|-----------|--------------|--------|
| Employment | No (if employed) | Skip if tenant marked unemployed/student and policy allows | No |
| Income | No | Skip only if rent is 0 / company let | No |
| Credit/background | Configurable | Skip if landlord disables or cash-only policy | **Yes** |
| Guarantor | Yes | Skip if no guarantor on application | No |
| Referee | Configurable | Skip if landlord disables | Optional async |
| Landlord | No (if rental history required) | Skip if first-time renter with policy flag | No |

---

## 12. Implementation checklist

### Phase 1 — Honest internal screening (1–2 weeks)

- [ ] Create `ScreeningService` orchestrator
- [ ] Fix `employmentScreener` and `landlordScreener` bugs
- [ ] Add fuzzy matching utilities
- [ ] Enforce nomination `ACCEPTED` pre-condition
- [ ] Write per-check `YES`/`NO` individually (stop bulk YES)
- [ ] Return structured `{ checks, overall }` from API
- [ ] Update FE `CheckList` to show failed reasons

### Phase 2 — Income + referee (1 week)

- [ ] Implement affordability calculation from rent + income
- [ ] Enable document presence checks on `propertyDocument`
- [ ] Referee completeness + duplicate detection

### Phase 3 — Credit provider (2+ weeks)

- [ ] Consent capture hard gate
- [ ] Provider adapter + webhook
- [ ] Async status + FE polling

### Phase 4 — Enterprise hardening

- [ ] `ApplicationScreeningRun` audit table
- [ ] Fraud signal engine
- [ ] Landlord override with reason
- [ ] Market-specific rule packs (UK/US)
- [ ] Admin manual review queue

---

## Appendix A — File reference

| Area | Path |
|------|------|
| Production screening endpoint | `src/landlord/controllers/applicant.controller.ts` |
| Route | `src/landlord/routes/application.routes.ts` |
| Disabled screeners | `src/utils/screener.ts` |
| Status DB update | `src/services/application.services.ts` → `updateVerificationStatus` |
| Reference validation | `src/validations/schemas/reference.schema.ts` |
| Nomination services | `src/services/guarantor.services.ts`, `employmentinfo.services.ts`, `externallandlord.service.ts` |
| Planned doc verification | `src/services/document_verification.services.ts` |
| FE button | `AsherLandlordFE/src/components/leasing/ApplicationButtonActions.tsx` |
| FE checklist | `AsherLandlordFE/src/components/leasing/CheckList.tsx` |
| FE API | `AsherLandlordFE/src/services/leasing/leasing.ts` → `runScreening` |

---

## Appendix B — Quick comparison summary

| Check | Production today | Disabled `screener.ts` | Enterprise target |
|-------|------------------|------------------------|-------------------|
| Employment | Auto YES | Cross-match employee ref ↔ employment info (buggy) | Nomination + name/company/date + positive reference |
| Income | Auto YES | Nothing | Affordability ratio + documents |
| Credit | Auto YES | Nothing | Regulated provider + consent |
| Guarantor | Auto YES | Name/DOB/NIN match | Nomination + signature + affordability + docs |
| Referee | Auto YES | Nothing | Dual referee confirmation workflow |
| Landlord | Auto YES | 8-field cross-match (buggy) | Nomination + conduct + fuzzy address/name |
