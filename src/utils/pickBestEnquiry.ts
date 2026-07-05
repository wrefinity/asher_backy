/** Pick the highest matchScore enquiry; tie-break by newest createdAt. */
export function pickBestEnquiry<
  T extends { matchScore?: number | null; createdAt: Date | string },
>(enquiries: T[]): T | undefined {
  if (!enquiries.length) return undefined;
  return [...enquiries].sort((a, b) => {
    const scoreDiff = (b.matchScore ?? 0) - (a.matchScore ?? 0);
    if (scoreDiff !== 0) return scoreDiff;
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  })[0];
}
