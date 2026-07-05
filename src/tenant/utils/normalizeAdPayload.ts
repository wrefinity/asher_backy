type JsonRecord = Record<string, unknown>;

function parseJsonField<T = JsonRecord>(value: unknown): T | undefined {
  if (value == null || value === "") return undefined;
  if (typeof value === "object") return value as T;
  if (typeof value !== "string") return undefined;
  try {
    return JSON.parse(value) as T;
  } catch {
    return undefined;
  }
}

function parseBoolean(value: unknown, fallback = false): boolean {
  if (typeof value === "boolean") return value;
  if (value === "true") return true;
  if (value === "false") return false;
  return fallback;
}

function parseNumber(value: unknown, fallback = 0): number {
  const parsed = typeof value === "number" ? value : parseFloat(String(value ?? ""));
  return Number.isFinite(parsed) ? parsed : fallback;
}

function parseString(value: unknown): string {
  return typeof value === "string" ? value.trim() : value != null ? String(value).trim() : "";
}

function buildLocations(body: JsonRecord): string[] {
  if (Array.isArray(body.locations)) {
    return body.locations.map((entry) => parseString(entry)).filter(Boolean);
  }

  const locations: string[] = [];
  const city = parseString(body.city);
  const stateName = parseString(body.state ?? body.stateName);
  const userCity = parseString(body.userCity);
  const userState = parseString(body.userState);
  const locationMode = parseString(body.locationMode) || "current";

  if (locationMode === "current") {
    if (userCity) locations.push(userCity);
    if (userState) locations.push(userState);
  } else if (locationMode === "city") {
    if (city) locations.push(city);
    if (stateName) locations.push(stateName);
  } else if (locationMode === "state") {
    if (stateName) locations.push(stateName);
  }

  if (locations.length === 0) {
    if (city) locations.push(city);
    if (stateName) locations.push(stateName);
    if (userCity) locations.push(userCity);
    if (userState) locations.push(userState);
  }

  return Array.from(new Set(locations));
}

export function normalizeAdCreatePayload(rawBody: JsonRecord) {
  const body: JsonRecord = { ...rawBody };

  if (typeof body.bussinessDetails === "string") {
    body.bussinessDetails = parseJsonField(body.bussinessDetails);
  }

  const socialLinks =
    parseJsonField(body.socialLinks) ??
    (typeof body.bussinessDetails === "object" && body.bussinessDetails
      ? (body.bussinessDetails as JsonRecord).socialLinks
      : undefined);

  const duration = Math.max(1, parseInt(String(body.duration ?? body.adDuration ?? "1"), 10) || 1);
  const startedDate = body.startedDate ? new Date(String(body.startedDate)) : new Date();
  const endDate = body.endDate
    ? new Date(String(body.endDate))
    : new Date(startedDate.getTime() + duration * 24 * 60 * 60 * 1000);

  const title = parseString(body.title);
  const description = parseString(body.description);
  const phoneNumber = parseString(body.phoneNumber);
  const email = parseString(body.email);
  const address = parseString(body.address);

  const existingDetails =
    typeof body.bussinessDetails === "object" && body.bussinessDetails
      ? (body.bussinessDetails as JsonRecord)
      : {};

  const bussinessDetails = {
    bussinessName: parseString(existingDetails.bussinessName) || title || "Ad",
    bussinessDescription:
      parseString(existingDetails.bussinessDescription) || description || title,
    bussinessEmail: parseString(existingDetails.bussinessEmail) || email || undefined,
    bussinessPhone: parseString(existingDetails.bussinessPhone) || phoneNumber || undefined,
    bussinessWebsite: parseString(existingDetails.bussinessWebsite) || undefined,
    phoneNumber: phoneNumber || undefined,
    email: email || undefined,
    address: address || undefined,
    socialLinks: socialLinks || undefined,
    isPremiumBanner: parseBoolean(
      existingDetails.isPremiumBanner ?? body.isPremiumBanner,
      false
    ),
    duration,
    radius: parseNumber(body.radius, 10),
    locationMode: parseString(body.locationMode) || "current",
    latitude: body.latitude != null ? parseNumber(body.latitude) : undefined,
    longitude: body.longitude != null ? parseNumber(body.longitude) : undefined,
    marketCountry:
      parseString(existingDetails.marketCountry) ||
      parseString(body.marketCountry) ||
      undefined,
  };

  const locations = buildLocations(body);
  const amountPaid = parseNumber(body.amountPaid ?? body.price, 0);
  const currency = parseString(body.currency).toUpperCase() || "NGN";
  const contactInfo =
    parseString(body.contactInfo) || email || phoneNumber || address || title;

  return {
    title,
    description,
    currency,
    startedDate: startedDate.toISOString(),
    endDate: endDate.toISOString(),
    locations,
    bussinessDetails,
    contactInfo,
    amountPaid,
    isListed: body.isListed === false || body.isListed === "false" ? false : true,
    cloudinaryUrls: body.cloudinaryUrls,
    cloudinaryVideoUrls: body.cloudinaryVideoUrls,
    cloudinaryDocumentUrls: body.cloudinaryDocumentUrls,
    cloudinaryAudioUrls: body.cloudinaryAudioUrls,
  };
}
