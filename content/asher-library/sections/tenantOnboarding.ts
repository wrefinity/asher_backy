import type { LibraryMarketCode } from "../shared/marketCodes";
import { sigBlock, wrapLibraryHtml } from "../shared/htmlWrapper";

const partiesBlock = `
<p class="subtitle">Generated {{currentDate}} · Reference {{applicationId}}</p>
<h2>1. Parties</h2>
<p><strong>Landlord:</strong> {{landlordName}} · {{landlordEmail}} · {{landlordPhone}}</p>
<p><strong>Tenant:</strong> {{title}} {{firstName}} {{lastName}} · {{tenantEmail}} · {{tenantPhone}}</p>
<p><strong>Guarantor (if applicable):</strong> {{guarantorName}} · {{guarantorEmail}} · {{guarantorPhone}}</p>`;

const propertyBlock = `
<h2>2. Property</h2>
<p>The landlord lets and the tenant takes the dwelling known as:</p>
<p><strong>{{propertyAddress}}, {{propertyCity}}, {{propertyState}} {{propertyZipCode}}, {{propertyCountry}}</strong></p>
<p>Property type: {{propertyType}} · Bedrooms: {{bedrooms}} · Bathrooms: {{bathrooms}}</p>`;

const termRentBlock = `
<h2>3. Term</h2>
<p>Fixed term from <strong>{{leaseStartDate}}</strong> to <strong>{{leaseEndDate}}</strong> ({{leaseTerm}} months), unless ended earlier in accordance with this agreement.</p>
<p>Intended move-in date: {{moveInDate}}</p>
<h2>4. Rent and payments</h2>
<p>Monthly rent: <strong>{{currency}} {{monthlyRent}}</strong>.</p>
<p>Rent is due on <strong>{{dueDate}}</strong> each month by {{payment:method}}.</p>
<p>Payment terms: {{payment:terms}}.</p>
<h2>5. Deposit</h2>
<p>Security deposit: <strong>{{currency}} {{securityDeposit}}</strong>.</p>`;

const obligationsBlock = `
<h2>6. Tenant obligations</h2>
<ul>
  <li>Pay rent and permitted charges on time.</li>
  <li>Keep the property clean and report disrepair promptly.</li>
  <li>Not assign or sub-let without written consent.</li>
  <li>Comply with house rules and local laws.</li>
</ul>
<h2>7. Landlord obligations</h2>
<ul>
  <li>Maintain the property and lawful deposit handling.</li>
  <li>Provide required notices before entry except emergencies.</li>
</ul>`;

const signaturesBlock = `
<h2>8. Signatures</h2>
<p>The parties confirm they have read and agree to this agreement.</p>
<div class="sig-grid">
  ${sigBlock("Landlord", "{{signature:landlord}}")}
  ${sigBlock("Tenant", "{{signature:tenant}}")}
</div>`;

