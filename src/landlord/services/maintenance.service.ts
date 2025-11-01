import { prismaClient } from "../../index";
import { maintenanceStatus, maintenanceDecisionStatus } from '@prisma/client';
import { MaintenanceWhitelistInput } from "../validations/interfaces/maintenance";
import categoryService from "../../services/category.service";



interface MaintenanceCounts {
  pending: number;
  completed: number;
  inProgress: number;
  tenantRequest: number;
}

class LandlordMaintenanceService {
  protected inclusion: {
    vendor: boolean;
    property: boolean;
    category: boolean;
    rooms: boolean;
    units: boolean;
  };

  constructor() {
    this.inclusion = {
      vendor: true,
      property: true,
      category: true,
      rooms: true,
      units: true,
    }
  }
  getMaintenanceCounts = async (landlordId: string): Promise<MaintenanceCounts> => {
    // Count maintenance records with status "PENDING"
    const pendingCount = await prismaClient.maintenance.count({
      where: {
        OR: [
          { landlordId: landlordId },
          { property: { landlordId: landlordId } }
        ],
        status: maintenanceStatus.PENDING,
        isDeleted: false,
      },
    });

    // Count maintenance records with status "COMPLETED"
    const completedCount = await prismaClient.maintenance.count({
      where: {
        OR: [
          { landlordId: landlordId },
          { property: { landlordId: landlordId } }
        ],
        status: maintenanceStatus.COMPLETED,
        isDeleted: false,
      },
    });

    // Count maintenance records with status "ASSIGNED" or "IN_PROGRESS"
    const inProgressCount = await prismaClient.maintenance.count({
      where: {
        property: {
          landlordId
        },
        status: { in: ['ASSIGNED', 'UNASSIGNED'] },
        isDeleted: false,
      },
    });

    // Count maintenance records with status "CANCELLATION_REQUEST"
    const tenantRequestCount = await prismaClient.maintenance.count({
      where: {
        OR: [
          { landlordId: landlordId },
          { property: { landlordId: landlordId } }
        ],
        handleByLandlord: false,
        isDeleted: false,
      },
    });
    return {
      pending: pendingCount,
      completed: completedCount,
      inProgress: inProgressCount,
      tenantRequest: tenantRequestCount,
    }
  };

