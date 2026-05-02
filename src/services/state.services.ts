import { prismaClient } from "..";


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

  public async deleteState(id: string){
    return await prismaClient.state.update({ 
        where: { id },
        data: {isDeleted: true},
    });
  }
}

export default new StateService();