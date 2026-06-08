export interface EnquiryChatCardData {
  __asherEnquiryCard: true;
  enquiryId: string;
  propertyListingId: string;
  propertyId: string;
  propertyName: string;
  imageUrl?: string | null;
  city?: string | null;
  country?: string | null;
  events?: string | null;
  createdAt?: string | null;
}

export function buildEnquiryChatCardContent(
  data: Omit<EnquiryChatCardData, "__asherEnquiryCard">
): string {
  return JSON.stringify({ __asherEnquiryCard: true, ...data });
}

export function parseEnquiryChatCard(
  content: string | null | undefined
): EnquiryChatCardData | null {
  if (!content?.trim()) return null;
  try {
    const parsed = JSON.parse(content);
    if (parsed?.__asherEnquiryCard === true && parsed.enquiryId) {
      return parsed as EnquiryChatCardData;
    }
  } catch {
    // Not JSON enquiry card content
  }
  return null;
}
