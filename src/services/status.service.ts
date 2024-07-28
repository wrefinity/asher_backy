import { prismaClient } from "..";


class StatusService {
  public async getAllStatuses(){
    return await prismaClient.status.findMany({where:{isDeleted:false}});
  }

  public async getStatusById(id: string){
    return await prismaClient.status.findUnique({ where: { id } });
  }

  public async createStatus(name: string){
    return await prismaClient.status.create({
      data: {name},
    });
  }

  public async updateStatus(id: string, name:string){
    return await prismaClient.status.update({
      where: { id, isDeleted:false },
      data: {name},
    });
  }

  public async deleteStatus(id: string){
    return await prismaClient.status.update({ 
        where: { id },
        data: {isDeleted:true},
    });
  }
}

export default StatusService;