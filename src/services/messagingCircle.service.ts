import { LogType, userRoles } from "@prisma/client";
import { prismaClient } from "..";

export type MessagingRelationship =
  | "landlord"
  | "tenant"
  | "applicant"
  | "enquirer";

export interface MessagingContact {
  userId: string;
  name: string;
  email: string;
  mailboxEmail: string;
  profileUrl: string | null;
  relationship: MessagingRelationship;
  landlordId: string;
}

const profileSelect = {
  fullname: true,
  firstName: true,
  lastName: true,
  profileUrl: true,
} as const;

function displayName(profile?: {
  fullname?: string | null;
  firstName?: string | null;
  lastName?: string | null;
} | null, fallbackEmail?: string): string {
  if (profile?.fullname?.trim()) return profile.fullname.trim();
  const parts = [profile?.firstName, profile?.lastName].filter(Boolean);
  if (parts.length) return parts.join(" ").trim();
  if (fallbackEmail) return fallbackEmail.split("@")[0];
  return "Unknown";
}

class MessagingCircleService {
  async isAdmin(userId: string): Promise<boolean> {
    const user = await prismaClient.users.findUnique({
      where: { id: userId },
      select: { role: true },
    });
    return !!user?.role?.includes(userRoles.ADMIN);
  }

  /**
   * Landlord record ids this user belongs to (as landlord, tenant, applicant, or enquirer).
   */
  async getLandlordCircleIds(userId: string): Promise<string[]> {
    const ids = new Set<string>();

    const asLandlord = await prismaClient.landlords.findUnique({
      where: { userId },
      select: { id: true },
    });
    if (asLandlord) ids.add(asLandlord.id);

    const tenantRows = await prismaClient.tenants.findMany({
      where: { userId },
      select: { landlordId: true },
    });
    tenantRows.forEach((t) => ids.add(t.landlordId));

    const enquiries = await prismaClient.log.findMany({
      where: { createdById: userId, type: LogType.ENQUIRED },
      select: {
        property: { select: { landlordId: true } },
        propertyListing: {
          select: { property: { select: { landlordId: true } } },
        },
      },
    });
    enquiries.forEach((e) => {
      const landlordId =
        e.property?.landlordId ?? e.propertyListing?.property?.landlordId;
      if (landlordId) ids.add(landlordId);
    });

    const applications = await prismaClient.application.findMany({
      where: { userId, isDeleted: false },
      select: {
        properties: { select: { landlordId: true } },
        propertyListing: {
          select: { property: { select: { landlordId: true } } },
        },
      },
    });
    applications.forEach((a) => {
      const landlordId =
        a.properties?.landlordId ?? a.propertyListing?.property?.landlordId;
      if (landlordId) ids.add(landlordId);
    });

    const invites = await prismaClient.applicationInvites.findMany({
      where: { userInvitedId: userId, isDeleted: false },
      select: { invitedByLandordId: true },
    });
    invites.forEach((i) => {
      if (i.invitedByLandordId) ids.add(i.invitedByLandordId);
    });

    return Array.from(ids);
  }

  /**
   * Preferred in-app mailbox address for a user (tenant portal email when applicable).
   */
  async resolveMailboxEmail(
    userId: string,
    tenantRecordId?: string | null
  ): Promise<string> {
    if (tenantRecordId) {
      const tenant = await prismaClient.tenants.findUnique({
        where: { id: tenantRecordId },
        select: { tenantWebUserEmail: true, userId: true },
      });
      if (tenant?.userId === userId && tenant.tenantWebUserEmail) {
        return tenant.tenantWebUserEmail;
      }
    }

    const tenant = await prismaClient.tenants.findFirst({
      where: { userId, isCurrentLease: true },
      orderBy: { updatedAt: "desc" },
      select: { tenantWebUserEmail: true },
    });
    if (tenant?.tenantWebUserEmail) return tenant.tenantWebUserEmail;

    const user = await prismaClient.users.findUnique({
      where: { id: userId },
      select: { email: true },
    });
    if (!user) throw new Error("User not found");
    return user.email;
  }

  /**
   * Mailbox + login email for addressing a contact in the circle.
   */
  async resolveMailboxEmailForUser(userId: string): Promise<string> {
    return this.resolveMailboxEmail(userId);
  }

