import { prismaClient } from "..";
import { ConflictError, NotFoundError } from "./error.service";


class StateService {
  public async getAllState(){
    return await prismaClient.state.findMany({where:{isDeleted:false}});
  }

  public async getStateById(id: string){
    return await prismaClient.state.findUnique({ where: { id } });
  }

  public async getStateByName(name: string, landlordId?: string) {
    // Try to find the state by name (case-insensitive)
    let state = await prismaClient.state.findFirst({
      where: {
        name: {
          equals: name,
          mode: 'insensitive',
        },
        isDeleted: false,
      },
    });

    // If the state doesn't exist, create it (optionally tied to the requesting landlord)
    if (!state) {
      state = await prismaClient.state.create({
        data: {
          name: name,
          ...(landlordId ? { createdByLandlordId: landlordId } : {}),
        },
      });
    }
    return state;
  }

  /**
   * Fetch every non-deleted state created by a specific landlord.
   * This includes states that currently have zero properties (empty locations).
   */
  public async getStatesByLandlord(landlordId: string) {
    return await prismaClient.state.findMany({
      where: {
        createdByLandlordId: landlordId,
        isDeleted: false,
      },
    });
  }

  /**
   * A state this landlord already uses (properties) or created as an empty location,
   * with the same name and country (case-insensitive). Blocks duplicate rows/modals.
   */
  public async findConflictingStateForLandlord(
    name: string,
    landlordId: string | null,
    country?: string | null
  ) {
    if (!landlordId) return null;
    const trimmedName = name?.trim();
    if (!trimmedName) return null;
    const hasCountry = country != null && String(country).trim() !== '';
    return prismaClient.state.findFirst({
      where: {
        name: { equals: trimmedName, mode: 'insensitive' },
        isDeleted: false,
        ...(hasCountry
          ? { country: { equals: String(country).trim(), mode: 'insensitive' } }
          : { OR: [{ country: null }, { country: '' }] }),
        OR: [
          { createdByLandlordId: landlordId },
          {
            properties: {
              some: { landlordId, isDeleted: false },
            },
          },
        ],
      },
    });
  }

  public async createState(name: string, country?: string | null, landlordId?: string | null) {
    return await prismaClient.state.create({
      data: {
        name,
        ...(country != null && country !== '' ? { country } : {}),
        ...(landlordId ? { createdByLandlordId: landlordId } : {}),
      },
    });
  }

  public async updateState(id: string, name:string){
    return await prismaClient.state.update({
      where: { id, isDeleted:false },
      data: {name},
    });
  }