  getRequestedMaintenanceByLandlord = async (landlordId: string, status?: maintenanceStatus) => {
    const maintenanceRequests = await prismaClient.maintenance.findMany({
      where: {
        OR: [
          { landlordId: landlordId },
          { property: { landlordId: landlordId } }
        ],
        isDeleted: false,
        ...(status && { status: status as any }),
      },
      include: {
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
                }
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
      },
    });
    return maintenanceRequests;
  }
  // get all maintenances on current landlord properties base on status
  getLandlordPropertiesMaintenance = async (landlordId: string, status?: maintenanceStatus) => {
    return await prismaClient.maintenance.findMany({
      where: {
        property: {
          landlordId: landlordId,
        },
        ...(status && { status: status as any }),
        isDeleted: false,
      },
         include: {
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
                }
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
      },
    });
  }
  // # get maintenances based on a property 
  getPropertyMaintenances = async (propertyId: string) => {
    const maintenaces = await prismaClient.maintenance.findMany({
      where: {
        propertyId,
        isDeleted: false,
      },
      include: {
        landlord: true,
        ...this.inclusion,
      },
    });
    return maintenaces;
  }

  getTenantMaintenance = async (landlordId: string, tenantId: string) => {
    return await prismaClient.maintenance.findMany({
      where: {
        tenantId,
        property: {
          landlordId: landlordId,
        },
        isDeleted: false,
      },
      include: {
        tenant: true,
        ...this.inclusion,
      },
    });
  }

  getRequestedMaintenanceByTenants = async (landlordId: string, status?: maintenanceStatus) => {
    return await prismaClient.maintenance.findMany({
      where: {
        tenantId: {
          not: null,
        },
        landlordDecision: maintenanceDecisionStatus.PENDING,
        property: {
          landlordId: landlordId,
        },
        isDeleted: false,
        ...(status && { status: status as any }),
      },
         include: {
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
                }
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
      },
    });
  }

  changeLandlordPropertiesMaintenanceDecisionState = async (landlordId: string, maintenanceId: string, status?: maintenanceDecisionStatus) => {

    return await prismaClient.maintenance.update({
      where: {
        id: maintenanceId,
        property: {
          landlordId
        }
      },
      data: {
        ...(status && { landlordDecision: status as any }),
        isDeleted: false,
      },
      include: {
        landlord: true,
        tenant: true,
        ...this.inclusion,
      },
    });
  }

  createWhitelist = async (data: MaintenanceWhitelistInput, landlordId: string) => {
    try {
      const whitelistEntry = await prismaClient.maintenanceWhitelist.create({
        data: {
          categoryId: data.categoryId,
          subcategoryId: data.subcategoryId,
          propertyId: data.propertyId || null,
          landlordId: landlordId,
        },
      });

      return whitelistEntry;
    } catch (error) {
      throw new Error(`Error creating whitelist entry: ${error.message}`);
    }
  }

  // Fetch the whitelist for a landlord
  getWhitelistByLandlord = async (landlordId: string) => {
    try {
      const whitelist = await prismaClient.maintenanceWhitelist.findMany({
        where: {
          landlordId: landlordId,
          isActive: true
        },
        include: {
          category: true,
          subcategory: true,
          property: true,
        },
      });

      return whitelist;
    } catch (error) {
      throw new Error(`Error fetching whitelist: ${error.message}`);
    }
  }


  getMaintenanceCategoriesWithWhitelistStatus = async (landlordId: string) => {
    // Fetch all categories with their subcategories
    const categories = await categoryService.getAllCategoriesWithoutFilters();

    // Fetch whitelisted categories and subcategories for the landlord
    const whitelistedEntries = await prismaClient.maintenanceWhitelist.findMany({
      where: {
        landlordId,
        isActive: true,
      },
      select: {
        categoryId: true,
        subcategoryId: true,
      },
    });

    // Create sets of whitelisted category and subcategory IDs for quick lookup
    const whitelistedCategoryIds = new Set(
      whitelistedEntries.map((entry) => entry.categoryId)
    );
    const whitelistedSubcategoryIds = new Set(
      whitelistedEntries
        .filter((entry) => entry.subcategoryId !== null)
        .map((entry) => entry.subcategoryId as string)
    );

    // combine and structure the data
    const result = categories.map((category) => ({
      ...category,
      // isEnabled: whitelistedCategoryIds.has(category.id),
      subCategories: category.subCategory.map((subCategory) => ({
        ...subCategory,
        isEnabled: whitelistedSubcategoryIds.has(subCategory.id),
      })),
    }));
    return result;
  }


  // Update an existing whitelist entry
  updateWhitelist = async (whitelistId: string, data: MaintenanceWhitelistInput) => {
    try {
      const updatedWhitelist = await prismaClient.maintenanceWhitelist.update({
        where: { id: whitelistId },
        data: {
          categoryId: data.categoryId,
          subcategoryId: data.subcategoryId,
          propertyId: data.propertyId,
        },
      });

      return updatedWhitelist;
    } catch (error) {
      throw new Error(`Error updating whitelist: ${error.message}`);
    }
  }

  toggleWhitelistStatus = async (subcategoryId: string, currentLandlordId) => {

    // Step 1: Retrieve the current isActive value
    const whitelistEntry = await prismaClient.maintenanceWhitelist.findFirst({
      where: { subcategoryId, landlordId: currentLandlordId },
    });

    if (!whitelistEntry) {
      throw new Error(`Whitelist entry with subcategoryId: ${subcategoryId} not found.`);
    }
    // check if the current landlord was the one that whitelisted it
    if (whitelistEntry.landlordId !== currentLandlordId) {
      throw new Error('Unauthorized: You do not have permission to modify this entry.');
    }

    // Step 2: Toggle the isActive value
    const updatedEntry = await prismaClient.maintenanceWhitelist.update({
      where: { id: whitelistEntry.id },
      data: { isActive: !whitelistEntry.isActive },
    });

    return updatedEntry;
  };

  deleteMaintenance = async (maintenanceId: string) => {
    return await prismaClient.maintenance.update({
      where: {
        id: maintenanceId
      },
      data: {
        isDeleted: true
      }
    })
  }
}

export default new LandlordMaintenanceService();
