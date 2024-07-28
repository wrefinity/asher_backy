import { prismaClient } from "..";
import { MaintenanceIF } from '../validations/interfaces/maintenance.interface';

class MaintenanceService {
  protected inclusion;
  constructor() {
    this.inclusion = {
      user: true,
      vendor: true,
      property: true,
      apartment: true,
      category: true,
      subcategories: true,
      services: true,
    };
  }


  getAllMaintenances = async () => {
    return await prismaClient.maintenance.findMany({
      where: {
        isDeleted: false,
      },
      include: this.inclusion,
    });
  }
  getSpecificVendorMaintenanceJobs = async (categoryId) => {
    return await prismaClient.maintenance.findMany({
      where: {
        isDeleted: false,
        categoryId
      },
      include: this.inclusion,
    });
  }

  getMaintenanceById = async (id: string) => {
    return await prismaClient.maintenance.findUnique({
      where: { id },
      include: this.inclusion,
    });
  }

  createMaintenance = async (maintenanceData: MaintenanceIF) => {
    const { subcategoryIds, ...rest } = maintenanceData;

    if (subcategoryIds) {
      // Verify that all subcategory IDs exist
      const existingSubcategories = await prismaClient.subCategory.findMany({
        where: {
          id: { in: subcategoryIds }
        },
        select: { id: true }
      });

      const existingSubcategoryIds = existingSubcategories.map(subCategory => subCategory.id);

      if (existingSubcategoryIds.length !== subcategoryIds.length) {
        throw new Error('One or more subcategories do not exist');
      }
    }

    const createData: any = {
      ...rest,
      subcategories: subcategoryIds ? {
        connect: subcategoryIds.map(id => ({ id })),
      } : undefined,
    };

    return await prismaClient.maintenance.create({
      data: createData,
      include: this.inclusion,
    });
  }
  updateMaintenance = async (id: string, maintenanceData: Partial<MaintenanceIF>) => {
    const { subcategoryIds, ...rest } = maintenanceData;

    const updateData: any = {
      ...rest,
      subcategories: subcategoryIds ? {
        set: subcategoryIds.map(id => ({ id })),
      } : undefined,
    };

    return await prismaClient.maintenance.update({
      where: { id },
      data: updateData,
      include: this.inclusion,
    });
  }

  deleteMaintenance = async (id: string) => {
    return await prismaClient.maintenance.update({
      where: { id },
      data: { isDeleted: true },
      include: this.inclusion,
    });
  }

  isVendorAssigned = async (maintenanceId: string): Promise<boolean> => {
    const maintenance = await prismaClient.maintenance.findUnique({
      where: { id: maintenanceId },
      select: { vendorId: true },
    });

    return maintenance?.vendorId !== null;
  }
}

export default new MaintenanceService();
