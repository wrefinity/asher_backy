const PLACEHOLDER_PROPERTY_IDS = new Set([
  'YOUR_PROPERTY_ID',
  'REPLACE_WITH_PROPERTY_ID',
  'YOUR-PROPERTY-ID',
]);

export const isPlaceholderPropertyId = (propertyId?: string | null): boolean => {
  if (!propertyId?.trim()) return true;
  return PLACEHOLDER_PROPERTY_IDS.has(propertyId.trim().toUpperCase());
};

export const PROPERTY_ID_NOT_FOUND_MESSAGE =
  'Property ID not found in your portfolio. Open a property in the app and copy its ID from the property page or URL.';

export const PROPERTY_ID_PLACEHOLDER_MESSAGE =
  'Property ID is required. Replace the template placeholder with a real property ID from your Properties list.';

/** Map Prisma / server errors to landlord-friendly bulk upload messages. */
export function humanizeTenantBulkUploadError(err: unknown): string {
  const message =
    err instanceof Error ? err.message : String(err ?? 'Unknown error');

  if (isPlaceholderPropertyId(message)) {
    return PROPERTY_ID_PLACEHOLDER_MESSAGE;
  }

  if (
    /propertiesTotenants/i.test(message) ||
    /no 'properties' record/i.test(message) ||
    /required but not found/i.test(message)
  ) {
    return PROPERTY_ID_NOT_FOUND_MESSAGE;
  }

  if (/unknown argument `invited`/i.test(message)) {
    return 'Could not save tenant application details. Please try again or contact support if this continues.';
  }

  if (/landlord not found/i.test(message)) {
    return 'Your landlord account could not be found. Please log out and log in again.';
  }

  if (/user already exists/i.test(message)) {
    return 'An account with this email already exists. Use a different email or link the existing tenant from the property page.';
  }

  if (/property is required/i.test(message)) {
    return PROPERTY_ID_PLACEHOLDER_MESSAGE;
  }

  const prismaNoise = message.match(
    /An operation failed because[\s\S]*$/i
  )?.[0];
  if (prismaNoise) {
    if (/properties/i.test(prismaNoise)) {
      return PROPERTY_ID_NOT_FOUND_MESSAGE;
    }
    return prismaNoise.charAt(0).toUpperCase() + prismaNoise.slice(1);
  }

  return message.replace(/^Unexpected error:\s*/i, '').trim() || message;
}
