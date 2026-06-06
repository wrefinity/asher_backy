import { NormalizedListing } from "./ListingNormalizer";
import {
  NormalizedViewingInvite,
  ViewingInviteNormalizer,
} from "./ViewingInviteNormalizer";
import propertyServices from "../services/propertyServices";
import {
  EnquiryLifecycle,
  formatEnquiryLifecycle,
  resolveEnquiryLifecycle,
} from "./enquiryLifecycle";
import { formatInviteStatus } from "./inviteStatusLabels";

export interface EngagementDto {
  listingId: string | null;
  propertyId: string | null;
  listing: NormalizedListing | null;
  enquiry?: {
    id: string;
    status: string | null;
    lifecycle?: EnquiryLifecycle;
    displayStatus?: string;
    createdAt: Date | string;
    message?: string;
  };
  invite?: {
    id: string;
    response: string;
    displayStatus?: string;
    scheduleDate: Date | string | null;
    reScheduleDate?: Date | string | null;
  };
  application?: {
    id: string;
    status: string;
    stepCompleted?: number | null;
  };
}

export class EngagementNormalizer {
  static fromNormalizedInvite(invite: NormalizedViewingInvite): EngagementDto {
    const listingId =
      invite.propertyListingId ||
      (invite.listing as { id?: string } | null)?.id ||
      null;
    const propertyId =
      invite.propertiesId ||
      invite.properties?.id ||
      invite.listing?.property?.id ||
      null;

    const dto: EngagementDto = {
      listingId,
      propertyId,
      listing: invite.listing,
      invite: {
        id: invite.id,
        response: invite.response,
        displayStatus: formatInviteStatus(invite.response, "tenant"),
        scheduleDate: invite.scheduleDate,
        reScheduleDate: invite.reScheduleDate ?? null,
      },
    };

    if (invite.enquiryId && invite.enquires) {
      const enquiryStatus = invite.enquires.status ?? null;
      const lifecycle = resolveEnquiryLifecycle(
        enquiryStatus,
        invite.response
      );
      dto.enquiry = {
        id: invite.enquiryId,
        status: enquiryStatus,
        lifecycle,
        displayStatus: formatEnquiryLifecycle(lifecycle),
        createdAt: invite.enquires.createdAt,
        message: invite.enquires.events,
      };
    }

    if (invite.application) {
      dto.application = {
        id: invite.application.id,
        status: invite.application.status,
        stepCompleted: invite.application.stepCompleted ?? null,
      };
    }

    return dto;
  }

  static fromNormalizedInvitesMany(
    invites: NormalizedViewingInvite[]
  ): EngagementDto[] {
    return invites.map((invite) => this.fromNormalizedInvite(invite));
  }

  static async fromInvite(raw: unknown): Promise<EngagementDto> {
    const normalized = await ViewingInviteNormalizer.normalize(raw);
    return this.fromNormalizedInvite(normalized);
  }

  static async fromEnquiry(raw: any): Promise<EngagementDto> {
    const invite = raw.applicationInvites?.[0] ?? null;

    if (invite) {
      return this.fromInvite({
        ...invite,
        enquires: raw,
        enquiryId: raw.id,
      });
    }

    const listingId =
      raw.propertyListingId || raw.propertyListing?.id || null;
    const propertyId = raw.propertyId || null;
    let listing: NormalizedListing | null = null;

    if (listingId) {
      try {
        listing =
          await propertyServices.getPropertyListingByListingIdNew(listingId);
      } catch {
        listing = null;
      }
    }

    const enquiryStatus = raw.status ?? null;
    const lifecycle = resolveEnquiryLifecycle(enquiryStatus, null);

    return {
      listingId,
      propertyId: propertyId || listing?.property?.id || null,
      listing,
      enquiry: {
        id: raw.id,
        status: enquiryStatus,
        lifecycle,
        displayStatus: formatEnquiryLifecycle(lifecycle),
        createdAt: raw.createdAt,
        message: raw.events,
      },
    };
  }

  static fromApplicationRecord(
    application: {
      id: string;
      status: string;
      stepCompleted?: number | null;
      propertyListingId?: string | null;
    },
    normalizedInvite: NormalizedViewingInvite | null
  ): EngagementDto {
    if (normalizedInvite) {
      const dto = this.fromNormalizedInvite(normalizedInvite);
      if (application.propertyListingId) {
        dto.listingId = application.propertyListingId;
      }
      dto.application = {
        id: application.id,
        status: application.status,
        stepCompleted: application.stepCompleted ?? null,
      };
      return dto;
    }

    return {
      listingId: application.propertyListingId ?? null,
      propertyId: null,
      listing: null,
      application: {
        id: application.id,
        status: application.status,
        stepCompleted: application.stepCompleted ?? null,
      },
    };
  }

  static fromApplicationRecordsMany(
    applications: Array<{
      id: string;
      status: string;
      stepCompleted?: number | null;
      propertyListingId?: string | null;
      engagement?: EngagementDto;
    }>
  ): EngagementDto[] {
    const seen = new Set<string>();
    const results: EngagementDto[] = [];

    for (const application of applications) {
      if (application.engagement && !seen.has(application.id)) {
        seen.add(application.id);
        results.push(application.engagement);
      }
    }

    return results;
  }

  static async fromEnquiriesMany(raw: any[]): Promise<EngagementDto[]> {
    if (!raw?.length) return [];

    const BATCH_SIZE = 5;
    const results: EngagementDto[] = [];

    for (let i = 0; i < raw.length; i += BATCH_SIZE) {
      const batch = raw.slice(i, i + BATCH_SIZE);
      const batchResults = await Promise.all(
        batch.map((enquiry) =>
          this.fromEnquiry(enquiry).catch((error) => {
            console.warn("Failed to normalize enquiry engagement:", error);
            return null;
          })
        )
      );
      results.push(...batchResults.filter(Boolean) as EngagementDto[]);
    }

    return results;
  }
}
