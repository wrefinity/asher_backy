/**
 * Postinstall helper: run verify-node-deps only when the script is present
 * (e.g. skipped during Docker layer installs before COPY . .).
 */
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const verifyScript = path.join(__dirname, 'verify-node-deps.js');

if (fs.existsSync(verifyScript)) {
  execFileSync(process.execPath, [verifyScript], { stdio: 'inherit' });
}