function ukAst(): string {
  return wrapLibraryHtml(
    "Assured Shorthold Tenancy Agreement",
    `<p class="subtitle">England &amp; Wales · Housing Act 1988 (as amended) · Generated {{currentDate}} · Ref {{applicationId}}</p>

<div class="notice"><strong>Important:</strong> This is a comprehensive Assured Shorthold Tenancy (AST) template. Before signing, ensure deposit protection, prescribed information, the current <em>How to Rent</em> guide, Right to Rent checks, and required safety certificates have been completed. Seek legal advice if unsure.</div>

<h2>1. Parties</h2>
<p>This agreement is made between:</p>
<p><strong>Landlord:</strong> {{landlordName}}<br />
<strong>Landlord service address for notices (England/Wales):</strong> {{landlordServiceAddress}}<br />
<strong>Landlord email:</strong> {{landlordEmail}} · <strong>Landlord phone:</strong> {{landlordPhone}}</p>
<p><strong>Tenant(s):</strong> {{title}} {{firstName}} {{lastName}}<br />
<strong>Email:</strong> {{tenantEmail}} · <strong>Phone:</strong> {{tenantPhone}}</p>
<p><strong>Additional tenant(s) (if any):</strong> {{input:text}}</p>
<p><strong>Permitted occupier(s) (not liable for rent):</strong> {{input:text}}</p>
<p><strong>Guarantor (if applicable):</strong> {{guarantorName}} · {{guarantorEmail}} · {{guarantorPhone}} · {{guarantorAddress}}</p>

<h2>2. Property</h2>
<p>The landlord lets to the tenant the dwelling known as:</p>
<p><strong>{{propertyAddress}}, {{propertyCity}}, {{propertyState}} {{propertyZipCode}}, {{propertyCountry}}</strong></p>
<p><strong>Property type:</strong> {{propertyType}} · <strong>Bedrooms:</strong> {{bedrooms}} · <strong>Bathrooms:</strong> {{bathrooms}}</p>
<p><strong>Furnished / unfurnished:</strong> {{furnished}} · <strong>Included fixtures &amp; fittings:</strong> {{input:text}}</p>
<p><strong>Parking / garage (if any):</strong> {{input:text}}</p>

<h2>3. Term</h2>
<p><strong>Tenancy type:</strong> Assured Shorthold Tenancy (AST) for a fixed term.</p>
<p>The tenancy starts on <strong>{{leaseStartDate}}</strong> and ends on <strong>{{leaseEndDate}}</strong> ({{leaseTerm}} months), unless ended earlier under this agreement or by law.</p>
<p><strong>Intended move-in date:</strong> {{moveInDate}}</p>
<p><strong>Early possession:</strong> {{input:text}} (if tenant occupies before start date, state whether rent/charges apply)</p>
<p><strong>Renewal:</strong> {{input:text}} (e.g. option to renew, or tenancy continues as periodic tenancy if neither party serves notice)</p>
<p><strong>Break clause:</strong> {{input:text}} (if none, state "No break clause — fixed term runs to {{leaseEndDate}}")</p>

<h2>4. Rent</h2>
<p>The rent is <strong>{{currency}} {{monthlyRent}}</strong> per calendar month.</p>
<p>Rent is due in advance on the <strong>{{rentDueDay}}</strong> day of each month (due date: {{dueDate}}).</p>
<p><strong>Payment method:</strong> {{payment:method}} (e.g. standing order / bank transfer to {{input:text}})</p>
<p><strong>Payment terms:</strong> {{payment:terms}}</p>
<p><strong>Council tax:</strong> {{input:text}} (typically tenant pays unless included in rent)</p>
<p><strong>Rent increase during fixed term:</strong> {{input:text}} (generally only if a rent review clause is included; otherwise use Section 13 notice when periodic)</p>

<h2>5. Deposit</h2>
<p>The tenant pays a deposit of <strong>{{currency}} {{securityDeposit}}</strong> (must not exceed five weeks' rent unless annual rent exceeds £50,000, then six weeks).</p>
<p><strong>Deposit protection scheme:</strong> {{input:text}} (DPS, MyDeposits, or TDS)</p>
<p><strong>Scheme reference / ID:</strong> {{input:text}}</p>
<p><strong>Prescribed information served on:</strong> {{input:date}} to {{email}}</p>
<p>The deposit is held against breach of this agreement, unpaid rent, and damage beyond fair wear and tear. It will be returned within the time limits set by the scheme and law.</p>

<h2>6. Utilities and communications</h2>
<p><strong>Utilities (gas, electricity, water, internet, TV licence):</strong> {{input:text}} (e.g. tenant pays all utilities directly unless stated below)</p>
<p><strong>Included in rent:</strong> {{input:text}}</p>
<p><strong>Shared costs (HMO / bills package):</strong> {{input:text}}</p>
<p>The tenant must transfer utilities into their name where required and provide meter readings at start and end of tenancy.</p>

<h2>7. Tenant obligations</h2>
<ol>
  <li>Pay rent and any permitted charges on time.</li>
  <li>Use the property as a private home only; not for illegal purposes or business without written consent.</li>
  <li>Not assign, sublet, or part with possession without the landlord's written consent.</li>
  <li>Keep the property reasonably clean and ventilated; report disrepair and defects promptly.</li>
  <li>Take reasonable care of the property, fixtures, and any furniture provided.</li>
  <li>Not make alterations or redecoration without consent (minor picture hooks excepted if agreed).</li>
  <li>Comply with smoke and carbon monoxide alarm requirements; not disable alarms.</li>
  <li>Give access for repairs, inspections, and gas safety checks on reasonable notice (see clause 12).</li>
  <li>Not cause nuisance, harassment, or anti-social behaviour to neighbours.</li>
  <li>Return all keys and leave the property clear and in similar condition (fair wear and tear excepted) at end of tenancy.</li>
</ol>

<h2>8. Landlord obligations</h2>
<ol>
  <li>Allow the tenant quiet enjoyment of the property.</li>
  <li>Keep in repair the structure, exterior, and installations for supply of water, gas, electricity, sanitation, space heating, and hot water (Landlord and Tenant Act 1985, s.11).</li>
  <li>Carry out gas safety check annually by a Gas Safe engineer and provide certificate before move-in and within 12 months thereafter.</li>
  <li>Provide a valid Energy Performance Certificate (EPC) and electrical installation condition report (EICR) where required.</li>
  <li>Protect the deposit in an authorised scheme and provide prescribed information within 30 days.</li>
  <li>Provide the tenant with the current <em>How to Rent</em> guide where required.</li>
  <li>Conduct Right to Rent checks before the tenancy starts (England).</li>
  <li>Maintain any common parts and buildings insurance for the structure (tenant insures contents unless agreed otherwise).</li>
</ol>

<h2>9. Use of property — pets, smoking, and vehicles</h2>
<p><strong>Pets:</strong> {{petPolicy}} · {{input:text}}</p>
<p><strong>Smoking / vaping indoors:</strong> {{smokingPolicy}} · {{input:text}}</p>
<p><strong>Vehicles / parking:</strong> {{parkingPolicy}} · {{input:text}}</p>
<div class="guidance"><strong>Guidance:</strong> Unauthorised pets, smoking indoors, or unregistered vehicles may constitute a breach (see clause 22). Consent for pets should be in writing and may require a higher deposit within legal limits and pet insurance.</div>

<h2>10. House rules</h2>
<div class="rules-box">
<p>The tenant must comply with the following house rules throughout the tenancy. Additional property-specific rules: {{input:text}}</p>
<ol>
  <li><strong>Occupancy:</strong> Only named tenants and permitted occupiers may live at the property. Maximum persons: {{input:text}}.</li>
  <li><strong>Guests:</strong> Overnight guests may stay up to {{input:text}} consecutive nights without landlord consent; longer stays require written permission (guests do not acquire tenancy rights).</li>
  <li><strong>Noise:</strong> Quiet hours 23:00–07:00. No loud music, parties, or DIY noise outside 08:00–20:00 without prior agreement.</li>
  <li><strong>Cleanliness:</strong> Keep all rooms, appliances, bathrooms, and kitchens clean; dispose of rubbish regularly; do not allow pest infestations through poor hygiene.</li>
  <li><strong>Ventilation:</strong> Use extractor fans and trickle vents; wipe condensation from windows; report mould promptly — do not ignore damp conditions.</li>
  <li><strong>Heating:</strong> Maintain minimum background heating in winter to prevent pipes freezing and mould; follow any heat-pump or boiler instructions provided.</li>
  <li><strong>Refuse &amp; recycling:</strong> Follow local collection days; bins must not block access; waste stored securely until collection day.</li>
  <li><strong>Garden / balcony:</strong> {{input:text}} (e.g. keep tidy, mow lawn, no bonfires, no structural planting without consent)</li>
  <li><strong>Communal areas (flats/HMOs):</strong> Do not store items in hallways or block fire exits; comply with building management rules.</li>
  <li><strong>Fixtures:</strong> Do not remove smoke alarms, CO detectors, fire doors, or window restrictors.</li>
  <li><strong>Keys:</strong> Do not duplicate keys without consent; report lost keys immediately; return all keys, fobs, and parking passes at checkout.</li>
  <li><strong>Prohibited items:</strong> No paraffin heaters, BBQs indoors, fireworks storage, or dangerous substances.</li>
  <li><strong>Alterations:</strong> No painting, wallpaper, shelving, satellite dishes, or fixtures without written consent.</li>
  <li><strong>Business use:</strong> No commercial activity, Airbnb/sub-letting, or running a business from the property without consent and planning permission where required.</li>
  <li><strong>Illegal activity:</strong> Strictly prohibited — includes drug production, fraud, harassment, and weapons storage.</li>
</ol>
</div>

<h2>11. Anti-social behaviour and neighbour complaints</h2>
<p>The tenant, household members, and visitors must not cause nuisance, annoyance, or harassment to neighbours, the landlord, or agents.</p>
<ul>
  <li>Examples include excessive noise, abusive language, intimidation, littering, obstructive parking, and aggressive behaviour.</li>
  <li>The tenant must cooperate with any reasonable investigation of complaints and take steps to prevent recurrence.</li>
  <li>Serious or repeated anti-social behaviour may be reported to the local authority or police and may ground possession under Section 8 (Schedule 2, Housing Act 1988).</li>
</ul>
<div class="warning"><strong>Violation consequence:</strong> Documented ASB may result in written warning → final warning → Section 8 notice → court proceedings. Deposit may be used for remedial cleaning or damage caused by related incidents (subject to scheme rules).</div>

<h2>12. Keys, security, and access</h2>
<p><strong>Keys / fobs issued:</strong> {{input:text}} · <strong>Deposit for lost keys (if applicable):</strong> {{input:text}}</p>
<p>The tenant must keep the property secure at all times — lock doors and windows when leaving. Notify the landlord immediately if locks fail or keys are lost (lock changes may be charged if due to tenant fault).</p>
<p>The landlord or agents may enter to inspect, repair, or show prospective tenants/buyers with at least <strong>24 hours' written notice</strong>, at a reasonable time, except in emergencies (fire, flood, gas leak, serious structural risk, or imminent danger to persons).</p>
<p>Refusing reasonable access for legally required gas or electrical safety checks is a breach of this agreement.</p>

<h2>13. Repair, maintenance, and reporting</h2>
<p>The tenant must report repairs as follows:</p>
<table>
  <tr><th>Priority</th><th>Examples</th><th>Report within</th></tr>
  <tr><td><strong>Emergency</strong></td><td>No heating in winter, major water leak, gas smell, no electricity, broken external door lock, raw sewage</td><td>Immediately — call {{input:text}}</td></tr>
  <tr><td><strong>Urgent</strong></td><td>Partial heating/hot water failure, leaking roof, broken toilet (only WC), pest infestation</td><td>24 hours via tenant portal / email</td></tr>
  <tr><td><strong>Routine</strong></td><td>Dripping tap, loose handle, minor cosmetic issues</td><td>7 days</td></tr>
</table>
<p><strong>Tenant minor responsibilities:</strong> replace smoke alarm batteries, standard light bulbs, unblock plugholes caused by tenant use, replace broken glass they caused, keep gardens tidy if agreed.</p>
<p><strong>Landlord responsibilities:</strong> structural repairs, heating/hot water systems, sanitary installations, and external repairs (s.11 LTA 1985).</p>
<div class="guidance"><strong>Guidance:</strong> Failure to report disrepair may worsen damage and affect deposit claims. Tenants should keep photos and repair reference numbers.</div>

<h2>14. Inventory, condition, and fair wear and tear</h2>
<p>An inventory and schedule of condition {{input:text}} (will / will not) be completed at start and end of tenancy. Both parties should sign and retain a copy.</p>
<p><strong>Meter readings at start:</strong> Gas {{input:text}} · Electric {{input:text}} · Water {{input:text}}</p>
<p><strong>Fair wear and tear</strong> means deterioration from normal use over time — e.g. minor carpet wear, faded paint, small nail holes. It is <em>not</em> damage from negligence, stains, burns, unauthorised redecoration, or missing items.</p>
<p>At checkout, the property should be returned clean, with all landlord items present, keys returned, and utilities settled.</p>

<h2>15. Insurance and liability</h2>
<p>The landlord insures the building (not tenant belongings). The tenant is strongly advised to take out <strong>contents insurance</strong> including tenant liability cover.</p>
<p>The tenant is liable for damage caused by themselves, household members, or visitors beyond fair wear and tear, including accidental damage where negligence is shown.</p>
<p>The tenant must not invalidate the landlord's insurance through prohibited use, unauthorised alterations, or failure to report incidents.</p>

<h2>16. Rent arrears, late payment, and permitted charges</h2>
<p>Rent is a priority payment. Arrears may affect referencing for future tenancies and credit records where court judgments are obtained.</p>
<p>Under the <strong>Tenant Fees Act 2019</strong> (England), permitted charges include rent, tenancy deposit (capped), holding deposit (capped), and default fees for lost keys or late rent (after 14 days overdue — interest capped at 3% above Bank of England base rate).</p>
<p><strong>Late payment terms:</strong> {{payment:lateFee}} · {{payment:lateFeePercent}} · {{payment:terms}}</p>
<p><strong>Arrears procedure:</strong> (1) reminder after due date → (2) formal arrears letter at 7 days → (3) pre-action protocol compliance → (4) Section 8 notice (ground 8, 10, or 11) where applicable → (5) court claim. Communication in writing is essential.</p>

<h2>17. Ending the tenancy</h2>
<p><strong>During fixed term:</strong> tenant may only leave early by agreement, break clause (clause 3), or mutual surrender (documented in writing).</p>
<p><strong>Surrender fee / relet costs (if agreed):</strong> {{input:text}} — must comply with Tenant Fees Act; many relet charges are not permitted in England.</p>
<p><strong>After fixed term:</strong> tenancy may roll into periodic AST. Landlord: valid Section 21 or Section 8 notice per current law. Tenant: minimum one month's written notice (or longer if agreed).</p>
<p><strong>Checkout:</strong> provide forwarding address, return keys, leave property clean and empty unless agreed otherwise, provide final meter readings.</p>
<p><strong>Abandonment:</strong> if tenant appears to have left without notice, landlord must follow proper abandonment procedures — do not simply re-enter and change locks without legal advice.</p>

<h2>18. Guarantor</h2>
<p>Where named in clause 1, the guarantor jointly guarantees rent, damage beyond fair wear and tear, and reasonable enforcement costs for {{input:text}}.</p>
<p>Guarantor must notify landlord of change of address. A separate guarantor deed is recommended.</p>

<h2>19. HMO, licensing, and overcrowding</h2>
<p><strong>Licensing status:</strong> {{input:text}}</p>
<p>The tenant must not exceed permitted occupancy or use rooms not agreed as bedrooms. Overcrowding may breach HMO rules and invalidate insurance.</p>

<h2>20. Data protection</h2>
<p>Personal data is processed for tenancy management, referencing, deposit protection, repairs, and legal compliance under UK GDPR. Data may be shared with deposit schemes, contractors, insurers, and courts where lawful.</p>

<h2>21. Breach of agreement — violations and consequences</h2>
<p>A breach occurs when a tenant fails to comply with any term of this agreement or house rules. Consequences depend on severity and may include:</p>
<ul>
  <li><strong>Informal reminder</strong> — minor first-time issues (e.g. bins left out)</li>
  <li><strong>Written warning</strong> — recorded on file; tenant must remedy within stated time</li>
  <li><strong>Final warning</strong> — further breach may trigger legal action</li>
  <li><strong>Deposit deduction</strong> — for damage, cleaning, missing items, or unpaid rent (evidence required; dispute via deposit scheme ADR)</li>
  <li><strong>Section 8 notice</strong> — for serious or persistent breaches (rent arrears, ASB, damage, illegal use)</li>
  <li><strong>Section 21 notice</strong> — no-fault route where preconditions met (not a penalty for breach, but may end tenancy)</li>
  <li><strong>Court possession order</strong> — if tenant does not leave after valid notice</li>
  <li><strong>Guarantor pursued</strong> — where guarantor deed applies</li>
</ul>
<table class="violation-table">
  <tr><th>Violation</th><th>Typical consequence</th><th>Remedy / action required</th></tr>
  <tr><td>Rent arrears (any amount after due date)</td><td>Arrears letter; interest after 14 days; Section 8 if persistent</td><td>Pay immediately; contact landlord if hardship</td></tr>
  <tr><td>Late rent (repeated)</td><td>Written warning; possible referencing flag</td><td>Set up standing order; pay on time</td></tr>
  <tr><td>Unauthorized pet</td><td>Removal order; deposit for odour/damage; possible Section 8</td><td>Remove pet or obtain written consent</td></tr>
  <tr><td>Smoking indoors</td><td>Deposit deduction for redecoration; warning</td><td>Smoke outside only if permitted</td></tr>
  <tr><td>Subletting / Airbnb</td><td>Immediate breach; Section 8; rent account may be pursued</td><td>Stop immediately; surrender may be required</td></tr>
  <tr><td>ASB / excessive noise</td><td>Warning → final warning → Section 8; council involvement</td><td>Stop nuisance; cooperate with investigation</td></tr>
  <tr><td>Property damage</td><td>Deposit deduction; invoice for costs exceeding deposit</td><td>Report and remedy; allow access for repair</td></tr>
  <tr><td>Failure to report disrepair</td><td>Liability for worsened damage</td><td>Report promptly with photos</td></tr>
  <tr><td>Blocked access for safety checks</td><td>Written warning; court order if necessary</td><td>Provide access on reasonable notice</td></tr>
  <tr><td>Alterations without consent</td><td>Reinstatement at tenant cost; deposit deduction</td><td>Restore to original condition</td></tr>
  <tr><td>Illegal activity</td><td>Immediate Section 8; police referral</td><td>Terminate activity; vacate if required by court</td></tr>
  <tr><td>Overcrowding / HMO breach</td><td>Warning; licensing enforcement; Section 8</td><td>Reduce occupancy to agreed limit</td></tr>
  <tr><td>Failure to return keys</td><td>Lock change costs; daily rent until returned</td><td>Return all keys on checkout day</td></tr>
  <tr><td>Abandonment with arrears</td><td>Court claim for arrears; deposit applied</td><td>Provide notice and forwarding address</td></tr>
</table>
<div class="warning"><strong>Important:</strong> The landlord must follow due process — unlawful eviction (changing locks, cutting utilities, harassment) is a criminal offence under the Protection from Eviction Act 1977. Both parties should keep written records of notices and communications.</div>

<h2>22. Deposit claims and disputes</h2>
<p>At end of tenancy, the landlord may claim from the deposit for:</p>
<ul>
  <li>Unpaid rent or permitted charges</li>
  <li>Damage beyond fair wear and tear (with check-in/out evidence)</li>
  <li>Missing items from inventory</li>
  <li>Professional cleaning if left substantially below check-in standard</li>
  <li>Outstanding utility bills only if named on account and agreed in writing</li>
</ul>
<p>The deposit scheme's <strong>alternative dispute resolution (ADR)</strong> service is free if parties cannot agree. Either party may refuse ADR and go to court. Claims without evidence (photos, inventory, invoices) often fail at ADR.</p>
<p><strong>Target return timeline:</strong> within 10 days if agreed; otherwise scheme adjudication (typically within 28 days of dispute notification).</p>

<h2>23. Complaints and dispute resolution</h2>
<p><strong>Stage 1 — Informal:</strong> contact landlord/agent at {{input:text}} to describe issue and desired outcome.</p>
<p><strong>Stage 2 — Formal written complaint:</strong> landlord should respond within {{input:text}} working days.</p>
<p><strong>Stage 3 — External:</strong> if landlord is member of property redress scheme (PRS / TPO), tenant may escalate. For deposit disputes, use scheme ADR. For disrepair, contact local council environmental health (where applicable) or seek legal advice.</p>

<h2>24. Emergency and safety information</h2>
<table>
  <tr><th>Service</th><th>Contact</th></tr>
  <tr><td>Fire / ambulance / police (emergency)</td><td>999</td></tr>
  <tr><td>Gas emergency</td><td>0800 111 999 (National Gas Emergency)</td></tr>
  <tr><td>Electric emergency</td><td>{{input:text}} (local DNO)</td></tr>
  <tr><td>Water leak (emergency)</td><td>{{input:text}}</td></tr>
  <tr><td>Landlord / agent emergency line</td><td>{{input:text}}</td></tr>
  <tr><td>Non-emergency police</td><td>101</td></tr>
</table>
<p><strong>Fire safety:</strong> know escape routes; do not obstruct fire doors; test smoke alarms weekly; report faulty alarms immediately.</p>
<p><strong>Carbon monoxide:</strong> if alarm sounds or symptoms occur (headache, dizziness), evacuate, call 999 and gas emergency line; do not re-enter until cleared.</p>

<h2>25. Miscellaneous</h2>
<ul>
  <li><strong>Entire agreement:</strong> This document, schedules, inventory, and signed addenda form the entire agreement.</li>
  <li><strong>Variation:</strong> Changes must be in writing signed by both parties.</li>
  <li><strong>Severability:</strong> Invalid clauses do not affect the remainder.</li>
  <li><strong>Notices:</strong> served by email only if agreed; otherwise use service address in clause 1.</li>
  <li><strong>Governing law:</strong> England and Wales.</li>
</ul>

<h2>26. Additional terms</h2>
<p>{{input:text}}</p>
<p>{{input:text}}</p>
<p>{{input:text}}</p>

<h2>27. Signatures</h2>
<p>The parties confirm they have read this agreement, the inventory (if any), and key information provided, and agree to be bound by its terms.</p>
<div class="sig-grid">
  ${sigBlock("Landlord", "{{signature:landlord}}")}
  ${sigBlock("Tenant", "{{signature:tenant}}")}
</div>
<p><strong>Guarantor (if applicable):</strong></p>
<div class="sig-grid">
  ${sigBlock("Guarantor", "{{signature:guarantor}}")}
  ${sigBlock("Witness", "{{signature:witness}}")}
</div>

<h2>Schedule A — Documents provided to tenant</h2>
<table>
  <tr><th>Document</th><th>Date provided</th><th>Reference / notes</th></tr>
  <tr><td>How to Rent guide (current edition)</td><td>{{input:date}}</td><td>{{input:text}}</td></tr>
  <tr><td>Deposit prescribed information</td><td>{{input:date}}</td><td>{{input:text}}</td></tr>
  <tr><td>Gas Safety Record (CP12)</td><td>{{input:date}}</td><td>{{input:text}}</td></tr>
  <tr><td>Energy Performance Certificate</td><td>{{input:date}}</td><td>{{input:text}}</td></tr>
  <tr><td>Electrical Installation Condition Report</td><td>{{input:date}}</td><td>{{input:text}}</td></tr>
  <tr><td>Inventory &amp; schedule of condition</td><td>{{input:date}}</td><td>{{input:text}}</td></tr>
  <tr><td>Right to Rent check completed</td><td>{{input:date}}</td><td>{{input:text}}</td></tr>
</table>

<h2>Schedule B — Tenant quick reference guide</h2>
<div class="guidance">
<ul>
  <li><strong>Rent due:</strong> {{dueDate}} each month — {{currency}} {{monthlyRent}} via {{payment:method}}</li>
  <li><strong>Report repairs:</strong> emergency immediately; routine within 7 days</li>
  <li><strong>Quiet hours:</strong> 23:00–07:00 — respect neighbours</li>
  <li><strong>Do not:</strong> sublet, change locks, alter property, or disable alarms without consent</li>
  <li><strong>End of tenancy:</strong> give proper notice, clean, return keys, provide forwarding address</li>
  <li><strong>Deposit return:</strong> cooperate with checkout; dispute via deposit scheme ADR if needed</li>
  <li><strong>Help:</strong> Citizens Advice, Shelter, or deposit scheme website for guidance</li>
</ul>
</div>

<h2>Schedule C — Landlord quick reference (for information)</h2>
<div class="guidance">
<ul>
  <li>Protect deposit within 30 days; serve prescribed information and How to Rent guide</li>
  <li>Annual gas safety (CP12); valid EPC; EICR where required; respond to urgent repairs</li>
  <li>Use Section 21 / Section 8 correctly — never unlawful eviction</li>
  <li>Document all warnings, inspections, and communications</li>
  <li>Deposit claims require evidence: signed inventory, dated photos, invoices</li>
</ul>
</div>

<h2>Schedule D — Property-specific rules (complete before signing)</h2>
<table>
  <tr><th>Rule area</th><th>Agreed rule</th></tr>
  <tr><td>Maximum occupants</td><td>{{input:text}}</td></tr>
  <tr><td>Guest / overnight stay limit</td><td>{{input:text}}</td></tr>
  <tr><td>Pets policy</td><td>{{input:text}}</td></tr>
  <tr><td>Smoking / vaping</td><td>{{input:text}}</td></tr>
  <tr><td>Parking / vehicles</td><td>{{input:text}}</td></tr>
  <tr><td>Garden / balcony</td><td>{{input:text}}</td></tr>
  <tr><td>Refuse / recycling days</td><td>{{input:text}}</td></tr>
  <tr><td>Cleaning standard at checkout</td><td>{{input:text}}</td></tr>
  <tr><td>Other rules</td><td>{{input:text}}</td></tr>
</table>`
  );
}

