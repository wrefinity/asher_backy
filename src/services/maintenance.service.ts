import { prismaClient } from "..";
import { MaintenanceIF } from '../validations/interfaces/maintenance.interface';


class MaintenanceService {
  protected inclusion;
  constructor() {
    this.inclusion = {
      user: true,
      property: true,
      apartment: true,
      category: true,
      subcategories: true,
      status: true,
      services: true,
    }
  }
  getAllMaintenances = async () => {
    return await prismaClient.maintenance.findMany({
      where: {
        isDeleted: false,
      },
      include:this.inclusion,
    });
  }

  getMaintenanceById = async (id: string) =>{
    return await prismaClient.maintenance.findUnique({ where: { id }, include:this.inclusion, });
  }

  createMaintenance = async (maintenanceData: MaintenanceIF)=>{
    const { subcategoryIds, ...rest } = maintenanceData;
    return await prismaClient.maintenance.create({
      data: {
        ...rest,
        subcategories: {
          connect: subcategoryIds.map(id => ({ id })),
        },
      },
      include:this.inclusion,
    });
  }

  updateMaintenance = async (id: string, maintenanceData: Partial<MaintenanceIF>) =>{
    return await prismaClient.maintenance.update({
      where: { id },
      data: maintenanceData,
      include:this.inclusion,
    });
  }

  deleteMaintenance = async (id: string) =>{
    return await prismaClient.maintenance.update({ where: { id }, data: { isDeleted: true }, include:this.inclusion });
  }
}

export default MaintenanceService;
