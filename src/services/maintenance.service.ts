import { TransactionReference, maintenanceStatus, chatType, TransactionStatus, Currency, properties, UnitConfiguration, RoomDetail, Prisma } from "@prisma/client";
import { prismaClient } from "..";
import { MaintenanceIF, RescheduleMaintenanceDTO } from '../validations/interfaces/maintenance.interface';
import transferServices from "./transfer.services";
import ServiceServices from "../vendor/services/vendor.services";
import { subDays, addDays, isBefore, isAfter, isToday } from 'date-fns';
import { ApiError } from "../utils/ApiError";
import propertyServices from "./propertyServices";

type SearchResult =
  | { type: "property"; data: properties }
  | { type: "unit"; data: UnitConfiguration }
  | { type: "room"; data: RoomDetail };

class MaintenanceService {
  protected inclusion;
  constructor() {
    this.inclusion = {
      tenant: {
        include: {
          user: {
            include: {
              profile: true // Populate user profile
            }
          },
          property: {
            include: {
              landlord: {
                include: {
                  user: {
                    include: {
                      profile: true // Populate landlord user profile
                    }
                  }
                }
              },
              state: true,
              agency: true,
              agents: {
                include: {
                  user: {
                    include: {
                      profile: true // Populate agent user profile
                    }
                  }
                }
              }
            }
          },
          unit: {
            include: {
              ResidentialProperty: true,
              CommercialProperty: true,
              images: true
            }
          },
          room: {
            include: {
              ResidentialProperty: true,
              CommercialProperty: true,
              ShortletProperty: true,
              unit: true,
              images: true
            }
          },
          agent: {
            include: {
              user: {
                include: {
                  profile: true // Populate agent user profile
                }
              }
            }
          },
          application: true
        }
      },
      MaintenanceQuote: {
        include: {
          vendor: {
            include: {
              user: {
                include: {
                  profile: true
                }
              },
              services: true
            }
          }
        }
      },
      maintenanceStatusHistory:
        { include: { vendor: true } },
      landlord: {
        include: {
          user: {
            include: {
              profile: true
            }
          }
        }
      },
      vendor: {
        include: {
          user: {
            include: {
              profile: true // Populate vendor user profile
            }
          },
          services: true
        }
      },
      property: {
        include: {
          landlord: {
            include: {
              user: {
                include: {
                  profile: true
                }
              }
            }
          },
          state: true,
          agency: true,
          agents: {
            include: {
              user: {
                include: {
                  profile: true
                }
              }
            }
          },
          images: true,
          videos: true,
          specification: true
        }
      },
      units: {
        include: {
          ResidentialProperty: true,
          CommercialProperty: true,
          images: true,
          RoomDetail: {
            include: {
              images: true,
              ResidentialProperty: true,
              CommercialProperty: true,
              ShortletProperty: true
            }
          }
        }
      },
      rooms: {
        include: {
          ResidentialProperty: true,
          CommercialProperty: true,
          ShortletProperty: true,
          unit: {
            include: {
              ResidentialProperty: true,
              CommercialProperty: true,
              images: true
            }
          },
          images: true
        }
      },
      category: {
        include: {
          subCategory: true
        }
      },
      subcategories: {
        include: {
          category: true
        }
      },
      services: {
        include: {
          vendor: {
            include: {
              user: {
                include: {
                  profile: true
                }
              }
            }
          },
          category: true,
          subcategory: true,
          tenant: {
            include: {
              user: {
                include: {
                  profile: true
                }
              }
            }
          }
        }
      },
      chatRoom: {
        include: {
          user1: {
            include: {
              profile: true
            }
          },
          user2: {
            include: {
              profile: true
            }
          },
          messages: {
            include: {
              sender: {
                include: {
                  profile: true
                }
              },
              receiver: {
                include: {
                  profile: true
                }
              }
            }
          }
        }
      },
      reScheduleHistory: true
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

  getVendorServicesCategories = async (vendorId: string) => {
    // Get vendor’s services (and extract categories/subcategories)
    const vendorServices = await ServiceServices.getVendorServices(vendorId);
    const vendorCategoryIds = vendorServices.map((s) => s.categoryId);
    const vendorSubcategoryIds = vendorServices
      .map((s) => s.subcategoryId)
      .filter(Boolean);

    return { vendorCategoryIds, vendorSubcategoryIds };
  }


  /**
    * Get maintenance requests available for a specific vendor,
    * filtered by category/subcategory, status, search, and date range.
    */
  async getSpecificVendorMaintenanceRequest(
    vendorId: string,
    filter: {
      status?: maintenanceStatus;
      search?: string;
      limit?: number;
      page?: number;
      state?: string;
      sortBy?: string;
      sortOrder?: "asc" | "desc";
      startDate?: Date;
      endDate?: Date;
    }
  ) {
    const {
      status,
      search,
      limit = 10,
      page = 1,
      state,
      sortBy = "createdAt",
      sortOrder = "desc",
      startDate,
      endDate,
    } = filter;

    // pagination
    const skip = (page - 1) * limit;

    // Get vendor’s services (and extract categories/subcategories)
    const vendorServices = await ServiceServices.getVendorServices(vendorId);
    const vendorCategoryIds = vendorServices.map((s) => s.categoryId);
    const vendorSubcategoryIds = vendorServices
      .map((s) => s.subcategoryId)
      .filter(Boolean);

    // Base where clause
    const where: any = {
      isDeleted: false,
      OR: [
        { categoryId: { in: vendorCategoryIds } },
        ...(vendorSubcategoryIds.length > 0
          ? [
            {
              subcategories: {
                some: { id: { in: vendorSubcategoryIds } },
              },
            },
          ]
          : []),
      ],
    };

    // Filter by status
    if (status) {
      where.status = status;
    }

    // Filter by property state if provided
    if (state) {
      where.property = { state };
    }

    // Filter by date range
    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = new Date(startDate);
      if (endDate) where.createdAt.lte = new Date(endDate);
    }

    // Filter by search (description or property name)
    if (search) {
      where.OR = [
        ...where.OR,
        {
          description: {
            contains: search,
            mode: "insensitive" as const,
          },
        },
        {
          property: {
            name: {
              contains: search,
              mode: "insensitive" as const,
            },
          },
        },
      ];
    }

    // Sorting logic
    let orderBy: any = {};
    if (sortBy === "property") {
      orderBy = { property: { name: sortOrder } };
    } else if (sortBy === "category") {
      orderBy = { category: { name: sortOrder } };
    } else if (sortBy === "scheduleDate") {
      orderBy = { scheduleDate: sortOrder };
    } else {
      orderBy = { [sortBy]: sortOrder };
    }

    // Execute queries
    const [data, total] = await Promise.all([
      prismaClient.maintenance.findMany({
        where,
        skip,
        take: limit,
        orderBy,
        include: this.inclusion,
      }),
      prismaClient.maintenance.count({ where }),
    ]);

    const totalPages = Math.ceil(total / limit);

    return {
      data,
      meta: {
        page,
        limit,
        total,
        totalPages,
        hasNext: page < totalPages,
        hasPrevious: page > 1,
      },
    };
  }

  async getVendorsMaintenanceStates(vendorId: string, state: maintenanceStatus[], limit: number, page: number) {
    // Check if propertyId corresponds
    const assignments = await prismaClient.maintenanceAssignmentHistory.findMany({
      where: {
        vendorId,
        state: { in: state },
      },
      orderBy: { assignedAt: "desc" },

      include: {
        maintenance: true
      },
    });
    // pagination
    const skip = (page - 1) * limit;
    const maintenanceIds = Array.from(new Set(assignments.map(a => a.maintenanceId)));
    // Execute queries
    const [data, total] = await Promise.all([
      prismaClient.maintenance.findMany({
        where: { id: { in: maintenanceIds } },
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
        include: this.inclusion,
      }),
      prismaClient.maintenance.count({ where: { id: { in: maintenanceIds } } }),
    ]);

    const totalPages = Math.ceil(total / limit) || 1;
    return { data, meta: { page, limit, total, totalPages } };
  }


  getMaintenanceById = async (id: string) => {
    return await prismaClient.maintenance.findUnique({
      where: { id, isDeleted: false },
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

  // Main maintenance creation
  createMaintenance = async (maintenanceData: MaintenanceIF) => {
    const { subcategoryIds, tenantId, landlordId, serviceId, categoryId, propertyId, ...rest } = maintenanceData;

    // Validate subcategories
    if (subcategoryIds?.length) {
      const subcategoryIdsUnique = [...new Set(subcategoryIds)];
      const existingSubcategories = await prismaClient.subCategory.findMany({
        where: { id: { in: subcategoryIdsUnique } },
        select: { id: true }
      });
      if (existingSubcategories.length !== subcategoryIdsUnique.length) {
        throw new Error("One or more subcategories do not exist");
      }
    }

    // Detect whether it's a property, unit, or room
    const detected = await this.searchPropertyUnitRoomForMaintenace(propertyId);

    // Build payload
    const maintenancePayload: any = {
      ...rest,
      tenantId: tenantId || undefined,
      landlordId: landlordId || undefined,
      serviceId,
      categoryId,
      subcategories: subcategoryIds
        ? { connect: subcategoryIds.map(id => ({ id })) }
        : undefined,
    };

    switch (detected.type) {
      case "property":
        maintenancePayload.propertyId = detected.data.id;
        break;
      case "unit":
        maintenancePayload.unitId = detected.data.id;
        // maintenancePayload.propertyId = detected.data.propertyId; // parent link
        break;
      case "room":
        maintenancePayload.roomId = detected.data.id;
        maintenancePayload.unitId = detected.data.unitId;
        // maintenancePayload.propertyId = detected.data.propertyId; // full chain
        break;
    }

    // Create maintenance request
    return prismaClient.maintenance.create({ data: maintenancePayload });
  };


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


  unassignVendorFromMaintenance = async (maintenanceId: string, reason?: string) => {
    const maintenance = await prismaClient.maintenance.findFirst({
      where: {
        id: maintenanceId,
        isDeleted: false,
      },
      include: {
        vendor: true,
      },
    });

    if (!maintenance) {
      throw new Error('Maintenance request not found');
    }

    if (!maintenance.vendorId) {
      throw new Error('No vendor assigned to this maintenance');
    }

    return await prismaClient.$transaction(async (tx) => {
      // Update maintenance
      const updatedMaintenance = await tx.maintenance.update({
        where: { id: maintenanceId },
        data: {
          vendorId: null,
          status: maintenanceStatus.UNASSIGNED,
          serviceId: null,
          updatedAt: new Date(),
        },
      });

      // Update assignment history
      await tx.maintenanceAssignmentHistory.updateMany({
        where: {
          maintenanceId: maintenanceId,
          vendorId: maintenance.vendorId,
          unassignedAt: null,
        },
        data: {
          unassignedAt: new Date(),
          reasonLeft: reason,
        },
      });

      // Create status history
      await tx.maintenanceStatusHistory.create({
        data: {
          maintenanceId: maintenanceId,
          oldStatus: maintenance.status,
          newStatus: maintenanceStatus.UNASSIGNED,
          vendorId: maintenance.vendorId,
        },
      });

      // Decrement vendor's current job count
      const vendorService = await tx.services.findFirst({
        where: {
          vendorId: maintenance.vendorId,
          categoryId: maintenance.categoryId,
        },
      });

      if (vendorService) {
        await tx.services.update({
          where: { id: vendorService.id },
          data: {
            currentJobs: Math.max(0, vendorService.currentJobs - 1),
          },
        });
      }

      return updatedMaintenance;
    }, {
      timeout: 30000,
      maxWait: 10000,
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

  checkWhitelist = async (landlordId: string, categoryId: string, subcategoryId?: string, propertyId?: string, isActive: boolean = true) => {
    // check for property existance
    const propertyExist = await propertyServices.searchPropertyUnitRoom(propertyId);
    if (!propertyExist) throw new Error(`property with the id : ${propertyId} doesn't exist`);

    return await prismaClient.maintenanceWhitelist.findFirst({
      where: {
        landlordId,
        categoryId,
        isActive,
        subcategoryId: subcategoryId ? subcategoryId : undefined,
        unitId: propertyExist?.type === 'unit' ? propertyExist?.data.id : null,
        roomId: propertyExist?.type === 'room' ? propertyExist?.data.id : null,
        propertyId: propertyExist?.type === 'property' ? propertyExist?.data.id : null,
      },
    });
  }

  processPayment = async (maintenanceId: string, amount: number, userId: string, receiverId: string, currency: Currency) => {

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
  // Returns transformed data matching frontend expectations
  getVendorsForPropertyMaintenance = async (propertyId: string) => {
    try {
      const maintenanceRecords = await prismaClient.maintenance.findMany({
        where: {
          propertyId: propertyId,
          isDeleted: false,
        },
        include: {
          vendor: {
            include: {
              user: {
                select: { 
                  id: true, 
                  email: true, 
                  role: true, 
                  profileId: true, 
                  profile: true 
                }
              },
              services: {
                select: {
                  id: true,
                  category: {
                    select: { name: true }
                  },
                  subcategory: {
                    select: { name: true }
                  }
                }
              }
            }
          },
          services: {
            include: {
              vendor: {
                include: {
                  user: {
                    select: { 
                      id: true, 
                      email: true, 
                      role: true, 
                      profileId: true, 
                      profile: true 
                    }
                  },
                  services: {
                    select: {
                      id: true,
                      category: {
                        select: { name: true }
                      },
                      subcategory: {
                        select: { name: true }
                      }
                    }
                  }
                }
              }
            },
          },
          category: {
            select: { name: true }
          },
        },
        orderBy: {
          scheduleDate: 'desc'
        }
      });

      const today = new Date();
      const vendorMap = new Map<string, any>();

      // Process maintenance records and group by vendor
      maintenanceRecords.forEach((record) => {
        const scheduleDate = record.scheduleDate;
        if (!scheduleDate) return;

        // Get vendor (either directly assigned or through service)
        const vendor = record.vendor || record.services?.vendor;
        if (!vendor || !vendor.user?.profile) return;

        const vendorId = vendor.id;
        const vendorName = vendor.user.profile.fullname || vendor.user.email || 'Unknown Vendor';
        const vendorAvatar = vendor.user.profile.profileUrl || '/default-avatar.png';

        // Get services as string array
        const serviceNames = vendor.services?.map((s: any) => 
          s.subcategory?.name || s.category?.name || 'Service'
        ) || [];

        // Initialize vendor in map if not exists
        if (!vendorMap.has(vendorId)) {
          vendorMap.set(vendorId, {
            id: vendorId,
            name: vendorName,
            avatar: vendorAvatar,
            services: [...new Set(serviceNames)], // Remove duplicates
            history: [],
            rating: 0, // Will be calculated from reviews if available
          });
        }

        const vendorData = vendorMap.get(vendorId);

        // Add maintenance record to history
        const historyEntry = {
          id: record.id,
          date: scheduleDate.toISOString().split('T')[0],
          description: record.description || record.category?.name || 'Maintenance',
          cost: record.amount ? Number(record.amount) : 0,
          status: record.status,
          receiptUrl: (record as any).receiptUrl || null,
          receiptNumber: (record as any).receiptNumber || null,
          receiptGeneratedAt: (record as any).receiptGeneratedAt || null,
        };

        vendorData.history.push(historyEntry);

        // Categorize vendor based on most recent maintenance
        if (!vendorData.category) {
          if (isToday(scheduleDate)) {
            vendorData.category = 'current';
          } else if (isBefore(scheduleDate, today)) {
            vendorData.category = 'previous';
          } else if (isAfter(scheduleDate, today)) {
            vendorData.category = 'future';
          }
        }
      });

      // Separate vendors into current and past
      const current: any[] = [];
      const past: any[] = [];

      vendorMap.forEach((vendor) => {
        // Sort history by date (most recent first)
        vendor.history.sort((a: any, b: any) => 
          new Date(b.date).getTime() - new Date(a.date).getTime()
        );

        // Determine if vendor is current or past based on most recent job
        const mostRecentJob = vendor.history[0];
        if (mostRecentJob) {
          const jobDate = new Date(mostRecentJob.date);
          if (isToday(jobDate) || isAfter(jobDate, today)) {
            current.push(vendor);
          } else {
            // For past vendors, only include if they have completed jobs
            if (mostRecentJob.status === 'COMPLETED') {
              past.push(vendor);
            }
          }
        }
      });

      return {
        current,
        previous: past, // Map to 'past' in controller
        future: [], // Not used by frontend currently
      };
    } catch (error: any) {
      console.error('Error fetching vendors for property maintenance:', error);
      throw new Error('Error fetching vendors for property maintenance: ' + error.message);
    }
  };
  // backups
  getBackupsVendorsForPropertyMaintenance = async (propertyId: string) => {
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

  // getPropertyTenantMaintenance = async (propertyId: string, tenantId: string) => {
  //   return await prismaClient.maintenance.findMany({
  //     where: { propertyId, tenantId },
  //     include: this.inclusion,
  //   });
  // }

  getPropertyTenantMaintenance = async (tenantId: string) => {
    // Get the tenant's attachments (property, unit, or room)
    const tenant = await prismaClient.tenants.findUnique({
      where: { id: tenantId },
      select: {
        propertyId: true,
        unitId: true,
        roomId: true
      }
    });

    if (!tenant) {
      throw new Error("Tenant not found");
    }

    // Build the where clause based on what the tenant is attached to
    const whereClause: any = { tenantId };

    if (tenant.roomId) {
      // Tenant is attached to a specific room
      whereClause.roomId = tenant.roomId;
    } else if (tenant.unitId) {
      // Tenant is attached to a specific unit
      whereClause.unitId = tenant.unitId;
    } else if (tenant.propertyId) {
      // Tenant is attached to a full property
      whereClause.propertyId = tenant.propertyId;
    } else {
      // Tenant has no attachments
      return [];
    }

    return await prismaClient.maintenance.findMany({
      where: whereClause,
      include: this.inclusion,
    });
  }

  async searchPropertyUnitRoomForMaintenace(id: string): Promise<SearchResult> {
    const maxRetries = 3;
    const baseTimeout = 30000;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await this.executeSearchTransaction(id, baseTimeout * attempt);
      } catch (error: any) {
        if (attempt === maxRetries) {
          throw new Error(`Failed after ${maxRetries} attempts: ${error.message}`);
        }

        if (error.message.includes('timeout') || error.code === 'P1001') {
          console.warn(`Attempt ${attempt} failed, retrying in ${attempt * 2000}ms...`);
          await new Promise(resolve => setTimeout(resolve, attempt * 2000));
          continue;
        }

        throw error;
      }
    }

    throw new Error('Unexpected error in search operation');
  }

  private async executeSearchTransaction(id: string, timeout: number): Promise<SearchResult> {
    return await prismaClient.$transaction(async (tx) => {
      const [property, unit, room] = await Promise.all([
        tx.properties.findFirst({
          where: { id, isDeleted: false }
        }),

        tx.unitConfiguration.findFirst({
          where: { id, isDeleted: false },
        }),

        tx.roomDetail.findFirst({
          where: { id, isDeleted: false },
        })
      ]);

      if (property) return { type: "property", data: property };
      if (unit) return { type: "unit", data: unit };
      if (room) return { type: "room", data: room };

      throw new Error("No matching property, unit, or room found");
    }, {
      maxWait: timeout,
      timeout: timeout,
      isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted
    });
  }

  async uploadStartAttachments(maintenanceId: string, files: { url: string; type: string }[]) {
    return prismaClient.maintenance.update({
      where: { id: maintenanceId },
      data: {
        startAttachments: {
          push: files.map(f => f.url),
        },
      },
    });
  }

  async uploadEndAttachments(maintenanceId: string, files: { url: string; type: string }[]) {
    return prismaClient.maintenance.update({
      where: { id: maintenanceId },
      data: {
        endAttachments: {
          push: files.map(f => f.url),
        },
      },
    });
  }


  async updateStatus(maintenanceId: string, newStatus: maintenanceStatus, vendorId?: string) {
    const maintenance = await prismaClient.maintenance.findUnique({ where: { id: maintenanceId } });
    if (!maintenance) throw new Error("Maintenance not found");

    return await prismaClient.$transaction(async (tx) => {
      // Record history
      await tx.maintenanceStatusHistory.create({
        data: {
          maintenanceId,
          oldStatus: maintenance.status,
          newStatus,
        },
      });
      // update assignment history
      if (vendorId) {
        await tx.maintenanceAssignmentHistory.updateMany({
          where: {
            maintenanceId,
            vendorId
          },
          data: {
            state: newStatus,
          },
        });
      }

      // Update status
      return tx.maintenance.update({
        where: { id: maintenanceId },
        data: { status: newStatus },
        include: this.inclusion,
      });
    }, {
      timeout: 30000,
      maxWait: 10000,
    })


  }

  assignMaintenance = async (id: string, maintenanceData: Partial<MaintenanceIF>, oldStatus?: maintenanceStatus) => {
    const { subcategoryIds, ...rest } = maintenanceData;
    const updateData: any = {
      ...rest,
      subcategories: subcategoryIds ? {
        set: subcategoryIds.map(id => ({ id })),
      } : undefined,
    };
    return await prismaClient.$transaction(async (tx) => {
      // Update maintenance with vendor assignment
      const updatedMaintenance = await tx.maintenance.update({
        where: { id },
        data: {
          ...updateData,
          updatedAt: new Date(),
        },
        include: this.inclusion,
      });

      // Create assignment history
      await tx.maintenanceAssignmentHistory.create({
        data: {
          maintenanceId: id,
          vendorId: maintenanceData.vendorId!,
          assignedAt: new Date(),
          state: maintenanceStatus.ASSIGNED,
        },
      });

      // Create status history
      await tx.maintenanceStatusHistory.create({
        data: {
          maintenanceId: id,
          oldStatus: oldStatus,
          newStatus: maintenanceStatus.ASSIGNED,
          vendorId: maintenanceData.vendorId!,
        },
      });

      // Update vendor's current job count
      await tx.services.update({
        where: { id: maintenanceData.serviceId },
        data: {
          currentJobs: { increment: 1 },
        },
      });
      return updatedMaintenance;
    },
      {
        timeout: 30000,
        maxWait: 10000,
      });

  }

  async getStatusHistory(maintenanceId: string) {
    return prismaClient.maintenanceStatusHistory.findMany({
      where: { maintenanceId },
      orderBy: { changedAt: "asc" },
    });
  }

  async rescheduleMaintenanceDate(maintenanceId: string, newDate: Date) {
    const maintenance = await prismaClient.maintenance.findUnique({
      where: { id: maintenanceId }
    });

    if (!maintenance) {
      throw ApiError.notFound("Maintenance not found");
    }

    // Create reschedule history entry
    await prismaClient.maintenanceRescheduleHistory.create({
      data: {
        maintenanceId,
        oldDate: maintenance.scheduleDate || new Date(),
        newDate: new Date(newDate),
      }
    });

    // Update maintenance with reschedule request
    const updated = await prismaClient.maintenance.update({
      where: { id: maintenanceId },
      data: {
        rescheduleRequestDate: new Date(newDate),
        rescheduleRequestStatus: 'PENDING',
        scheduleDate: new Date(newDate), // Update the actual schedule date
      },
      include: {
        // Include necessary relations
        tenant: true,
        vendor: true,
        property: true,
        category: true,
      }
    });

    return updated;
  }

  async pauseMaintenance(maintenanceId: string, resumeDate: Date, vendorId?: string) {
    const maintenance = await prismaClient.maintenance.findUnique({ where: { id: maintenanceId } });
    if (!maintenance) throw new Error("Maintenance not found");

    return await prismaClient.$transaction(async (tx) => {
      // Record history
      await tx.maintenanceStatusHistory.create({
        data: {
          maintenanceId,
          oldStatus: maintenance.status,
          newStatus: maintenanceStatus.PAUSED,
        },
      });
      // update assignment history
      if (vendorId) {
        await tx.maintenanceAssignmentHistory.updateMany({
          where: {
            maintenanceId,
            vendorId
          },
          data: {
            state: maintenanceStatus.PAUSED,
          },
        });
      }

      // Update status
      return tx.maintenance.update({
        where: { id: maintenanceId },
        data: {
          status: maintenanceStatus.PAUSED,
          pauseResumeDate: new Date(resumeDate),
          isPaused: true,
        },
        include: this.inclusion,
      });
    }, {
      timeout: 30000,
      maxWait: 10000,
    });
  }

  async resumeMaintenance(maintenanceId: string, vendorId?: string) {
    const maintenance = await prismaClient.maintenance.findUnique({
      where: { id: maintenanceId }
    });

    if (!maintenance) {
      throw ApiError.notFound("Maintenance not found");
    }

    return await prismaClient.$transaction(async (tx) => {
      // Record history
      await tx.maintenanceStatusHistory.create({
        data: {
          maintenanceId,
          oldStatus: maintenance.status,
          newStatus: maintenanceStatus.IN_PROGRESS,
        },
      });
      // update assignment history
      if (vendorId) {
        await tx.maintenanceAssignmentHistory.updateMany({
          where: {
            maintenanceId,
            vendorId
          },
          data: {
            state: maintenanceStatus.IN_PROGRESS,
          },
        });
      }
      // Update status
      return tx.maintenance.update({
        where: { id: maintenanceId },
        data: {
          status: maintenanceStatus.IN_PROGRESS,
          pauseResumeDate: null,
          isPaused: false,
        },
        include: this.inclusion,
      });
    },
      {
        timeout: 30000,
        maxWait: 10000,
      });
  }

  async destinationReached(maintenanceId: string, vendorId?: string) {
    const maintenance = await prismaClient.maintenance.findUnique({
      where: { id: maintenanceId }
    });

    if (!maintenance) {
      throw ApiError.notFound("Maintenance not found");
    }

    return await prismaClient.maintenance.update({
      where: { id: maintenanceId },
      data: {
        destinationReached: true,
        jobStarted: true
      },
      include: this.inclusion,
    });
  }

  async cancelMaintenance(maintenanceId: string, cancelReason: string, vendorId: string) {
    return await prismaClient.$transaction(async (tx) => {
      // 1Find the current maintenance and vendor assignment
      const maintenance = await tx.maintenance.findUnique({
        where: { id: maintenanceId }
      });

      if (!maintenance) throw new Error('Maintenance not found');


      // 2Update the current assignment history to CANCEL
      if (vendorId) {
        await tx.maintenanceAssignmentHistory.updateMany({
          where: {
            maintenanceId,
            vendorId
          },
          data: {
            state: maintenanceStatus.CANCEL,
            unassignedAt: new Date(),
            reasonLeft: cancelReason,
          },
        });
      }

      // Record this transition in maintenanceStatusHistory
      await tx.maintenanceStatusHistory.create({
        data: {
          maintenanceId,
          vendorId: vendorId,
          oldStatus: maintenance.status,
          newStatus: maintenanceStatus.CANCEL,
        },
      });

      //  Update the maintenance main record
      const updatedMaintenance = await tx.maintenance.update({
        where: { id: maintenanceId },
        data: {
          status: maintenanceStatus.UNASSIGNED, // enable others to pick it up
          flagCancellation: true,
          cancelReason,
          vendorConsentCancellation: true,
          vendorId: null, // vendor released
          updatedAt: new Date(),
        },
        include: this.inclusion,
      });

      return updatedMaintenance;
    }, {
      timeout: 30000,
      maxWait: 10000,
    });
  }

  async completeMaintenance(maintenanceId: string, vendorId: string) {
    return await prismaClient.$transaction(async (tx) => {
      // Find the current maintenance and vendor assignment
      const maintenance = await tx.maintenance.findUnique({
        where: { id: maintenanceId }
      });

      if (!maintenance) throw ApiError.notFound('Maintenance not found');
      // 2Update the current assignment history to CANCEL
      if (vendorId) {
        await tx.maintenanceAssignmentHistory.updateMany({
          where: {
            maintenanceId,
            vendorId
          },
          data: {
            state: maintenanceStatus.COMPLETED,
          },
        });
      }

      // Record this transition in maintenanceStatusHistory
      await tx.maintenanceStatusHistory.create({
        data: {
          maintenanceId,
          vendorId: vendorId,
          oldStatus: maintenance.status,
          newStatus: maintenanceStatus.COMPLETED,
        },
      });

      //  Update the maintenance main record
      const updatedMaintenance = await tx.maintenance.update({
        where: { id: maintenanceId },
        data: {
          status: maintenanceStatus.COMPLETED,
          updatedAt: new Date(),
        },
        include: this.inclusion,
      });

      return updatedMaintenance;
    }, {
      timeout: 30000,
      maxWait: 10000,
    });
  }

  // Create a new note for a maintenance
  addNote = async (maintenanceId: string, userId: string, note: string, attachments?: string[]) => {
    const maintenance = await prismaClient.maintenance.findUnique({ where: { id: maintenanceId } });
    if (!maintenance) throw new Error('Maintenance not found');

    return await prismaClient.maintenanceNote.create({
      data: {
        maintenanceId,
        userId,
        note,
        attachments: attachments || [],
      },
      include: {
        user: { select: { id: true, profile: true, email: true } },
      },
    });
  }

  // Get all notes for a maintenance
  getNotesByMaintenance = async (maintenanceId: string) => {
    return await prismaClient.maintenanceNote.findMany({
      where: { maintenanceId },
      include: {
        user: { select: { id: true, profile: true, email: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  deleteNote = async (noteId: string, userId: string) => {
    const note = await prismaClient.maintenanceNote.findUnique({ where: { id: noteId } });
    if (!note) throw new Error('Note not found');
    if (note.userId !== userId) throw new Error('Unauthorized action');

    return await prismaClient.maintenanceNote.delete({ where: { id: noteId } });
  }
}

export default new MaintenanceService();
