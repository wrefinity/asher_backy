/** Short codes used in documentName routing metadata, e.g. [templates:tenant-onboarding:UK] */

export type LibraryMarketCode = "UK" | "NG" | "US" | "IE";

export const LIBRARY_MARKET_CODES: LibraryMarketCode[] = ["UK", "NG", "US", "IE"];

export const LIBRARY_MARKET_LABELS: Record<LibraryMarketCode, string> = {
  UK: "United Kingdom",
  NG: "Nigeria",
  US: "United States",
  IE: "Ireland",
};

export function marketCodeFromCountry(country?: string | null): LibraryMarketCode | null {
  if (!country?.trim()) return null;
  const normalized = country.trim().toLowerCase();

  if (["uk", "united kingdom", "great britain", "england", "scotland", "wales", "northern ireland"].includes(normalized)) {
    return "UK";
  }
  if (normalized === "nigeria") return "NG";
  if (["us", "usa", "united states", "united states of america"].includes(normalized)) {
    return "US";
  }
  if (["ireland", "republic of ireland"].includes(normalized)) return "IE";

  return null;
}