function usLease(): string {
  return wrapLibraryHtml(
    "Residential Lease Agreement",
    `${partiesBlock}
${propertyBlock}
${termRentBlock}
<div class="notice">Comply with state/local law, fair housing, and required disclosures (including lead paint pre-1978).</div>
<h2>6. Utilities</h2>
<p>Tenant pays utilities unless expressly included by landlord.</p>
<h2>7. Default</h2>
<p>Remedies follow {{propertyState}} law after proper notice.</p>
${signaturesBlock.replace("<h2>8. Signatures", "<h2>8. Signatures")}`
  );
}

function ngTenancy(): string {
  return wrapLibraryHtml(
    "Tenancy Agreement",
    `${partiesBlock}
${propertyBlock}
${termRentBlock}
<div class="notice">Nigeria residential letting. Follow applicable state registration and notice rules.</div>
<h2>6. Rent review</h2>
<p>Rent increases require written notice per applicable law.</p>
${signaturesBlock}`
  );
}

function ieTenancy(): string {
  return wrapLibraryHtml(
    "Residential Tenancy Agreement",
    `${partiesBlock}
${propertyBlock}
${termRentBlock}
<div class="notice">Ireland RTB registration and deposit limits apply where required.</div>
<h2>6. RTB</h2>
<p>Tenancy registered with RTB when required by law.</p>
${signaturesBlock}`
  );
}

