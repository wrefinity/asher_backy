import { ApplicationStatus, Prisma } from "@prisma/client";
import { prismaClient } from "..";
import {
  LandlordReferenceFormCreateDTO,
  TenancyReferenceHistoryCreateDTO,
  ExternalLandlordCreateDTO,
  TenantConductCreateDTO
} from '../validations/interfaces/references.interfaces';
import applicantService from "../webuser/services/applicantService";
import { ConflictError } from "./error.service";
import { ApplicationSaveState, GuarantorNominationStatus } from ".prisma/client";
import {
  joinReferenceNameParts,
  notifyReferenceDeclined,
} from "../utils/referenceNomination.utils";
import {
  applicationPropertyLandlordInclude,
  resolveApplicationPropertyLandlordUser,
} from "../utils/resolveApplicationLandlord";

class LandlordReferenceService {
  respondToNomination = async (
    applicationId: string,
    response: Extract<GuarantorNominationStatus, "ACCEPTED" | "DECLINED">
  ) => {
    const application = await prismaClient.application.findUnique({
      where: { id: applicationId },
      include: {
        residentialInfo: true,
        personalDetails: true,
        user: true,
        createdBy: { select: { id: true, email: true, role: true } },
        properties: { include: applicationPropertyLandlordInclude },
      },
    });

    if (!application?.residentialInfo) {
      throw new Error("No landlord reference nomination found for this application");
    }

    const residential = application.residentialInfo;

    if (residential.nominationStatus === "ACCEPTED" && response === "ACCEPTED") {
      return { application, residential, alreadyAccepted: true };
    }

    if (residential.nominationStatus === "DECLINED") {
      throw new Error("This landlord reference nomination has already been declined");
    }

    const tenantName = joinReferenceNameParts(
      application.personalDetails?.title,
      application.personalDetails?.firstName,
      application.personalDetails?.middleName,
      application.personalDetails?.lastName
    );
    const refereeName = joinReferenceNameParts(residential.landlordOrAgencyName);
    const propertyLabel =
      joinReferenceNameParts(
        application.properties?.address,
        application.properties?.city,
        application.properties?.country
      ) || "the property";

    if (response === "ACCEPTED") {
      const updated = await prismaClient.residentialInformation.update({
        where: { id: residential.id },
        data: {
          nominationStatus: "ACCEPTED",
          nominationRespondedAt: new Date(),
        },
      });
      return { application, residential: updated, alreadyAccepted: false };
    }

    await prismaClient.$transaction(async (tx) => {
      await tx.residentialInformation.update({
        where: { id: residential.id },
        data: {
          nominationStatus: "DECLINED",
          nominationRespondedAt: new Date(),
        },
      });

      const completedSteps = (application.completedSteps || []).filter(
        (step) => step !== ApplicationSaveState.RESIDENTIAL_ADDRESS
      );

      await tx.application.update({
        where: { id: applicationId },
        data: {
          landlordVerificationStatus: null,
          lastStep: ApplicationSaveState.RESIDENTIAL_ADDRESS,
          completedSteps: { set: completedSteps },
        },
      });
    });

    const message = `${refereeName || "The nominated landlord"} has declined to provide a landlord reference for ${tenantName}'s application (${propertyLabel}). The tenant will need to provide another previous landlord contact.`;

    const propertyLandlord = await resolveApplicationPropertyLandlordUser(application);

    await notifyReferenceDeclined({
      tenantUserId: application.userId,
      landlordUserId: propertyLandlord?.id,
      tenantEmail: application.user?.email,
      propertyLandlordEmail: propertyLandlord?.email,
      title: "Landlord reference declined",
      message,
      tenantEmailSubject: "Previous landlord declined your reference request",
      tenantEmailBody: `<p>${message}</p><p>Please sign in to your application and update your previous landlord details if required.</p>`,
    });

    const updated = await prismaClient.residentialInformation.findUnique({
      where: { id: residential.id },
    });

    return { application, residential: updated, declined: true };
  };

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
        throw new ConflictError("Landlord reference already completed for this application");
      }

      const application = await prisma.application.findFirst({
        where: { id: applicationId },
        include: { residentialInfo: true },
      });

      if (!application?.residentialInfo) {
        throw new Error("Previous landlord information not found for this application");
      }

      if (application.residentialInfo.nominationStatus !== "ACCEPTED") {
        throw new Error(
          "You must accept the landlord reference nomination before completing this form"
        );
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
        monthlyRent: data.monthlyRent ?? data.rentAmount,
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
