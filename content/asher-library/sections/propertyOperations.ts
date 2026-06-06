import { wrapLibraryHtml } from "../shared/htmlWrapper";

export function maintenanceResponse(): string {
  return wrapLibraryHtml(
    "Maintenance Request Response",
    `<p>Date: {{currentDate}}</p>
<p>Dear {{firstName}},</p>
<p>Thank you for reporting a maintenance issue at <strong>{{propertyAddress}}</strong>.</p>
<p><strong>Reference:</strong> {{referenceNumber}}</p>
<p><strong>Issue summary:</strong> {{input:text}}</p>
<p><strong>Next steps:</strong> We will arrange inspection within {{input:text}} business days. For emergencies (flooding, no heating, security), call {{landlordPhone}} or {{emergencyContactPhone}} immediately.</p>
<p>Kind regards,<br />{{landlordName}}</p>`
  );
}

export function handoverReport(): string {
  return wrapLibraryHtml(
    "Property Handover Report",
    `<p class="subtitle">{{propertyAddress}} · {{currentDate}}</p>
<h2>Condition summary</h2>
<p>{{input:text}}</p>
<h2>Utilities &amp; meters</h2>
<table><tr><th>Utility</th><th>Supplier</th><th>Reading</th><th>Account</th></tr>
<tr><td>Electric</td><td>{{input:text}}</td><td>{{input:text}}</td><td>{{input:text}}</td></tr>
<tr><td>Gas</td><td>{{input:text}}</td><td>{{input:text}}</td><td>{{input:text}}</td></tr>
<tr><td>Water</td><td>{{input:text}}</td><td>{{input:text}}</td><td>{{input:text}}</td></tr></table>
<h2>Warranties &amp; manuals</h2>
<p>{{input:text}}</p>`
  );
}

export function vendorChecklist(): string {
  return wrapLibraryHtml(
    "Vendor Onboarding Checklist",
    `<table class="checklist">
<tr><th>Requirement</th><th>Received</th><th>Notes</th></tr>
<tr><td>Public liability insurance</td><td>{{input:checkbox}}</td><td>{{input:text}}</td></tr>
<tr><td>Employer liability (if applicable)</td><td>{{input:checkbox}}</td><td>{{input:text}}</td></tr>
<tr><td>Photo ID / company registration</td><td>{{input:checkbox}}</td><td>{{input:text}}</td></tr>
<tr><td>Bank details &amp; VAT/tax ID</td><td>{{input:checkbox}}</td><td>{{input:text}}</td></tr>
<tr><td>Health &amp; safety policy</td><td>{{input:checkbox}}</td><td>{{input:text}}</td></tr>
<tr><td>Emergency contact</td><td>{{input:checkbox}}</td><td>{{input:text}}</td></tr></table>`
  );
}