export function moveInChecklist(): string {
  return wrapLibraryHtml(
    "Move-in / Move-out Checklist",
    `<p class="subtitle">{{propertyAddress}} · {{tenantFullName}} · {{currentDate}}</p>
<table class="checklist">
  <tr><th>Area</th><th>Move-in OK</th><th>Move-in notes</th><th>Move-out OK</th><th>Move-out notes</th></tr>
  <tr><td>Entrance / keys</td><td>{{input:checkbox}}</td><td>{{input:text}}</td><td>{{input:checkbox}}</td><td>{{input:text}}</td></tr>
  <tr><td>Living areas</td><td>{{input:checkbox}}</td><td>{{input:text}}</td><td>{{input:checkbox}}</td><td>{{input:text}}</td></tr>
  <tr><td>Kitchen</td><td>{{input:checkbox}}</td><td>{{input:text}}</td><td>{{input:checkbox}}</td><td>{{input:text}}</td></tr>
  <tr><td>Bathrooms</td><td>{{input:checkbox}}</td><td>{{input:text}}</td><td>{{input:checkbox}}</td><td>{{input:text}}</td></tr>
  <tr><td>Meter readings</td><td colspan="4">{{input:text}}</td></tr>
</table>
<div class="sig-grid">${sigBlock("Landlord", "{{signature:landlord}}")}${sigBlock("Tenant", "{{signature:tenant}}")}</div>`
  );
}

