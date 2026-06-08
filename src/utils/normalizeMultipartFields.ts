/** Multer sends a single field as a string; multiple as an array. Joi often expects arrays. */
export function ensureStringArray(value: unknown): string[] {
  if (value == null || value === '') return [];
  if (Array.isArray(value)) {
    return value.map(item => String(item).trim()).filter(Boolean);
  }
  if (typeof value === 'string') {
    return value
      .split(',')
      .map(item => item.trim())
      .filter(Boolean);
  }
  return [String(value).trim()].filter(Boolean);
}

export function normalizeCategoryMultipartBody(
  body: Record<string, unknown>
): Record<string, unknown> {
  return {
    ...body,
    labels: ensureStringArray(body.labels),
  };
}
