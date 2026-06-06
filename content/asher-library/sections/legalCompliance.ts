import type { LibraryMarketCode } from "../shared/marketCodes";
import { wrapLibraryHtml } from "../shared/htmlWrapper";

function rightsHandbook(market: LibraryMarketCode): string {
  const body: Record<LibraryMarketCode, string> = {
    UK: `<p>Summary for England &amp; Wales landlords: deposit protection, Right to Rent, Section 8/21 notices, HMO licensing, EPC, gas safety (CP12), EICR, and How to Rent guide service.</p>
<ul><li>Assured Shorthold Tenancies — Housing Act 1988</li><li>Deposit cap: 5 weeks' rent (most tenancies)</li><li>Eviction requires valid notice and court order</li></ul>`,
    NG: `<p>Summary for Nigeria landlords: state tenancy laws vary; register where required; document rent and notice periods; use written agreements.</p>`,
    US: `<p>Summary for US landlords: fair housing compliance, state security-deposit rules, habitability, lead disclosure, and local rent-control ordinances.</p>`,
    IE: `<p>Summary for Ireland landlords: RTB registration, deposit limits, Part 4 rights, minimum standards, and notice periods under Residential Tenancies Acts.</p>`,
  };
  return wrapLibraryHtml(`Landlord Rights Handbook (${market})`, body[market]);
}

function rentIncreaseNotice(market: LibraryMarketCode): string {
  const notice: Record<LibraryMarketCode, string> = {
    UK: `<p>Section 13 (periodic AST) or renewal terms may apply. Minimum notice often 1 month (weekly rent) or 2 months (monthly). Use prescribed forms where required.</p>`,
    NG: `<p>Provide written notice per state law and lease terms before increasing rent.</p>`,
    US: `<p>Comply with lease clause and state/local notice (often 30–90 days). Rent control cities may require additional forms.</p>`,
    IE: `<p>RTB rules on rent reviews in RPZs vs non-RPZ areas apply. Serve required notice in writing.</p>`,
  };
  return wrapLibraryHtml(
    "Rent Increase Notice",
    `<p>Date: {{currentDate}}</p>
<p>To: {{tenantFullName}} · {{propertyAddress}}</p>
<p>Current rent: {{currency}} {{monthlyRent}}</p>
<p>Proposed rent: {{input:text}} effective {{input:date}}</p>
${notice[market]}
<p>Landlord: {{landlordName}} · {{landlordEmail}} · {{signature:landlord}}</p>`
  );
}

function evictionGuide(market: LibraryMarketCode): string {
  const steps: Record<LibraryMarketCode, string> = {
    UK: `<ol><li>Check tenancy type and grounds</li><li>Serve valid Section 8 or Section 21 notice</li><li>Apply to court if tenant does not leave</li><li>Never use unlawful eviction (Protection from Eviction Act)</li></ol>`,
    NG: `<ol><li>Review lease and state recovery procedure</li><li>Issue required written notice</li><li>Obtain court order before self-help measures</li></ol>`,
    US: `<ol><li>Document breach or lease expiry</li><li>Serve state-specific notice (pay-or-quit, cure-or-quit, etc.)</li><li>File unlawful detainer if needed</li></ol>`,
    IE: `<ol><li>Identify valid termination ground</li><li>Serve RTB-compliant notice</li><li>Apply to RTB or court as required</li></ol>`,
  };
  return wrapLibraryHtml(`Eviction & Dispute Resolution Guide (${market})`, steps[market]);
}

export function landlordRightsContent(market: LibraryMarketCode): string {
  return rightsHandbook(market);
}

export function rentIncreaseContent(market: LibraryMarketCode): string {
  return rentIncreaseNotice(market);
}

export function evictionGuideContent(market: LibraryMarketCode): string {
  return evictionGuide(market);
}
