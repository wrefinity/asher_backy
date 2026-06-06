export function wrapLibraryHtml(title: string, body: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escapeHtml(title)}</title>
  <style>
    body { font-family: Georgia, "Times New Roman", serif; font-size: 12pt; line-height: 1.55; color: #111; max-width: 820px; margin: 0 auto; padding: 28px 32px; }
    h1 { font-size: 20pt; text-align: center; margin: 0 0 6px; }
    h2 { font-size: 13pt; margin: 22px 0 8px; border-bottom: 1px solid #ccc; padding-bottom: 4px; }
    h3 { font-size: 12pt; margin: 16px 0 6px; }
    p, li { margin: 8px 0; }
    ul, ol { margin: 8px 0 8px 22px; }
    .subtitle { text-align: center; color: #555; font-size: 10pt; margin-bottom: 24px; }
    table { width: 100%; border-collapse: collapse; margin: 12px 0; font-size: 11pt; }
    td, th { border: 1px solid #bbb; padding: 8px; vertical-align: top; }
    th { background: #f7f7f7; text-align: left; }
    .sig-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 28px; margin-top: 28px; }
    .sig-line { border-top: 1px solid #111; margin-top: 48px; padding-top: 6px; font-size: 10pt; }
    .notice { background: #fafafa; border-left: 4px solid #8b0029; padding: 10px 14px; margin: 14px 0; font-size: 11pt; }
    .guidance { background: #f0f7ff; border-left: 4px solid #2563eb; padding: 10px 14px; margin: 14px 0; font-size: 11pt; }
    .warning { background: #fff8f0; border-left: 4px solid #c2410c; padding: 10px 14px; margin: 14px 0; font-size: 11pt; }
    .rules-box { background: #fafafa; border: 1px solid #ddd; border-radius: 4px; padding: 12px 16px; margin: 12px 0; }
    .checklist td:first-child { width: 28px; text-align: center; }
    .violation-table td:first-child { width: 28%; font-weight: 600; }
  </style>
</head>
<body>
  <h1>${escapeHtml(title)}</h1>
  ${body}
</body>
</html>`;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function sigBlock(label: string, tag: string): string {
  return `<div class="sig-line"><strong>${label}</strong><br />${tag}<br />Date: {{currentDate}}</div>`;
}
