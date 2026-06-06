#!/usr/bin/env bash
# Verify tenant engagement chain for a web user (enquiry → invite → application → tenant).
# Usage: ./scripts/verify-tenant-engagement.sh <email> <password> [base_url]

set -euo pipefail

EMAIL="${1:?email required}"
PASSWORD="${2:?password required}"
BASE="${3:-http://localhost:9000}"

login_json=$(curl -s -X POST "$BASE/api/auth/login" \
  -H 'Content-Type: application/json' \
  -d "{\"email\":\"$EMAIL\",\"password\":\"$PASSWORD\"}")

TOKEN=$(node -e "
  const j = JSON.parse(process.argv[1]);
  const d = j.data?.data ?? j.data ?? j;
  process.stdout.write(d.token ?? d.accessToken ?? '');
" "$login_json")

if [ -z "$TOKEN" ]; then
  echo "Login failed:" >&2
  echo "$login_json" >&2
  exit 1
fi

auth=(-H "Authorization: Bearer $TOKEN")

echo "=== Enquiries (displayStatus + lifecycle) ==="
curl -s "$BASE/api/properties/property/user/enquiries" "${auth[@]}" | node -e "
  const j = JSON.parse(require('fs').readFileSync(0,'utf8'));
  const sample = j.pipeline?.[0] ?? j.enquiries?.[0] ?? j.closed?.[0];
  console.log(JSON.stringify({
    open: j.enquiries?.length ?? 0,
    pipeline: j.pipeline?.length ?? 0,
    closed: j.closed?.length ?? 0,
    sampleInvite: sample?.invite ? {
      id: sample.invite.id,
      response: sample.invite.response,
      displayStatus: sample.invite.displayStatus,
    } : null,
    sampleEnquiry: sample?.enquiry ? {
      lifecycle: sample.enquiry.lifecycle,
      displayStatus: sample.enquiry.displayStatus,
    } : null,
  }, null, 2));
"

echo ""
echo "=== Applications ==="
curl -s "$BASE/api/webuser/applications" "${auth[@]}" 2>/dev/null | node -e "
  let raw = '';
  process.stdin.on('data', c => raw += c);
  process.stdin.on('end', () => {
    try {
      const j = JSON.parse(raw);
      const apps = j.data?.data ?? j.data ?? j.applications ?? [];
      const list = Array.isArray(apps) ? apps : [];
      console.log('count:', list.length);
      if (list[0]) {
        console.log('first:', { id: list[0].id, status: list[0].status, propertyListingId: list[0].propertyListingId });
      }
    } catch { console.log(raw.slice(0, 300)); }
  });
" || echo "(applications endpoint may differ)"

echo ""
echo "=== Tenant record ==="
curl -s "$BASE/api/webuser/profile" "${auth[@]}" 2>/dev/null | node -e "
  let raw = '';
  process.stdin.on('data', c => raw += c);
  process.stdin.on('end', () => {
    try {
      const j = JSON.parse(raw);
      const u = j.data?.data ?? j.data ?? j;
      const tenant = u.tenants ?? u.tenant;
      console.log('tenant:', tenant ? 'yes' : 'no');
    } catch { console.log('profile check skipped'); }
  });
" || echo "(profile endpoint may differ)"

echo ""
echo "Done. Tenant E2E complete when: invite displayStatus is human-readable, application exists, tenant record present."
