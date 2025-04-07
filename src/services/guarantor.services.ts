import { prismaClient } from "..";
import { Prisma } from "@prisma/client";
import { GuarantorInformationIF } from "../webuser/schemas/types";
import {
  GuarantorAgreement,
} from '../validations/interfaces/references.interfaces';
import applicantService from "../webuser/services/applicantService";
import { ApplicationSaveState, ApplicationStatus } from ".prisma/client";

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
    data: Prisma.GuarantorAgreementCreateInput, applicationId: string
  ): Promise<Prisma.GuarantorAgreementGetPayload<{
    include: {
      guarantor: true;
      guarantorEmployment: true;
      application: true;
    };
  }>> {

    // Check if reference form already exists for this application
    const existingForm = await prismaClient.guarantorAgreement.findFirst({
      where: { applicationId },
      include: {
        application: true
      }
    });
    if (existingForm) {
      throw Error("Guarantor reference completed")
    }

    return prismaClient.$transaction(async (prisma) => {
      const apx = await prisma.application.findFirst({
        where: { id: applicationId },
        include: { guarantorInformation: true }
      });
      if (!apx?.guarantorInformation) {
        throw new Error("Guarantor not found");
      }

      // 2. Create without spreading entire data object
      const created = await prisma.guarantorAgreement.create(
        {
          data: {
            status: data.status,
            title: data.title,
            firstName: data.firstName,
            lastName: data.lastName,
            middleName: data.middleName,
            dateOfBirth: data.dateOfBirth,
            contactNumber: data.contactNumber,
            documents: data.documents,
            emailAddress: data.emailAddress,
            nationalInsuranceNumber: data.nationalInsuranceNumber,
            signedByGuarantor: data.signedByGuarantor || false,
            guarantorSignature: data.guarantorSignature,
            guarantorSignedAt: data.guarantorSignedAt,
            guarantorEmployment: data.guarantorEmployment,
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
      maxWait: 20000, // Wait up to 20 seconds to acquire a connection from the pool
      timeout: 20000  // Allow 20 seconds for the transaction execution
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
}

export default new GuarantorService();
