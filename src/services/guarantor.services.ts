import { prismaClient } from "..";
import { Prisma } from "@prisma/client";
import { GuarantorInformationIF } from "../webuser/schemas/types";
import {
  GuarantorAgreement,
} from '../validations/interfaces/references.interfaces';
import applicantService from "../webuser/services/applicantService";
import { ApplicationSaveState, ApplicationStatus, GuarantorNominationStatus, NotificationCategory } from ".prisma/client";
import NotificationService from "./notification.service";
import { sendMail } from "../utils/emailer";
import { sendPreferenceAwareMail } from "../utils/sendPreferenceAwareMail";

function joinNameParts(...parts: Array<string | null | undefined>): string {
  return parts
    .map((p) => (p == null ? "" : String(p).trim()))
    .filter((p) => p && p.toLowerCase() !== "null" && p.toLowerCase() !== "undefined")
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();
}

class GuarantorService {
  // Upsert Guarantor Information
  upsertGuarantorInfo = async (data: GuarantorInformationIF, applicationId: string = null) => {
    const { userId, id, ...rest } = data;

    if (id) {
      // Check if the guarantor exists
      const existingGuarantor = await this.getGuarantorById(id)

      if (!existingGuarantor) {
        throw new Error(`Guarantor with ID ${id} does not exist.`);
      }
      // Perform update if id is provided
      return await prismaClient.guarantorInformation.update({
        where: { id },
        data: {
          ...rest,
          ...(rest.fullName || rest.email || rest.phoneNumber
            ? {
                nominationStatus: 'PENDING',
                nominationRespondedAt: null,
              }
            : {}),
          user: {
            connect: { id: userId },
          },
        },
      });
    } else {
      // Perform create if id is not provided
      const guarantorInfo = await prismaClient.guarantorInformation.create({
        data: {
          ...rest,
          nominationStatus: 'PENDING',
          nominationRespondedAt: null,
          user: {
            connect: { id: userId },
          },
        },
      });
      if (guarantorInfo) {
        await applicantService.updateLastStepStop(applicationId, ApplicationSaveState.GUARANTOR_INFO);
        await applicantService.updateCompletedStep(applicationId, ApplicationSaveState.GUARANTOR_INFO);
      }
      return guarantorInfo
    }
  };

  // Get Guarantor by userId
  getGuarantorByUserId = async (userId: string) => {
    return await prismaClient.guarantorInformation.findMany({
      where: { userId },
    });
  };
  // Get Guarantor by Id
  getGuarantorById = async (id: string) => {
    return await prismaClient.guarantorInformation.findUnique({
      where: { id },
    });
  };

  // Delete Guarantor by ID
  deleteGuarantorById = async (id: string) => {
    return await prismaClient.guarantorInformation.delete({
      where: { id },
    });
  };

  // guarantor reference services
  // 1. Use Prisma's generated type instead of custom interface
  async createGuarantorAgreement(
    data: Omit<Prisma.GuarantorAgreementCreateInput, 'documents'> & {
      documents?: (Omit<Prisma.propertyDocumentCreateWithoutAgreementInput, 'documentUrl'> & {
        documentUrl: string[];
      })[];
    },
    applicationId: string
  ): Promise<Prisma.GuarantorAgreementGetPayload<{
    include: {
      guarantor: true;
      application: true;
    };
  }>> {

    const existingForm = await prismaClient.guarantorAgreement.findFirst({
      where: { applicationId },
      include: {
        application: true
      }
    });

    if (existingForm) {
      throw Error("Guarantor reference completed");
    }

    return prismaClient.$transaction(async (prisma) => {
      const apx = await prisma.application.findFirst({
        where: { id: applicationId },
        include: { guarantorInformation: true }
      });

      if (!apx?.guarantorInformation) {
        throw new Error("Guarantor not found");
      }

      if (apx.guarantorInformation.nominationStatus !== "ACCEPTED") {
        throw new Error(
          "You must accept the guarantor nomination before completing this form"
        );
      }

      const created = await prisma.guarantorAgreement.create({
        data: {
          status: data.status,
          title: data.title,
          firstName: data.firstName,
          lastName: data.lastName,
          middleName: data.middleName,
          dateOfBirth: data.dateOfBirth,
          contactNumber: data.contactNumber,
          emailAddress: data.emailAddress,
          nationalInsuranceNumber: data.nationalInsuranceNumber,
          signedByGuarantor: data.signedByGuarantor || false,
          guarantorSignature: data.guarantorSignature,
          guarantorSignedAt: data.guarantorSignedAt,
          guarantorEmployment: data.guarantorEmployment,
          documents: data.documents && data.documents.length > 0
          ? {
              create: data.documents.map((doc) => ({
                documentName: doc.documentName,
                documentUrl: Array.isArray(doc.documentUrl) ? doc.documentUrl : [doc.documentUrl],
                type: doc.type,
                size: doc.size,
                idType: doc.idType,
                docType: doc.docType
              }))
            }
          : undefined,
        
          guarantor: {
            connect: { id: apx.guarantorInformation.id }
          },
          application: {
            connect: { id: applicationId }
          }
        },
        include: {
          guarantor: true,
          application: true
        }
      });

      if (created) {
        await applicantService.updateApplicationStatus(
          applicationId,
          ApplicationStatus.GUARANTOR_REFERENCE
        );
      }

      return created;
    }, {
      maxWait: 20000,
      timeout: 20000
    });
  }

  // private mapEmploymentData(data: GuarantorEmploymentInfo) {
  //   const baseData = {
  //     employmentType: data.employmentType,
  //     annualIncome: data.annualIncome,
  //   };

