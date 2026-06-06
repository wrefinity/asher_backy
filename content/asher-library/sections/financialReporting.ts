import { wrapLibraryHtml } from "../shared/htmlWrapper";

export function cashFlowTemplate(): string {
  return wrapLibraryHtml(
    "Monthly Property Cash Flow",
    `<p class="subtitle">{{propertyName}} · {{propertyAddress}} · Period: {{input:text}}</p>
<table>
<tr><th>Item</th><th>Amount ({{currency}})</th></tr>
<tr><td>Rent received</td><td>{{bill:monthlyRent}}</td></tr>
<tr><td>Other income</td><td>{{input:text}}</td></tr>
<tr><td>Maintenance</td><td>{{input:text}}</td></tr>
<tr><td>Insurance</td><td>{{input:text}}</td></tr>
<tr><td>Management fees</td><td>{{input:text}}</td></tr>
<tr><td><strong>Net cash flow</strong></td><td>{{bill:total}}</td></tr></table>`
  );
}

export function depositLedger(): string {
  return wrapLibraryHtml(
    "Tenant Deposit Ledger",
    `<p>Tenant: {{tenantFullName}} · Property: {{propertyAddress}} · Application: {{applicationId}}</p>
<table>
<tr><th>Date</th><th>Description</th><th>Debit</th><th>Credit</th><th>Balance</th></tr>
<tr><td>{{moveInDate}}</td><td>Deposit received</td><td></td><td>{{securityDeposit}}</td><td>{{securityDeposit}}</td></tr>
<tr><td>{{input:date}}</td><td>{{input:text}}</td><td>{{input:text}}</td><td>{{input:text}}</td><td>{{input:text}}</td></tr></table>`
  );
}

export function expenseReimbursement(): string {
  return wrapLibraryHtml(
    "Expense Reimbursement Form",
    `<p>Submitted by: {{input:text}} · Date: {{currentDate}} · Property: {{propertyAddress}}</p>
<table>
<tr><th>Description</th><th>Amount</th><th>Receipt attached</th></tr>
<tr><td>{{input:text}}</td><td>{{currency}} {{input:text}}</td><td>{{input:checkbox}}</td></tr></table>
<p>Total claim: {{currency}} {{bill:total}}</p>
<p>Approved by: {{signature:landlord}}</p>`
  );
}
