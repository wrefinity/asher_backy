# Property PMS — Implementation plan

> **Status tracker** (last updated 2026-06-06). See also `PROPERTY_PMS_SPEC.md` for API/schema detail.

## Phase completion

| Phase | Scope | Status |
|-------|--------|--------|
| **0** | Spec, `propertyPmsFormConfig` BE/FE, public vs private rules | ✅ Done |
| **1** | Prisma models, migration, service, routes, validation | ✅ Done |
| **2** | Operational profile tab (all property types), completeness banner, contact fields restored | ✅ Done |
| **3** | Full wizard operational form (residential + commercial + shortlet), non-blocking | ✅ Done |
| **4** | Compliance report, daily cron reminders, dashboard widget | ✅ Done |
| **5** | Bulk CSV column, JSON sync (both bulk paths), field mapping | ✅ Done |
| **6** | WebUser hints, Ashertenant indicator, Admin oversight | ✅ Done |
| **7** | Config validation script, backfill script, feature flag, API verify script | ✅ Done |

### Verification (2026-06-08)

All scripts run successfully against local DB:

```bash
npm run validate:pms-config          # ✅ BE/FE parity
npm run verify:operational-profile   # ✅ DB + config + findExpiringRecords
npm run db:backfill-operational:dry  # ✅ 0 changes (no operational data yet)
npm run compliance:reminders         # ✅ 0 sent (no expiring certs)
npm run validate:bulk-upload         # ✅ UK/NG template payloads
npm run ts.check                     # ✅ clean
```

**Infrastructure fix:** extracted `src/db/prismaClient.ts` and `listingMarketCountries.ts` so scripts no longer bootstrap the HTTP server.

### Quick wins (pre-build list)

- [x] Re-enable property contact / auto-fill from landlord profile
- [x] Completeness banner on property overview
- [x] Commercial `vatStatus` on create flow (Basic Info step)
- [x] EPC + HMO + operational cert expiry reminders (cron + script)

### Product decisions (locked)

- **Single Operational tab** — compliance, insurance, utilities, and ownership stay in one overview (no separate Asset / Insurance / Utilities tabs).
- **Shortlet** uses residential operational config (UK/NG/US/IE) on the same Operational tab and create wizard.
- **Maintenance** — reuse existing service-center workflow (`/service/maintenance/*`, tenant/landlord/vendor flows, Management tab). Operational PMS links to it; no parallel maintenance module.

### Maintenance integration (existing system)

| Surface | Role |
|---------|------|
| **Service center** | Create, vendor quotes, status, payments — `MaintenanceHomePage`, `MaintenanceDetails` |
| **Management tab** (rental) | Property-scoped request list → service center detail |
| **Shortlet → Maintenance & services** | Same list component as Management maintenance panel |
| **Operational tab** | Bridge links: view maintenance + create request with `?propertyId=` |
| **Ashertenant** | Tenant maintenance requests (unchanged) |

### Deferred (post-MVP / Phase 2 product)

- [ ] Automated Jest/API contract test suite (no test runner in BE package yet)
- [ ] Full 4-market × 2-spec manual QA matrix sign-off
- [ ] Deep accounting, dilapidations, CAM reconciliation (outside operational PMS scope)

---

Executive answer
To reach production-grade, country-aware PMS property data for residential + commercial, without breaking existing flows, you’re looking at roughly:

Team shape	Calendar time	Effort
1 strong full-stack dev
14–18 weeks
~55–70 dev-days
2 devs (BE + FE in parallel)
8–10 weeks
same total effort
MVP slice (compliance + insurance + utilities only, UK+NG first)
5–6 weeks
~25–30 dev-days
You’re currently at about 65–70% of listing/lettings PMS data, but only ~35–40% of operational/asset PMS data. The gap is not “add a few fields to the wizard” — it’s a new operational layer on top of what you already have.

What “production-grade without breaking anything” means in your codebase
Your system already has the right pattern for safe upgrades:

