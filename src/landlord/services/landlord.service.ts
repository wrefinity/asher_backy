
import { prismaClient } from "../../index";
import { UpdateLandlordDTO } from '../../validations/interfaces/auth.interface';

export class LandlordService {

  // Update an existing landlord
  updateLandlord = async (id: string, data: UpdateLandlordDTO) => {
    const landlord = await prismaClient.landlords.update({
      where: { id },
      data: {
        // Update userId
        ...(data?.userId && { user: { connect: { id: data.userId } } }),

        // Update businessName
        ...(data?.businessName !== undefined && { businessName: data.businessName }),

        // Update emailDomains
        ...(data?.emailDomains !== undefined && { emailDomains: data.emailDomains }),

        // Handle properties connections/disconnections
        ...(data?.properties && {
          property: {
            connect: data.properties.connect,
            disconnect: data.properties.disconnect,
          },
        }),

        // Handle tenants connections/disconnections
        ...(data?.tenants && {
          tenants: {
            connect: data.tenants.connect,
            disconnect: data.tenants.disconnect,
          },
        }),

        // Handle support tickets connections/disconnections
        ...(data.lnadlordSupportTicket && {
          lnadlordSupportTicket: {
            connect: data.lnadlordSupportTicket.connect,
            disconnect: data.lnadlordSupportTicket.disconnect,
          },
        }),

        // Handle transactions connections/disconnections
        ...(data.transactions && {
          transactions: {
            connect: data.transactions.connect,
            disconnect: data.transactions.disconnect,
          },
        }),

        // Handle reviews connections/disconnections
        ...(data.reviews && {
          reviews: {
            connect: data.reviews.connect,
            disconnect: data.reviews.disconnect,
          },
        }),

        // Handle other fields like isDeleted
        isDeleted: data.isDeleted || undefined,
      },
    });
    return landlord;
  }

  // Delete a landlord
  deleteLandlord = async (id: string) => {
    return await prismaClient.landlords.update({
      where: { id },
      data: { isDeleted: true }
    });
  }

  // Get all landlords
  getAllLandlords = async () => {
    return await prismaClient.landlords.findMany({
      include: {
        user: true,
        property: true,
      },
      where: {
        isDeleted: false
      }
    });
  }

  // Get a single landlord by ID
  getLandlordById = async (id: string) => {
    return await prismaClient.landlords.findUnique({
      where: { id },
      include: {
        user: true,
        property: true,
      },
    });
  }

  // Get current tenants
  getCurrentTenants = async (landlordId: string) => {
    const currentTenants = await prismaClient.tenants.findMany({
      where: {
        isCurrentLease: true,
        landlordId: landlordId,
        leaseEndDate: {
          gte: new Date()
        }
      },
      include: {
        user: true,
        landlord: true,
        property: true,
      }
    });

    return currentTenants;
  }

  // Get previous tenants
  getPreviousTenants = async (landlordId: string) => {
    const previousTenants = await prismaClient.tenants.findMany({
      where: {
        OR: [
          { landlordId: landlordId },
          { isCurrentLease: false },
          { leaseEndDate: { lt: new Date() } }
        ]
      },
      include: {
        user: true,
        landlord: true,
        property: true
      }
    });

    return previousTenants;
  }


  // Get current vendors working on a property that belongs to a landlord
  async getCurrentVendorsByLandlord(landlordId: string) {
    const currentVendors = await prismaClient.vendors.findMany({
      where: {
        services: {
          some: {
            maintenance: {
              some: {
                property: {
                  landlordId: landlordId,
                },
                isDeleted: false,
                // scheduleDate: {
                //     gte: new Date(), // Ensure the job is scheduled for the current or future date
                // },
                status: 'ASSIGNED', // Filter where maintenance status is ASSIGNED
              },
            },
          },
        },
      },
      include: {
        services: {
          include: {
            maintenance: {
              include: {
                property: true,
              },
            },
          },
        },
      },
    });

    return currentVendors;
  }
  // Get current vendors working on a property that belongs to a landlord
  async getCompletedJobsLandlord(landlordId: string) {
    const currentVendors = await prismaClient.vendors.findMany({
      where: {
        services: {
          some: {
            maintenance: {
              some: {
                property: {
                  landlordId: landlordId,
                },
                isDeleted: false,
                status: 'COMPLETED',
              },
            },
          },
        },
      },
      include: {
        services: {
          include: {
            maintenance: {
              include: {
                property: true,
              },
            },
          },
        },
      },
    });

    return currentVendors;
  }

  // TODO: Get current locations
  getLandlordLocations = async (landlordId: string) => {
    const currentLocations = await prismaClient.landlords.findUnique({
      where: { id: landlordId },
      select: {
        property: {
          select: {
            id: true,
            state: true,
            address: true,
            city: true,
            zipcode: true,
            country: true,
            landlordId: true,
          },
        },
      },
    });
    return currentLocations;
  }

  // Get Landlord Properties
  getLandlordProperties = async (landlordId: string) => {
    const properties = await prismaClient.properties.findMany({
      where: { landlordId: landlordId, isDeleted: false },
      select: {
        id: true,
        name: true,
        // description: true,
        // shortDescription: true,
        propertySize: true,
        // address: true,
        city: true,
        country: true,
        zipcode: true,
        state: true,
        landlordId: true,
      },
    });
    return properties;
  }

}