  private async collectContactsForLandlord(
    landlordId: string,
    viewerUserId: string
  ): Promise<Map<string, MessagingContact>> {
    const map = new Map<string, MessagingContact>();

    const landlord = await prismaClient.landlords.findUnique({
      where: { id: landlordId },
      include: {
        user: { select: { id: true, email: true, profile: { select: profileSelect } } },
      },
    });

    if (landlord?.user && landlord.user.id !== viewerUserId) {
      map.set(landlord.user.id, {
        userId: landlord.user.id,
        name: displayName(landlord.user.profile, landlord.user.email),
        email: landlord.user.email,
        mailboxEmail: landlord.user.email,
        profileUrl: landlord.user.profile?.profileUrl ?? null,
        relationship: "landlord",
        landlordId,
      });
    }

    const tenants = await prismaClient.tenants.findMany({
      where: { landlordId },
      include: {
        user: { select: { id: true, email: true, profile: { select: profileSelect } } },
      },
    });

    for (const t of tenants) {
      if (!t.user || t.user.id === viewerUserId) continue;
      const mailbox = t.tenantWebUserEmail || t.user.email;
      map.set(t.user.id, {
        userId: t.user.id,
        name: displayName(t.user.profile, mailbox),
        email: t.user.email,
        mailboxEmail: mailbox,
        profileUrl: t.user.profile?.profileUrl ?? null,
        relationship: "tenant",
        landlordId,
      });
    }

    const propertyIds = await prismaClient.properties.findMany({
      where: { landlordId },
      select: { id: true },
    });
    const propIds = propertyIds.map((p) => p.id);

    if (propIds.length) {
      const applications = await prismaClient.application.findMany({
        where: {
          isDeleted: false,
          userId: { not: null },
          OR: [
            { propertiesId: { in: propIds } },
            { propertyListing: { property: { landlordId } } },
          ],
        },
        include: {
          user: { select: { id: true, email: true, profile: { select: profileSelect } } },
        },
      });

      for (const app of applications) {
        if (!app.user || app.user.id === viewerUserId) continue;
        const mailbox = await this.resolveMailboxEmail(app.user.id);
        map.set(app.user.id, {
          userId: app.user.id,
          name: displayName(app.user.profile, app.user.email),
          email: app.user.email,
          mailboxEmail: mailbox,
          profileUrl: app.user.profile?.profileUrl ?? null,
          relationship: "applicant",
          landlordId,
        });
      }

      const enquiries = await prismaClient.log.findMany({
        where: {
          type: LogType.ENQUIRED,
          createdById: { not: null },
          OR: [
            { propertyId: { in: propIds } },
            { propertyListing: { property: { landlordId } } },
          ],
        },
        include: {
          users: { select: { id: true, email: true, profile: { select: profileSelect } } },
        },
      });

      for (const enq of enquiries) {
        if (!enq.users || enq.users.id === viewerUserId) continue;
        if (map.has(enq.users.id)) continue;
        const mailbox = await this.resolveMailboxEmail(enq.users.id);
        map.set(enq.users.id, {
          userId: enq.users.id,
          name: displayName(enq.users.profile, enq.users.email),
          email: enq.users.email,
          mailboxEmail: mailbox,
          profileUrl: enq.users.profile?.profileUrl ?? null,
          relationship: "enquirer",
          landlordId,
        });
      }
    }

    const invites = await prismaClient.applicationInvites.findMany({
      where: {
        invitedByLandordId: landlordId,
        isDeleted: false,
        userInvitedId: { not: null },
      },
      include: {
        userInvited: {
          select: { id: true, email: true, profile: { select: profileSelect } },
        },
      },
    });

    for (const inv of invites) {
      if (!inv.userInvited || inv.userInvited.id === viewerUserId) continue;
      if (map.has(inv.userInvited.id)) continue;
      const mailbox = await this.resolveMailboxEmail(inv.userInvited.id);
      map.set(inv.userInvited.id, {
        userId: inv.userInvited.id,
        name: displayName(inv.userInvited.profile, inv.userInvited.email),
        email: inv.userInvited.email,
        mailboxEmail: mailbox,
        profileUrl: inv.userInvited.profile?.profileUrl ?? null,
        relationship: "applicant",
        landlordId,
      });
    }

    return map;
  }