Country gates — listingMarketGate, isUK / isNigeria / isUS, bulk templates split UK vs NG
Config-driven forms — same idea as applicationFormConfig.ts (market → visible/required fields)
Additive API updates — updatePropertySchemaNew accepts optional nested residential / commercial objects
Post-create editing — EditablePropertySection + property overview already patch without re-running the wizard
The safe rule: do not stuff 80 new required fields into the create-property wizard. That will break listing flow, bulk upload, and existing validations.

Instead:

Keep unchanged
Add additively
Create wizard - listing data
Tenancy / finance / maintenance
Search & WebUser listings
propertyPmsFormConfig - UK/NG/US/IE
New DB tables - compliance, insurance, utilities, ownership
Property Overview tabs - Asset & Compliance
Optional wizard step - warnings not blockers
Compliance alerts + reports
All new fields = optional, default empty, old payloads unchanged.

Country-specific: what “full” actually means
Markets in your code today: UK, Nigeria, US, Ireland (Ireland partially via listing gate).

UK — Residential (must-have for production)
Domain	You have	Still need
Listing/physical
Strong
Minor gaps only
Legal/tenure
Fields exist, many optional
Make tenure/council tax recommended with warnings
Energy
EPC rating
EPC cert number + expiry date
Safety compliance
Document upload only
Gas Safety (CP12), EICR, smoke/CO alarms, Legionella — structured with expiry
HMO
Licence # + expiry
Good — extend to reminders
Insurance
Doc category
Policy provider, #, type, renewal, premium
Utilities
sharedBills flags
Supplier, account #, meter ID (MPAN/MPRN)
Ownership/finance
marketValue optional
Acquisition date/cost, owner entity, mortgage basics
Contact
Commented out in UI
Restore or auto-fill from landlord profile
UK — Commercial
Domain	You have	Still need
Lease economics
Strong
Good base
Business rates
String field
Rateable value, annual amount, reassessment date
Planning
Zoning string
Use class (E/G/etc.), planning ref
Compliance
Safety feature tags
Fire risk assessment, asbestos register, emergency lighting
VAT
vatStatus on model, weak in flow
VAT on rent, option to reclaim rates
Insurance
Same gap as residential
Structured block
Service charge
Amount only
Apportionment %, budget ref, year
Nigeria — Residential
Domain	You have	Still need
Address
State, LGA, city
Good
Deposits
initialDeposit (not security split)
Good for NG market
Energy/EPC
Skipped in wizard
Not required — don’t force UK fields
Legal
Limited
Title type (C of O, Governor’s consent, Deed), registration ref
Power
Generic utilities
PHCN/Disco, prepaid meter, generator/inverter details
Water/security
—
Water source, estate security levy
Compliance
—
Tenancy law disclosures (state-level), not UK gas/EICR
Nigeria — Commercial
Domain	You have	Still need
Building grade
NG variant of building class
Good
Power
powerSupply
Extend with generator capacity, diesel cost recovery
Permits
—
Business permit / operational licence ref
Rates/tax
—
Land use charge / LUC reference (Lagos etc.)
US — Residential & Commercial
Domain	You have	Still need
Tax/HOA
propertyTax, hoaFees, hoaName
Good start
Tenure
US tenure types
Good
Compliance
—
Lead paint (pre-1978), state disclosure checklist, fair housing notes
Commercial
Partial
CAM charges, TI allowance, zoning code
Recommended architecture (mirrors your best existing pattern)
Create propertyPmsFormConfig.ts in both BE and FE (keep in sync like listingMarketGate.ts):

