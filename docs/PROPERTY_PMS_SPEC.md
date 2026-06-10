# Property Operational PMS — Specification

> **Purpose:** Additive operational data layer (compliance, insurance, utilities, ownership) for residential and commercial properties, country-aware, without breaking existing listing/create flows.
>
> **Last updated:** 2026-06-06  
> **Repos:** `AsherBE`, `AsherLandlordFE`, `AsherWebUser`

---

## 1. Architecture

Operational data lives in **separate tables** linked to `properties`:

| Model | Purpose |
|-------|---------|
| `propertyComplianceRecord` | Certificates with expiry (gas, EICR, EPC, etc.) |
| `propertyInsurance` | Policies with renewal dates |
| `propertyUtilityAccount` | Supplier / meter / account (private — never on public listings) |
| `propertyOwnershipProfile` | Owner entity, acquisition, mortgage, title ref |

Configuration: `propertyPmsFormConfig.ts` (BE + FE, keep in sync).

---

## 2. API

| Method | Path | Auth |
|--------|------|------|
| `GET` | `/api/landlord/properties/property/:propertyId/operational-profile` | Landlord |
| `PUT` | `/api/landlord/properties/property/:propertyId/operational-profile` | Landlord |

Property `GET` includes operational relations for landlords. Public `GET /api/property/:id` strips sensitive fields and may expose `publicComplianceHints` only.

---

## 3. Markets

| Market | Residential certs (recommended) | Commercial extras |
|--------|--------------------------------|-------------------|
| UK | Gas Safety, EICR, EPC, Fire, Smoke/CO | Business fire, Emergency lighting, Business rates utility |
| Nigeria | Fire safety, C of O | Business permit, Generator utility |
| US | Lead paint, Smoke/CO | Zoning / occupancy |
| Ireland | Same as UK (config) | Same as UK commercial |

Validation mode: **warn** on create wizard; **strict** optional via completeness score.

---

## 4. UI

- **Property details — single Operational tab:** compliance, insurance, utilities, and ownership in one screen (no separate overview sub-tabs). Links to existing **Maintenance & services** / Management maintenance (service center), not a duplicate workflow.
- **Shortlet properties:** Operational tab + existing Maintenance & services tab (shared `PropertyMaintenanceRequests` list).
- **Create wizard:** Full optional operational form on listing/compliance step (residential, commercial, shortlet); does not block submit.
- **Completeness banner:** On property details when profile &lt; 100%
- **Reports:** `/reports/compliance` uses real `complianceChecks` data

---

## 5. Database migration

```bash
cd AsherBE
npm run db:property-operational
npx prisma generate
```

---

## 6. Compliance reminders (cron)

```bash
npm run compliance:reminders
```

Sends in-app notifications and email (when Resend is configured) for certificates/insurance expiring within 90 days. Also scheduled daily in `src/index.ts`.

Set `PMS_COMPLIANCE_EMAIL=false` to disable email (in-app notifications still sent).

### Feature flag

Set `PMS_OPERATIONAL_PROFILE=false` in `.env` to disable operational profile API routes. Enabled by default.

### Scripts

```bash
npm run validate:pms-all           # config + verify + bulk (recommended)
npm run validate:pms-config        # BE/FE config parity
npm run verify:operational-profile # DB + service smoke check
npm run validate:bulk-upload       # UK/NG CSV template payloads
npm run db:backfill-operational    # Recalculate completeness flags
npm run compliance:reminders       # Standalone cron script
```

Scripts import `src/db/prismaClient.ts` directly — they do **not** start the HTTP server.

---

## 7. Bulk upload

Optional CSV column: `operationalProfileJson` (JSON string matching `upsertOperationalProfileSchema`). Applied after property create.

---

## 8. Privacy

Never expose on public listings: `accountNumber`, `meterNumber`, `mortgageAccountRef`, full `utilityAccounts`, `insurancePolicies`, `ownershipProfile`.

Public may show: EPC / gas / EICR **status only** via `publicComplianceHints`.

---

## 9. Implementation checklist

- [x] Prisma models + SQL migration
- [x] `propertyPmsFormConfig` BE/FE
- [x] Operational profile service + routes
- [x] Landlord FE tab + completeness banner
- [x] Wizard full operational form (residential, commercial, shortlet)
- [x] Single consolidated Operational tab (no split overview tabs)
- [x] Operational sync on single-property create API
- [x] Compliance reminder emails (opt-out via `PMS_COMPLIANCE_EMAIL=false`)
- [x] Compliance report wired
- [x] Reminder script
- [x] Public API sanitization
- [x] WebUser listing hints
- [x] Post-bulk-upload JSON sync (when column present)
- [x] Admin compliance oversight view
- [x] Ashertenant compliance hints on tenancy info
- [x] Daily compliance reminder scheduler (server `index.ts`)
- [x] Bulk CSV templates include `Operational Profile JSON` column
- [x] Config validation script (`npm run validate:pms-config`)
- [x] Backfill script (`npm run db:backfill-operational`)
- [x] Feature flag (`PMS_OPERATIONAL_PROFILE`, opt-out via `=false`)
- [x] Dashboard compliance widget (expiring certs)
- [x] Commercial `vatStatus` on create wizard
- [x] Bulk CSV upload path (`bulkPropsUpload`) operational JSON sync
- [x] API smoke script (`npm run verify:operational-profile`)