export function welcomeGuide(market: LibraryMarketCode): string {
  const emergency =
    market === "US" ? "911" : market === "NG" ? "112 / 767" : "999 / 112";
  return wrapLibraryHtml(
    "Tenant Welcome Guide",
    `<p class="subtitle">{{propertyName}} · {{propertyAddress}}</p>
<h2>Contacts</h2>
<p>Landlord: {{landlordName}} · {{landlordEmail}} · {{landlordPhone}}</p>
<p>Emergency contact: {{emergencyContactName}} · {{emergencyContactPhone}} · Services: ${emergency}</p>
<h2>Rent</h2>
<p>{{currency}} {{monthlyRent}} due {{dueDate}} via {{payment:method}}.</p>
<h2>Repairs</h2>
<p>Use tenant portal for routine issues; call for urgent leaks, heating loss, or security.</p>`
  );
}

export function ukAstRenewal(): string {
  return wrapLibraryHtml(
    "AST Renewal Agreement",
    `${partiesBlock}${propertyBlock}
<h2>3. Renewal</h2>
<p>Renewed term: {{leaseStartDate}} to {{leaseEndDate}} at {{currency}} {{monthlyRent}} per month.</p>
<p>Other terms of the original agreement remain in force.</p>${signaturesBlock}`
  );
}