// Concept — same pattern as applicationFormConfig
{
  market: 'UK' | 'NG' | 'US' | 'IE' | 'default',
  specification: 'RESIDENTIAL' | 'COMMERCIAL',
  sections: {
    compliance: { visible: true, certificates: ['GAS_SAFETY', 'EICR', ...] },
    insurance: { visible: true, required: 'recommended' },
    utilities: { visible: true, fields: ['electricitySupplier', 'mpan', ...] },
    ownership: { visible: true, fields: [...] },
  },
  validationMode: 'warn' | 'strict', // strict only when marking "production ready"
}
New database models (additive — zero impact on existing rows)
Model	Purpose
propertyComplianceRecord
cert type, issue/expiry, status, document link, reminder sent
propertyInsurance
provider, policy #, cover type, premium, renewal
propertyUtilityAccount
utility type, supplier, account/meter, paidBy
propertyOwnershipProfile
owner entity, acquisition, mortgage, tax refs
Optional on properties:

operationalProfileComplete: Boolean
operationalProfileCompletedAt: DateTime
Do not flatten this into 40 nullable columns on ResidentialProperty — you’ll regret it for alerts and reports.

Phased work plan (full upgrade, safe rollout)
Phase 0 — Spec & config foundation
~1 week | 5 dev-days

Write PROPERTY_PMS_SPEC.md (like your TENANT_SCREENING_SPEC.md)
Country × spec matrix (UK/NG/US × residential/commercial)
Shared propertyPmsFormConfig BE + FE
Define what is public (listing) vs private (PMS ops)
Touch: 2 new config files, no runtime behavior change yet.

Phase 1 — Backend data layer
~2.5 weeks | 12 dev-days

Prisma models + migrations (additive)
Joi validation (all optional nested objects)
Extend PropertyServices.createProperty / updateProperty to read/write relations
GET property includes new blocks
Seed cert type enums per country
Unit tests for market config resolution
Touch:
property.prisma, properties.schema.ts, propertyServices.ts, properties.interface.ts, new service files (~3)

Risk control: existing create/update paths unchanged if new payloads omitted.

Phase 2 — Property Overview UI (main UX — do this before wizard)
~3 weeks | 15 dev-days

Add overview tabs (residential + commercial):

Asset & ownership
Compliance calendar
Insurance
Utilities & services
Reuse EditablePropertySection / your new DetailSection pattern. Country-aware sections from config.

Also fix quick wins:

Restore contact (or auto-fill from landlord)
Surface vatStatus on commercial overview
“Profile completeness” score (warnings, not blockers)
Touch: ~8–12 FE files in Rentals/overview/, new shared components (~4), services/mutations.

Why overview first: landlords can complete PMS data on existing properties without re-onboarding; zero impact on create flow.

Phase 3 — Create/edit wizard integration
~2.5 weeks | 12 dev-days

Add optional step: “Operational profile” (or split residential Step 4)
Country-gated fields only
Warn, don’t block listing publish if incomplete
Update payload builders:
ResidentialPropertyForm.payload.*
CommercialPropertyForm.formDataPayload.ts
Update review sections
Touch: ~15–20 files under pages/properties/forms/

Risk control: step skippable; existing 4-step flow still works.

Phase 4 — Compliance engine & reports
~2 weeks | 10 dev-days

Replace stub getComplianceReport (currently returns complianceChecks: [])
Cron/job: expiry reminders (30/60/90 days)
Notifications (email/in-app)
Dashboard widget: “Properties with expiring certs”
Link to document library uploads
Touch: reports.service.ts, notification service, new cron script, landlord dashboard.

Phase 5 — Bulk upload & import
~1.5 weeks | 7 dev-days

Extend enhancedPropertyFields.bulkByCountry.ts
UK vs NG CSV templates with new columns (all optional)
property.upload.services.ts mapping
Validation script update (validate-bulk-upload-payloads.ts)
Touch: ~8 bulk-upload files + CSV templates.

Phase 6 — Downstream apps (read-only, filtered)
~1 week | 5 dev-days

App	Work
AsherWebUser
Show public compliance badges only (EPC rating, cert “valid until” if you choose) — never show account numbers
Ashertenant
No change or “landlord certificates on file” indicator
AsherAdmin
Compliance oversight view (optional)
Touch: listingDetail.ts, API response shaping / privacy filter on BE.

Phase 7 — QA, migration, hardening
~2 weeks | 10 dev-days

