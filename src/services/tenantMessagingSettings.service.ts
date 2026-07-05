import { prismaClient } from "..";
import messagingCircleService from "./messagingCircle.service";

class TenantMessagingSettingsService {
  async getCurrentTenant(userId: string) {
    return prismaClient.tenants.findFirst({
      where: { userId, isDeleted: false, isCurrentLease: true },
      orderBy: { updatedAt: "desc" },
      include: {
        property: { select: { id: true, name: true, city: true, stateId: true } },
        landlord: {
          select: {
            id: true,
            user: {
              select: {
                id: true,
                email: true,
                profile: { select: { fullname: true, firstName: true, lastName: true } },
              },
            },
          },
        },
      },
    });
  }

  async getSettings(userId: string) {
    const tenant = await this.getCurrentTenant(userId);
    if (!tenant) {
      return {
        visibleToNeighborTenants: false,
        landlordContact: null,
        sharedContacts: [] as Array<{ userId: string; name: string }>,
        discoverableTenants: [] as Array<{ userId: string; name: string }>,
      };
    }

    const landlordUser = tenant.landlord?.user;
    const landlordContact = landlordUser
      ? {
          userId: landlordUser.id,
          name:
            landlordUser.profile?.fullname ||
            [landlordUser.profile?.firstName, landlordUser.profile?.lastName]
              .filter(Boolean)
              .join(" ") ||
            "Landlord",
          email: landlordUser.email,
        }
      : null;

    const [shares, discoverable] = await Promise.all([
      prismaClient.tenantMessagingShare.findMany({
        where: { ownerUserId: userId, landlordId: tenant.landlordId },
        select: { peerUserId: true },
      }),
      messagingCircleService.getContacts(userId),
    ]);

    const sharedUserIds = shares.map((s) => s.peerUserId);
    const sharedProfiles =
      sharedUserIds.length > 0
        ? await prismaClient.users.findMany({
            where: { id: { in: sharedUserIds } },
            select: {
              id: true,
              email: true,
              profile: { select: { fullname: true, firstName: true, lastName: true } },
            },
          })
        : [];

    return {
      visibleToNeighborTenants: tenant.visibleToNeighborTenants,
      landlordContact,
      sharedContacts: sharedProfiles.map((user) => ({
        userId: user.id,
        name:
          user.profile?.fullname ||
          [user.profile?.firstName, user.profile?.lastName].filter(Boolean).join(" ") ||
          user.email.split("@")[0],
      })),
      discoverableTenants: discoverable
        .filter(
          (c) =>
            c.relationship === "tenant" && !sharedUserIds.includes(c.userId)
        )
        .map((c) => ({ userId: c.userId, name: c.name })),
      property: tenant.property,
    };
  }

  async updateVisibility(userId: string, visibleToNeighborTenants: boolean) {
    const tenant = await this.getCurrentTenant(userId);
    if (!tenant) throw new Error("Active tenant record not found");

    return prismaClient.tenants.update({
      where: { id: tenant.id },
      data: { visibleToNeighborTenants },
      select: { id: true, visibleToNeighborTenants: true },
    });
  }

  async shareContact(userId: string, peerUserId: string) {
    if (userId === peerUserId) throw new Error("Cannot share contact with yourself");

    const tenant = await this.getCurrentTenant(userId);
    if (!tenant) throw new Error("Active tenant record not found");

    const peer = await prismaClient.tenants.findFirst({
      where: {
        userId: peerUserId,
        landlordId: tenant.landlordId,
        isDeleted: false,
      },
    });
    if (!peer) throw new Error("Tenant not found");

    const inCircle = await messagingCircleService.canCommunicate(userId, peerUserId);
    if (!inCircle) {
      throw new Error("This tenant is not available to share with");
    }

    return prismaClient.tenantMessagingShare.upsert({
      where: {
        ownerUserId_peerUserId_landlordId: {
          ownerUserId: userId,
          peerUserId,
          landlordId: tenant.landlordId,
        },
      },
      create: {
        ownerUserId: userId,
        peerUserId,
        landlordId: tenant.landlordId,
      },
      update: {},
    });
  }

  async removeShare(userId: string, peerUserId: string) {
    const tenant = await this.getCurrentTenant(userId);
    if (!tenant) throw new Error("Active tenant record not found");

    await prismaClient.tenantMessagingShare.deleteMany({
      where: {
        ownerUserId: userId,
        peerUserId,
        landlordId: tenant.landlordId,
      },
    });
  }
}

export default new TenantMessagingSettingsService();
