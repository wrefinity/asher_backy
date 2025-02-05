import { TransactionReference, maintenanceStatus, chatType, TransactionStatus } from "@prisma/client";
import { prismaClient } from "..";
import { MaintenanceIF, RescheduleMaintenanceDTO } from '../validations/interfaces/maintenance.interface';
import transferServices from "./transfer.services";
import walletService from "./wallet.service";



class MaintenanceService {
  protected inclusion;
  constructor() {
    this.inclusion = {
      tenant: true,
      landlord: true,
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

  rescheduleMaintenance = async (data: RescheduleMaintenanceDTO) => {
    const { maintenanceId, scheduleDate } = data;
    const maintenance = await this.getMaintenanceById(maintenanceId);

    if (!maintenance) {
      throw new Error('Maintenance request not found');
    }
    // Check if reScheduleMax is greater than zero before proceeding
    if (maintenance.reScheduleMax <= 0) {
      throw new Error('Maximum reschedules reached, cannot reschedule further');
    }
    // Add to reschedule history
    await prismaClient.maintenanceRescheduleHistory.create({
      data: {
        maintenanceId,
        oldDate: maintenance.scheduleDate,
        newDate: scheduleDate,
      },
    });

    // Update maintenance with new schedule date and increment counter
    return await prismaClient.maintenance.update({
      where: { id: maintenanceId },
      data: {
        reScheduleDate: scheduleDate,
        reScheduleMax: { decrement: maintenance.reScheduleMax > 0 ? 1 : 0 },
      },
    });
  }

  createMaintenance = async (maintenanceData: MaintenanceIF) => {
    const { subcategoryIds, tenantId, landlordId, serviceId, categoryId, propertyId, ...rest } = maintenanceData;
    // Remove duplicates
    let subcategoryIdsUnique = [...new Set(subcategoryIds)];
    if (subcategoryIds) {
      // Verify that all subcategory IDs exist
      const existingSubcategories = await prismaClient.subCategory.findMany({
        where: {
          id: { in: subcategoryIdsUnique }
        },
        select: { id: true }
      });

      const existingSubcategoryIds = existingSubcategories.map(subCategory => subCategory.id);
      // console.log("++++catgpri+++")
      // console.log(existingSubcategoryIds)
      // console.log(subcategoryIds)
      if (existingSubcategoryIds.length !== subcategoryIdsUnique.length) {
        throw new Error('One or more subcategories do not exist');
      }
    }

    const createData: any = {
      ...rest, paymentStatus: "PENDING",
      landlordDecision: "PENDING",
      subcategories: subcategoryIdsUnique ? {
        connect: subcategoryIdsUnique.map(id => ({ id })),
      } : undefined,
      category: {
        connect: { id: categoryId },
      },
      services: serviceId
        ? {
          connect: { id: serviceId },
        }
        : undefined,
      tenant: tenantId
        ? {
          connect: { id: tenantId },
        }
        : undefined,
      landlord: landlordId
        ? {
          connect: { id: landlordId },
        }
        : undefined,
      property: propertyId
        ? {
          connect: { id: propertyId },
        }
        : undefined,
    }

    return await prismaClient.maintenance.create({
      data: createData,
      include: this.inclusion,
    });
  }

  createMaintenanceChat = async (maintenanceId: string, senderId: string, receiverId: string, initialMessage: string) => {
    try {
      // Check if a chat room already exists for this maintenance request
      let chatRoom = await prismaClient.chatRoom.findFirst({
        where: {
          AND: [
            { user1Id: senderId },
            { user2Id: receiverId },
          ],
        },
      });

      // If no chat room exists, create one
      if (!chatRoom) {
        chatRoom = await prismaClient.chatRoom.create({
          data: {
            user1Id: senderId,
            user2Id: receiverId,
          },
        });
      }

      // Associate the chat room with the maintenance request
      await prismaClient.maintenance.update({
        where: { id: maintenanceId },
        data: { chatRoomId: chatRoom.id },
      });

      // Add the initial message to the chat room
      const message = await prismaClient.message.create({
        data: {
          content: initialMessage,
          senderId: senderId,
          receiverId: receiverId,
          chatRoomId: chatRoom.id,
          chatType: chatType.MAINTENANCE,
        },
      });

      console.log("Chat room created and message sent.");
      return { chatRoom, message };
    } catch (error) {
      console.error("Error creating maintenance chat:", error.message);
      throw error;
    }
  }
  getMaintenanceChat = async (maintenanceId: string) => {
    const chatRoom = await prismaClient.chatRoom.findUnique({
      where: { maintenanceId },
      include: {
        messages: {
          where: { chatType: 'MAINTENANCE' },
          orderBy: { createdAt: 'asc' }
        }
      }
    });
    return chatRoom?.messages || [];
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

  checkWhitelist = async (landlordId: string, categoryId: string, subcategoryId?: string, propertyId?: string, apartmentId?: string, isActive: boolean = true) => {
    return await prismaClient.maintenanceWhitelist.findFirst({
      where: {
        landlordId,
        categoryId,
        isActive,
        subcategoryId: subcategoryId ? subcategoryId : undefined,
        propertyId: propertyId ? propertyId : undefined,
        apartmentId: apartmentId ? apartmentId : undefined,
      },
    });
  }

  processPayment = async (maintenanceId: string, amount: number, userId: string, receiverId: string, currency: string) => {

    // Deduct amount from user's wallet -> Also add transaction type to track expenses
    await transferServices.transferFunds(userId, { receiverId, amount, reference: TransactionReference.MAINTENANCE_FEE, description: `Payment for maintenance #${maintenanceId}` }, currency);

    // Update maintenance record to reflect payment
    return await prismaClient.maintenance.update({
      where: { id: maintenanceId },
      data: {
        paymentStatus: TransactionStatus.COMPLETED,
        amount
      }
    });
  }

  getPropertyMaintenance = async (propertyId: string) => {
    return await prismaClient.maintenance.findMany({
      where: { propertyId },
      include: this.inclusion,
    });
  }

  // Fetch vendors for a property based on their maintenance services
  getVendorsForPropertyMaintenance = async (propertyId: string) => {
    try {
      const maintenanceRecords = await prismaClient.maintenance.findMany({
        where: {
          propertyId: propertyId,
          isDeleted: false, // Ensure you are not fetching deleted records
        },
        include: {
          services: {
            include: {
              vendor: {
                include: {
                  user: {
                    select: {
                      id: true,           // Include user ID
                      email: true,        // Include email
                      role: true,         // Include roles
                      profileId: true,    // Include profile ID
                      profile: true
                    }
                  }
                }
              },  // Get the vendor attached to the service
            },
          },
        },
      });

      // Extracting vendors associated with the maintenance services
      const vendors = maintenanceRecords.map((record) => {
        if (record.services && record.services.vendor) {
          return record.services.vendor;
        }
        return null;
      }).filter(Boolean); // Filter out null values

      return vendors;
    } catch (error) {
      throw new Error('Error fetching vendors for property maintenance');
    }
  }








}



export default new MaintenanceService();
