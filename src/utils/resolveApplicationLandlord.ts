import { userRoles } from "@prisma/client";
import { prismaClient } from "..";

export type ApplicationLandlordUser = {
  id: string;
  email: string | null;
};

type ApplicationLandlordSource = {
  createdById?: string | null;
  createdBy?: {
    id: string;
    email?: string | null;
    role?: userRoles[] | string[] | null;
  } | null;
  properties?: {
    landlordId?: string | null;
    landlord?: {
      user?: { id: string; email?: string | null } | null;
    } | null;
  } | null;
};

function isLandlordRole(role: userRoles[] | string[] | null | undefined): boolean {
  if (!role) return false;
  return role.some((r) => String(r).includes("LANDLORD"));
}

/**
 * Resolve the property landlord's user for application events.
 * Never treat applicant `createdById` as landlord for WEB/TENANT-created apps.
 */
export async function resolveApplicationPropertyLandlordUser(
  application: ApplicationLandlordSource
): Promise<ApplicationLandlordUser | null> {
  const nested = application.properties?.landlord?.user;
  if (nested?.id) {
    return { id: nested.id, email: nested.email ?? null };
  }

  const landlordId = application.properties?.landlordId;
  if (landlordId) {
    const landlord = await prismaClient.landlords.findUnique({
      where: { id: landlordId },
      select: { user: { select: { id: true, email: true } } },
    });
    if (landlord?.user?.id) {
      return { id: landlord.user.id, email: landlord.user.email ?? null };
    }
  }

  // Only fall back when the creator is actually a landlord (landlord-initiated apps)
  if (
    application.createdBy?.id &&
    isLandlordRole(application.createdBy.role)
  ) {
    return {
      id: application.createdBy.id,
      email: application.createdBy.email ?? null,
    };
  }

  return null;
}

/** Prisma include fragment for application → property landlord user */
export const applicationPropertyLandlordInclude = {
  landlord: {
    include: {
      user: { select: { id: true, email: true, role: true } },
    },
  },
} as const;