Test matrix: 4 markets × 2 specs × create/edit/bulk/overview
Backfill script for existing properties (empty compliance rows OK)
API contract tests
Performance check on property GET (eager load new relations)
Feature flag: PMS_OPERATIONAL_PROFILE=true
Total effort summary
Phase	Dev-days	Can ship independently?
0 Spec/config
5
Yes
1 Backend
12
Yes (API only)
2 Overview UI
15
Best first user value
3 Wizard
12
Yes
4 Alerts/reports
10
Needs Phase 1+2
5 Bulk upload
7
Yes
6 WebUser/tenant
5
Yes
7 QA/hardening
10
Final
Total
~66 dev-days
Calendar: ~14–18 weeks solo, ~8–10 weeks with 2 devs.

What you should NOT do (this is how you break things)
Don’t make 30 new fields required on property create — blocks Nigeria, breaks bulk upload, angers landlords mid-listing
Don’t add columns only to ResidentialProperty — commercial needs parity; compliance needs expiry queries
Don’t put UK gas/EICR on Nigeria forms — use config, not copy-paste
Don’t change existing API response shapes — only add nested objects
Don’t merge operational + listing into one giant wizard step — keep “Listing & compliance” for marketing; add “Operational profile” separately
Don’t expose utility account numbers on public listings
Suggested delivery order (maximum value, minimum risk)
Week 1–2:   Phase 0 + Phase 1 (config + DB + API)
Week 3–5:   Phase 2 (Overview tabs) → landlords can use immediately
Week 6–7:   Phase 4 (alerts) → real PMS value
Week 8–9:   Phase 3 (wizard optional step)
Week 10:    Phase 5 (bulk)
Week 11:    Phase 6 + 7 (QA, WebUser, launch)
If budget is tight, stop after Phase 2 + 4 — you’ll have production-usable compliance/insurance/utilities without touching the create wizard at all.

Honest gap scorecard (after full upgrade)
Area	Today	After full upgrade
Listing/marketing data
85%
90%
Residential physical/legal
75%
90%
Commercial lease/spec data
80%
92%
Compliance tracking
15%
90%
Insurance
10%
85%
Utilities/accounts
25%
85%
Ownership/finance asset register
30%
80%
Country-aware correctness
70%
95%
Overall production PMS readiness
~55%
~88%
The remaining ~12% is things like dilapidations, full CAM reconciliation, and deep accounting — usually Phase 2 product, not property intake.

Immediate quick wins (1 week, low risk)
Before the big build, these fix real holes without schema changes:

Re-enable property contact (commented out in residential + commercial ContactInfo.tsx) or default from landlord profile
EPC + HMO expiry reminders using existing HMO fields + document dates
Commercial vatStatus on create flow, not just overview edit
Completeness banner on property overview (“UK residential: missing Gas Safety, Insurance”) using config — no new DB yet
If you want to proceed, the highest-leverage next step is Phase 0: I can draft PROPERTY_PMS_SPEC.md with the exact country × residential/commercial field matrix, DB schema, and API shapes — same style as your tenant screening spec — so implementation stays additive and reviewable before anyone writes UI.

---

## Enterprise suite (upgrade existing modules)

For the full enterprise PMS vision — maintenance, inspections, finance, leasing, documents, tenant app — **without** building parallel systems, see **`ENTERPRISE_PMS_SUITE.md`**.

| Track | Approach |
|-------|----------|
| Operational PMS | Single tab; bridges to service center |
| Maintenance | Existing service center + property Management tab |
| Inspections | Service center + deep links from Operational hub |
| Finance & deep accounting | `/finance` dashboard, wallet, Account Integration (QB/Xero/Zoho), property bills tab, operational asset panel |
| Documents | Property Documents tab + cert linking on operational rows |
| Admin / tenant / public | Read-only or indicator layers on shared BE data |

**Current enterprise cohesion:** ~70% wired; Phase B–F in `ENTERPRISE_PMS_SUITE.md` close the remaining silos incrementally.