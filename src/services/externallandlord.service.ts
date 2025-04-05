import { ApplicationStatus, Prisma } from "@prisma/client";
import { prismaClient } from "..";
import {
  LandlordReferenceFormCreateDTO,
  TenancyReferenceHistoryCreateDTO,
  ExternalLandlordCreateDTO,
  TenantConductCreateDTO
} from '../validations/interfaces/references.interfaces';
import applicantService from "../webuser/services/applicantService";

class LandlordReferenceService {
  async createLandlordReferenceForm(
    data: LandlordReferenceFormCreateDTO,
    applicationId
  ): Promise<Prisma.LandlordReferenceFormGetPayload<{
    include: {
      tenancyReferenceHistory: true;
      externalLandlord: true;
      conduct: true;
      application: true;
    };
  }>> {
    return prismaClient.$transaction(async (prisma) => {

      // Check if reference form already exists for this application
      const existingForm = await prismaClient.landlordReferenceForm.findFirst({
        where: { applicationId },
        include: {
          tenancyReferenceHistory: true,
          externalLandlord: true,
          conduct: true,
          application: true
        }
      });
      if (existingForm) {
        throw Error("Landlord reference completed")
      }
      // Run these operations in parallel to save time
      const [tenancyHistory, externalLandlord, tenantConduct] = await Promise.all([
        this.createTenancyHistory(prisma, data.tenancyHistory),
        this.createExternalLandlord(prisma, data.externalLandlord),
        this.createTenantConduct(prisma, data.conduct)
      ]);

      const created = await prisma.landlordReferenceForm.create({
        data: {
          status: data.status,
          additionalComments: data.additionalComments,
          signerName: data.signerName,
          signature: data.signature,
          application: {
            connect: { id: applicationId }
          },
          tenancyReferenceHistory: {
            connect: { id: tenancyHistory.id }
          },
          externalLandlord: {
            connect: { id: externalLandlord.id }
          },
          conduct: {
            connect: { id: tenantConduct.id }
          }
        },
        include: {
          tenancyReferenceHistory: true,
          externalLandlord: true,
          conduct: true,
          application: true
        }
      });

      if (created) {
        await applicantService.updateApplicationStatus(applicationId, ApplicationStatus.LANDLORD_REFERENCE);
      }

      return created;
    }, {
      maxWait: 20000, // Wait up to 20 seconds to acquire a connection from the pool
      timeout: 20000  // Allow 20 seconds for the transaction execution
    });
  }

  private async createTenancyHistory(
    prisma: Prisma.TransactionClient,
    data: TenancyReferenceHistoryCreateDTO
  ) {
    return prisma.tenancyReferenceHistory.create({
      data: {
        tenantName: data.tenantName,
        currentAddress: data.currentAddress,
        monthlyRent: data.monthlyRent,
        rentStartDate: data.rentStartDate,
        rentEndDate: data.rentEndDate,
        reasonForLeaving: data.reasonForLeaving
      }
    });
  }

  private async createExternalLandlord(
    prisma: Prisma.TransactionClient,
    data: ExternalLandlordCreateDTO
  ) {
    return prisma.externalLandlord.create({
      data: {
        name: data.name,
        contactNumber: data.contactNumber,
        emailAddress: data.emailAddress
      }
    });
  }

  private async createTenantConduct(
    prisma: Prisma.TransactionClient,
    data: TenantConductCreateDTO
  ) {
    return prisma.tenantConduct.create({
      data: {
        rentOnTime: data.rentOnTime,
        rentOnTimeDetails: data.rentOnTimeDetails,
        rentArrears: data.rentArrears,
        rentArrearsDetails: data.rentArrearsDetails,
        propertyCondition: data.propertyCondition,
        propertyConditionDetails: data.propertyConditionDetails,
        complaints: data.complaints,
        complaintsDetails: data.complaintsDetails,
        endCondition: data.endCondition,
        endConditionDetails: data.endConditionDetails,
        rentAgain: data.rentAgain,
        rentAgainDetails: data.rentAgainDetails
      }
    });
  }
}

export default new LandlordReferenceService();