  async getCircleUserIds(viewerUserId: string): Promise<Set<string>> {
    if (await this.isAdmin(viewerUserId)) {
      const all = await prismaClient.users.findMany({ select: { id: true } });
      return new Set(all.map((u) => u.id));
    }

    const landlordIds = await this.getLandlordCircleIds(viewerUserId);
    const ids = new Set<string>();

    for (const landlordId of landlordIds) {
      const contacts = await this.collectContactsForLandlord(landlordId, viewerUserId);
      contacts.forEach((_, userId) => ids.add(userId));
    }

    return ids;
  }

  async getContacts(
    viewerUserId: string,
    search = ""
  ): Promise<MessagingContact[]> {
    if (await this.isAdmin(viewerUserId)) {
      const q = search.trim().toLowerCase();
      const users = await prismaClient.users.findMany({
        where: q
          ? {
              OR: [
                { email: { contains: q, mode: "insensitive" } },
                { profile: { fullname: { contains: q, mode: "insensitive" } } },
                { profile: { firstName: { contains: q, mode: "insensitive" } } },
                { profile: { lastName: { contains: q, mode: "insensitive" } } },
              ],
            }
          : undefined,
        take: 50,
        include: { profile: { select: profileSelect } },
      });

      const results: MessagingContact[] = [];
      for (const u of users) {
        if (u.id === viewerUserId) continue;
        const mailbox = await this.resolveMailboxEmail(u.id);
        results.push({
          userId: u.id,
          name: displayName(u.profile, u.email),
          email: u.email,
          mailboxEmail: mailbox,
          profileUrl: u.profile?.profileUrl ?? null,
          relationship: "tenant",
          landlordId: "",
        });
      }
      return results;
    }

    const landlordIds = await this.getLandlordCircleIds(viewerUserId);
    const merged = new Map<string, MessagingContact>();

    for (const landlordId of landlordIds) {
      const contacts = await this.collectContactsForLandlord(landlordId, viewerUserId);
      contacts.forEach((c, id) => merged.set(id, c));
    }

    let list = Array.from(merged.values());

    const q = search.trim().toLowerCase();
    if (q) {
      list = list.filter(
        (c) =>
          c.name.toLowerCase().includes(q) ||
          c.email.toLowerCase().includes(q) ||
          c.mailboxEmail.toLowerCase().includes(q)
      );
    }

    return list.sort((a, b) => a.name.localeCompare(b.name));
  }

  /**
   * Invisible gate: returns false when recipient should not exist for the sender.
   */
  async canCommunicate(senderId: string, receiverId: string): Promise<boolean> {
    if (senderId === receiverId) return false;
    if (await this.isAdmin(senderId)) return true;

    const circle = await this.getCircleUserIds(senderId);
    return circle.has(receiverId);
  }

  /**
   * Resolve a recipient user id within the sender's messaging circle.
   */
  async resolveReceiverById(
    senderId: string,
    receiverId: string
  ): Promise<{ userId: string; mailboxEmail: string } | null> {
    const trimmedId = receiverId.trim();
    if (!trimmedId) return null;

    const user = await prismaClient.users.findUnique({
      where: { id: trimmedId },
      select: { id: true },
    });
    if (!user) return null;

    if (!(await this.canCommunicate(senderId, user.id))) return null;

    const mailboxEmail = await this.resolveMailboxEmail(user.id);
    return { userId: user.id, mailboxEmail };
  }

  /**
   * Resolve contact by mailbox/login email within sender's circle only.
   */
  async resolveContactInCircle(
    senderId: string,
    email: string
  ): Promise<{ userId: string; mailboxEmail: string } | null> {
    const normalized = email.trim().toLowerCase();
    if (!normalized) return null;

    const user = await prismaClient.users.findFirst({
      where: { email: { equals: normalized, mode: "insensitive" } },
      select: { id: true },
    });

    if (user) {
      if (!(await this.canCommunicate(senderId, user.id))) return null;
      const mailboxEmail = await this.resolveMailboxEmail(user.id);
      return { userId: user.id, mailboxEmail };
    }

    const tenant = await prismaClient.tenants.findFirst({
      where: { tenantWebUserEmail: { equals: normalized, mode: "insensitive" } },
      select: { userId: true },
    });

    if (!tenant?.userId) return null;
    if (!(await this.canCommunicate(senderId, tenant.userId))) return null;

    const mailboxEmail = await this.resolveMailboxEmail(tenant.userId);
    return { userId: tenant.userId, mailboxEmail };
  }
}

export default new MessagingCircleService();