export function holdingDeposit(): string {
  return wrapLibraryHtml(
    "Holding Deposit Agreement",
    `<p>Applicant {{tenantFullName}} pays {{currency}} {{initialDeposit}} to hold {{propertyAddress}} until {{endDate}}.</p>
<p>Refunded or applied per applicable law and referencing outcome.</p>${signaturesBlock}`
  );
}

export function guarantorDeed(): string {
  return wrapLibraryHtml(
    "Guarantor Deed",
    `<p>{{guarantorName}} guarantees {{tenantFullName}}'s tenancy at {{propertyAddress}} including rent {{currency}} {{monthlyRent}}.</p>
<p>Guarantor: {{guarantorEmail}} · {{guarantorPhone}} · Income: {{guarantorIncome}} · Employer: {{guarantorEmployer}}</p>
<div class="sig-grid">${sigBlock("Guarantor", "{{signature:guarantor}}")}${sigBlock("Landlord", "{{signature:landlord}}")}</div>`
  );
}

export function inventorySchedule(): string {
  return wrapLibraryHtml(
    "Inventory & Schedule of Condition",
    `<p>{{propertyAddress}} · {{moveInDate}}</p>
<table><tr><th>Room</th><th>Item</th><th>Condition</th><th>Notes</th></tr>
<tr><td>Living</td><td>Fixtures</td><td>{{input:text}}</td><td>{{input:text}}</td></tr>
<tr><td>Kitchen</td><td>Appliances</td><td>{{input:text}}</td><td>{{input:text}}</td></tr></table>
<div class="sig-grid">${sigBlock("Landlord", "{{signature:landlord}}")}${sigBlock("Tenant", "{{signature:tenant}}")}</div>`
  );
}

export function tenancyAddendum(): string {
  return wrapLibraryHtml(
    "Tenancy Addendum (Pets / Parking)",
    `<p>Addendum to agreement dated {{startDate}} for {{propertyAddress}}.</p>
<h3>Pets</h3><p>{{input:text}}</p>
<h3>Parking</h3><p>{{input:text}}</p>${signaturesBlock}`
  );
}

export function tenancyAgreementContent(market: LibraryMarketCode): string {
  switch (market) {
    case "UK":
      return ukAst();
    case "US":
      return usLease();
    case "NG":
      return ngTenancy();
    case "IE":
      return ieTenancy();
  }
}
