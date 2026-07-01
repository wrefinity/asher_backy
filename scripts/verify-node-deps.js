/**
 * Repairs known empty stub files in node_modules (sync/copy corruption).
 * Run automatically via postinstall.
 */
const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "..");

const REPAIRS = [
  {
    rel: "node_modules/cloudinary/cloudinary.js",
    content: "module.exports = require('./lib/cloudinary');\n",
    validate: (text) => !text.includes("lib/cloudinary"),
  },
  {
    rel: "node_modules/lodash/extend.js",
    content: "module.exports = require('./assignIn');\n",
    validate: (text) => !text.includes("assignIn"),
  },
];

for (const { rel, content, validate } of REPAIRS) {
  const file = path.join(ROOT, rel);
  if (!fs.existsSync(file)) continue;

  const existing = fs.readFileSync(file, "utf8");
  if (!existing.trim() || validate(existing)) {
    fs.writeFileSync(file, content, "utf8");
    console.log(`[postinstall] Repaired ${rel}`);
  }
}

// Verify cloudinary can load after repairs
try {
  const extend = require("lodash/extend");
  if (typeof extend !== "function") {
    console.warn("[postinstall] lodash/extend still broken after repair");
  }
  const { v2 } = require("cloudinary");
  if (!v2 || typeof v2.config !== "function") {
    console.warn("[postinstall] cloudinary v2 still broken — run: rm -rf node_modules && npm install");
  }
} catch (error) {
  console.warn("[postinstall] Dependency verification failed:", error.message);
}
