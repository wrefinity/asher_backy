# Asher Library templates

Production-ready HTML templates for the landlord **Files → Templates → Asher Library** tab.

## Naming convention

```
[Category] Human title [templates:section:MARKET]
```

| Part | Values |
|------|--------|
| Category | `Template`, `Guide`, `Legal`, `FAQ` |
| Section | `tenant-onboarding`, `property-operations`, `legal-compliance`, `financial-reporting` |
| Market (optional) | `UK`, `NG`, `US`, `IE` — omit for all markets |

**Example:** `[Template] Assured Shorthold Tenancy Agreement [templates:tenant-onboarding:UK]`

## Seed to database

From `AsherBE`:

```bash
npm run seed:admin      # if admin user missing
npm run seed:library    # upload all templates (requires Cloudinary + DATABASE_URL)
npm run seed:library -- --force   # re-upload existing names
```

Documents are stored as `propertyDocument` with `systemId=4`, `isPublished=true`.

## Country gating (Landlord FE)

Landlords see:

- Templates with **no market suffix** (all regions)
- Templates matching their **global settings country** (UK / NG / US / IE)

## Merge tags

Templates use the same tags as **Template Creator** (`TagsModal.tsx`) and lease auto-fill (`tagReplacement.ts`).

| Group | Examples |
|-------|----------|
| Tenant | `{{firstName}}`, `{{tenantFullName}}`, `{{tenantEmail}}`, `{{tenantPhone}}` |
| Landlord | `{{landlordName}}`, `{{landlordEmail}}`, `{{landlordServiceAddress}}` |
| Property | `{{propertyAddress}}`, `{{bedrooms}}`, `{{furnished}}` |
| Lease | `{{monthlyRent}}`, `{{leaseStartDate}}`, `{{rentDueDay}}`, `{{securityDeposit}}` |
| Guarantor / employment / emergency | `{{guarantorName}}`, `{{employerCompany}}`, `{{emergencyContactName}}` |
| Application | `{{applicationId}}`, `{{referenceNumber}}`, `{{petPolicy}}`, `{{smokingPolicy}}` |
| Manual fields | `{{input:text}}`, `{{input:date}}`, `{{input:checkbox}}` |
| Signatures | `{{signature:landlord}}`, `{{signature:tenant}}`, `{{signature:guarantor}}` |

Full key list: `AsherLandlordFE/src/utils/templateTagKeys.ts`

**Note:** `{{email}}` / `{{phoneNumber}}` map to the **tenant**. Use `{{landlordEmail}}` / `{{landlordPhone}}` for landlord details.

## Template inventory

| Section | Count (approx.) |
|---------|-----------------|
| Tenant onboarding | 3 per market + 5 UK-only lease extras |
| Property operations | 3 universal |
| Legal & compliance | 3 per market |
| Financial reporting | 3 universal |

**Total:** 35 seeded documents
