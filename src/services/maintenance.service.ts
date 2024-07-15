import { prismaClient } from "..";
import { MaintenanceIF } from '../interfaces/maintenance.interface';



class MaintenanceService {
  public async getAllMaintenances(): Promise<MaintenanceIF[]> {
    return await prismaClient.maintenance.findMany({ include: { status: true } });
  }

  public async getMaintenanceById(id: string): Promise<MaintenanceIF | null> {
    return await prismaClient.maintenance.findUnique({ where: { id }, include: { status: true } });
  }

  public async createMaintenance(maintenanceData: MaintenanceIF): Promise<MaintenanceIF> {
    return await prismaClient.maintenance.create({
      data: maintenanceData,
      include: { status: true },
    });
  }

  public async updateMaintenance(id: string, maintenanceData: Partial<MaintenanceIF>): Promise<MaintenanceIF> {
    return await prismaClient.maintenance.update({
      where: { id },
      data: maintenanceData,
      include: { status: true },
    });
  }

  public async deleteMaintenance(id: string): Promise<MaintenanceIF> {
    return await prismaClient.maintenance.update({ where: { id }, data:{ isDeleted:true} });
  }
}

export default MaintenanceService;
