import { TransactionReference, maintenanceStatus, chatType, TransactionStatus, Currency, properties, UnitConfiguration, RoomDetail, Prisma } from "@prisma/client";
import { prismaClient } from "..";
import { MaintenanceIF, RescheduleMaintenanceDTO } from '../validations/interfaces/maintenance.interface';
import transferServices from "./transfer.services";
import ServiceServices from "../vendor/services/vendor.services";
import { subDays, addDays, isBefore, isAfter, isToday } from 'date-fns';
import { ApiError } from "../utils/ApiError";

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

  async getVendorsMaintenanceStates(vendorId: string, state: maintenanceStatus, limit: number, page: number) {
    // Check if propertyId corresponds
    const assignments = await prismaClient.maintenanceAssignmentHistory.findMany({
      where: {
        vendorId,
        state,
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
    return await prismaClient.maintenanceWhitelist.findFirst({
      where: {
        landlordId,
        categoryId,
        isActive,
        subcategoryId: subcategoryId ? subcategoryId : undefined,
        propertyId: propertyId ? propertyId : undefined,
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
  getVendorsForPropertyMaintenance = async (propertyId: string) => {
    try {
      const maintenanceRecords = await prismaClient.maintenance.findMany({
        where: {
          propertyId: propertyId,
          isDeleted: false, // Ensure you are not fetching deleted records
        },
        include: {
          vendor: {
            include: {
              user: {
                select: { id: true, email: true, role: true, profileId: true, profile: true }
              }
            }
          }, // Fetch vendors directly assigned
          services: {
            include: {
              vendor: {
                include: {
                  user: {
                    select: { id: true, email: true, role: true, profileId: true, profile: true }
                  }
                }
              }  // Fetch vendors through services
            },
          },
        },
      });

      const today = new Date();

      const categorizedVendors = {
        current: new Set(),
        previous: new Set(),
        future: new Set(),
      };

      maintenanceRecords.forEach((record) => {
        const scheduleDate = record.scheduleDate;
        if (!scheduleDate) return; // Skip if no scheduleDate

        let vendor = record.vendor || (record.services?.vendor ?? null);
        if (!vendor) return; // Skip if no vendor

        if (isToday(scheduleDate)) {
          categorizedVendors.current.add(vendor);
        } else if (isBefore(scheduleDate, today)) {
          categorizedVendors.previous.add(vendor);
        } else if (isAfter(scheduleDate, today)) {
          categorizedVendors.future.add(vendor);
        }
      });

      // Convert sets to arrays before returning
      return {
        current: Array.from(categorizedVendors.current),
        previous: Array.from(categorizedVendors.previous),
        future: Array.from(categorizedVendors.future),
      };
    } catch (error) {
      throw new Error('Error fetching vendors for property maintenance');
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

  async pauseMaintenance(maintenanceId: string, resumeDate: Date) {
    const maintenance = await prismaClient.maintenance.findUnique({
      where: { id: maintenanceId }
    });

    if (!maintenance) {
      throw ApiError.notFound("Maintenance not found");
    }

    const updated = await prismaClient.maintenance.update({
      where: { id: maintenanceId },
      data: {
        status: maintenanceStatus.PAUSED,
        pauseResumeDate: new Date(resumeDate),
        isPaused: true,
        maintenanceStatusHistory: {
          create: {
            oldStatus: maintenance.status,
            newStatus: maintenanceStatus.PAUSED,
          },
        },
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

  async resumeMaintenance(maintenanceId: string) {
    const maintenance = await prismaClient.maintenance.findUnique({
      where: { id: maintenanceId }
    });

    if (!maintenance) {
      throw ApiError.notFound("Maintenance not found");
    }

    const updated = await prismaClient.maintenance.update({
      where: { id: maintenanceId },
      data: {
        status: maintenanceStatus.IN_PROGRESS,
        pauseResumeDate: null,
        isPaused: false,
        maintenanceStatusHistory: {
          create: {
            oldStatus: maintenance.status,
            newStatus: maintenanceStatus.IN_PROGRESS,
          },
        },
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
}



export default new MaintenanceService();