  //   switch (data.employmentType) {
  //     case EmploymentType.EMPLOYED:
  //       return {
  //         ...baseData,
  //         employerName: data.employerName,
  //         jobTitle: data.jobTitle,
  //         employmentStartDate: data.employmentStartDate,
  //         employerAddress: data.employerAddress,
  //         employerPhone: data.employerPhone,
  //         employerEmail: data.employerEmail
  //       };
  //     case EmploymentType.SELF_EMPLOYED:
  //       return {
  //         ...baseData,
  //         businessName: data.businessName,
  //         businessNature: data.businessNature,
  //         yearsInBusiness: data.yearsInBusiness,
  //         businessAddress: data.businessAddress,
  //         accountantName: data.accountantName,
  //         accountantContact: data.accountantContact,
  //         utrNumber: data.utrNumber
  //       };
  //     case EmploymentType.FREELANCE:
  //       return {
  //         ...baseData,
  //         freelanceType: data.freelanceType,
  //         yearsFreelancing: data.yearsFreelancing,
  //         monthlyIncome: data.monthlyIncome,
  //         portfolioWebsite: data.portfolioWebsite,
  //         majorClients: data.majorClients
  //       };
  //     case EmploymentType.DIRECTOR:
  //       return {
  //         ...baseData,
  //         companyName: data.companyName,
  //         companyNumber: data.companyNumber,
  //         position: data.position,
  //         ownershipPercentage: data.ownershipPercentage,
  //         companyFounded: data.companyFounded,
  //         companyAddress: data.companyAddress
  //       };
  //     case EmploymentType.SOLE_PROPRIETOR:
  //       return {
  //         ...baseData,
  //         businessRegistrationNumber: data.businessRegistrationNumber
  //       };
  //     default:
  //       throw new Error(`Invalid employment type: ${data.employmentType}`);
  //   }
  // }

  respondToNomination = async (
    applicationId: string,
    response: Extract<GuarantorNominationStatus, "ACCEPTED" | "DECLINED">
  ) => {
    const application = await prismaClient.application.findUnique({
      where: { id: applicationId },
      include: {
        guarantorInformation: true,
        personalDetails: true,
        user: true,
        createdBy: true,
        properties: true,
      },
    });

    if (!application?.guarantorInformation) {
      throw new Error("No guarantor nomination found for this application");
    }

    const guarantor = application.guarantorInformation;

    if (guarantor.nominationStatus === "ACCEPTED" && response === "ACCEPTED") {
      return { application, guarantor, alreadyAccepted: true };
    }

    if (guarantor.nominationStatus === "DECLINED") {
      throw new Error("This guarantor nomination has already been declined");
    }

    const tenantName = joinNameParts(
      application.personalDetails?.title,
      application.personalDetails?.firstName,
      application.personalDetails?.middleName,
      application.personalDetails?.lastName
    );
    const guarantorName = joinNameParts(guarantor.fullName);
    const propertyLabel =
      joinNameParts(
        application.properties?.address,
        application.properties?.city,
        application.properties?.country
      ) || "the property";

    if (response === "ACCEPTED") {
      const updatedGuarantor = await prismaClient.guarantorInformation.update({
        where: { id: guarantor.id },
        data: {
          nominationStatus: "ACCEPTED",
          nominationRespondedAt: new Date(),
        },
      });
      return { application, guarantor: updatedGuarantor, alreadyAccepted: false };
    }

    await prismaClient.$transaction(async (tx) => {
      await tx.guarantorInformation.update({
        where: { id: guarantor.id },
        data: {
          nominationStatus: "DECLINED",
          nominationRespondedAt: new Date(),
        },
      });

      const completedSteps = (application.completedSteps || []).filter(
        (step) => step !== ApplicationSaveState.GUARANTOR_INFO
      );

      await tx.application.update({
        where: { id: applicationId },
        data: {
          guarantorInformationId: null,
          guarantorVerificationStatus: null,
          lastStep: ApplicationSaveState.GUARANTOR_INFO,
          completedSteps: { set: completedSteps },
        },
      });
    });

    const tenantUserId = application.userId;
    const landlordUserId = application.createdById;
    const message = `${guarantorName} has declined to act as guarantor for ${tenantName}'s application (${propertyLabel}). The tenant will need to nominate another guarantor.`;

    if (tenantUserId) {
      await NotificationService.createNotification(
        {
          destId: tenantUserId,
          title: "Guarantor declined nomination",
          message,
          category: NotificationCategory.COMMUNICATION,
        },
        NotificationCategory.COMMUNICATION
      );
      if (application.user?.email) {
        await sendMail(
          application.user.email,
          "Guarantor declined your nomination",
          `<p>${message}</p><p>Please sign in to your application and nominate another guarantor if required.</p>`
        );
      }
    }

    if (landlordUserId) {
      await NotificationService.createNotification(
        {
          sourceId: tenantUserId || undefined,
          destId: landlordUserId,
          title: "Guarantor declined nomination",
          message,
          category: NotificationCategory.COMMUNICATION,
        },
        NotificationCategory.COMMUNICATION
      );
      if (application.createdBy?.email) {
        await sendPreferenceAwareMail({
          userId: landlordUserId,
          category: NotificationCategory.COMMUNICATION,
          notificationType: 'guarantor_declined',
          to: application.createdBy.email,
          subject: 'Guarantor declined tenant nomination',
          html: `<p>${message}</p>`,
        });
      }
    }

    const updatedGuarantor = await prismaClient.guarantorInformation.findUnique({
      where: { id: guarantor.id },
    });

    return { application, guarantor: updatedGuarantor, declined: true };
  };
}

export default new GuarantorService();
