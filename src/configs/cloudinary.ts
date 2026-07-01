/**
 * Guard against corrupted node_modules where lodash/extend.js is an empty stub.
 * Cloudinary's config() depends on lodash/extend at runtime.
 */
// eslint-disable-next-line @typescript-eslint/no-require-imports
const assignIn = require("lodash/assignIn");
// eslint-disable-next-line @typescript-eslint/no-require-imports
const lodashExtend = require("lodash/extend");
if (typeof lodashExtend !== "function") {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  require.cache[require.resolve("lodash/extend")].exports = assignIn;
}

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { v2: cloudinary } = require("cloudinary");
import { CLOUDINARY_NAME, CLOUDINARY_API_KEY, CLOUDINARY_SECRET } from "../secrets";

cloudinary.config({
  cloud_name: CLOUDINARY_NAME,
  api_key: CLOUDINARY_API_KEY,
  api_secret: CLOUDINARY_SECRET,
});

export default cloudinary;
