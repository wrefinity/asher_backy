import { prismaClient } from "..";


class StateService {
  public async getAllState(){
    return await prismaClient.state.findMany({where:{isDeleted:false}});
  }

  public async getStateById(id: string){
    return await prismaClient.state.findUnique({ where: { id } });
  }

  public async getStateByName(name: string) {
    // Try to find the state by name (case-insensitive)
    let state = await prismaClient.state.findFirst({
      where: {
        name: {
          equals: name,
          mode: 'insensitive',
        },
      },
    });

    // If the state doesn't exist, create it
    if (!state) {
      state = await prismaClient.state.create({
        data: {
          name: name,
        },
      });
    }
    return state;
  }

  public async createState(name: string){
    return await prismaClient.state.create({
      data: {name},
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