  /**
   * Soft-delete a landlord location and cascade: unlist + remove all of their
   * properties at this state (units, rooms, listing history, likes, enquiries).
   * Shared state rows are kept when other landlords still use them.
   */
  public async deleteLocationForLandlord(stateId: string, landlordId: string) {
    const state = await prismaClient.state.findFirst({
      where: { id: stateId, isDeleted: false },
    });
    if (!state) {
      throw new NotFoundError("Location not found");
    }

    const landlordPropertyCount = await prismaClient.properties.count({
      where: { stateId, landlordId, isDeleted: false },
    });
    const canAccess =
      state.createdByLandlordId === landlordId || landlordPropertyCount > 0;
    if (!canAccess) {
      throw new ConflictError("You do not have permission to delete this location");
    }

    const properties = await prismaClient.properties.findMany({
      where: { stateId, landlordId, isDeleted: false },
      select: { id: true },
    });
    const propertyIds = properties.map((p) => p.id);

    const otherLandlordPropertyCount = await prismaClient.properties.count({
      where: {
        stateId,
        landlordId: { not: landlordId },
        isDeleted: false,
      },
    });

    return await prismaClient.$transaction(async (tx) => {
      let unlistedCount = 0;
      let terminatedTenancyCount = 0;

      if (propertyIds.length > 0) {
        const tenancyResult = await tx.tenants.updateMany({
          where: {
            propertyId: { in: propertyIds },
            landlordId,
            isCurrentLease: true,
          },
          data: {
            isCurrentLease: false,
            leaseEndDate: new Date(),
          },
        });
        terminatedTenancyCount = tenancyResult.count;

        const listingResult = await tx.propertyListingHistory.updateMany({
          where: {
            propertyId: { in: propertyIds },
            OR: [{ onListing: true }, { isActive: true }],
          },
          data: {
            onListing: false,
            isActive: false,
            availableTo: new Date(),
          },
        });
        unlistedCount = listingResult.count;

        const specs = await tx.propertySpecification.findMany({
          where: { propertyId: { in: propertyIds } },
          select: { residentialId: true, commercialId: true, shortletId: true },
        });
        const residentialIds = specs
          .map((s) => s.residentialId)
          .filter((id): id is string => Boolean(id));
        const commercialIds = specs
          .map((s) => s.commercialId)
          .filter((id): id is string => Boolean(id));
        const shortletIds = specs
          .map((s) => s.shortletId)
          .filter((id): id is string => Boolean(id));

        const unitOr: Array<Record<string, unknown>> = [];
        if (residentialIds.length) {
          unitOr.push({ residentialPropertyId: { in: residentialIds } });
        }
        if (commercialIds.length) {
          unitOr.push({ commercialPropertyId: { in: commercialIds } });
        }
        const roomOr: Array<Record<string, unknown>> = [];
        if (residentialIds.length) {
          roomOr.push({ residentialPropertyId: { in: residentialIds } });
        }
        if (commercialIds.length) {
          roomOr.push({ commercialPropertyId: { in: commercialIds } });
        }
        if (shortletIds.length) {
          roomOr.push({ shortletPropertyId: { in: shortletIds } });
        }

        let unitIds: string[] = [];
        let roomIds: string[] = [];
        if (unitOr.length) {
          const units = await tx.unitConfiguration.findMany({
            where: { OR: unitOr },
            select: { id: true },
          });
          unitIds = units.map((u) => u.id);
          await tx.unitConfiguration.updateMany({
            where: { OR: unitOr },
            data: { isListed: false, isDeleted: true },
          });
        }
        if (roomOr.length) {
          const rooms = await tx.roomDetail.findMany({
            where: { OR: roomOr },
            select: { id: true },
          });
          roomIds = rooms.map((r) => r.id);
          await tx.roomDetail.updateMany({
            where: { OR: roomOr },
            data: { isListed: false, isDeleted: true },
          });
        }

        await tx.userLikedProperty.deleteMany({
          where: { propertyId: { in: propertyIds } },
        });
        const enquiryOr: Array<Record<string, unknown>> = [
          { propertyId: { in: propertyIds } },
        ];
        if (unitIds.length) {
          enquiryOr.push({ unitId: { in: unitIds } });
        }
        if (roomIds.length) {
          enquiryOr.push({ roomId: { in: roomIds } });
        }
        await tx.propertyEnquiry.deleteMany({
          where: { OR: enquiryOr },
        });
        await tx.properties.updateMany({
          where: { id: { in: propertyIds }, landlordId },
          data: { isDeleted: true, isListed: false },
        });
      }

      const shouldSoftDeleteState = otherLandlordPropertyCount === 0;

      if (shouldSoftDeleteState) {
        await tx.state.update({
          where: { id: stateId },
          data: { isDeleted: true, createdByLandlordId: null },
        });
      } else if (state.createdByLandlordId === landlordId) {
        // Shared state row — detach this landlord so empty location cards disappear.
        await tx.state.update({
          where: { id: stateId },
          data: { createdByLandlordId: null },
        });
      }

      return {
        stateId,
        deletedPropertyCount: propertyIds.length,
        unlistedCount,
        terminatedTenancyCount,
        stateRemoved: shouldSoftDeleteState,
      };
    });
  }

  /** @deprecated Use deleteLocationForLandlord — kept for admin-only callers if needed */
  public async deleteState(id: string) {
    return await prismaClient.state.update({
      where: { id },
      data: { isDeleted: true },
    });
  }
}

export default new StateService();