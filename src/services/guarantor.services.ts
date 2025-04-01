import { prismaClient } from "..";
import { Prisma, EmploymentType } from "@prisma/client";
import { GuarantorInformationIF } from "../webuser/schemas/types";
import {
  GuarantorAgreement,
  GuarantorEmploymentInfo
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
  async createGuarantorAgreement(
    data: GuarantorAgreement
  ): Promise<Prisma.GuarantorAgreementGetPayload<{
    include: {
      guarantor: true;
      guarantorEmployment: true;
      application: true;
    };
  }>> {
    return prismaClient.$transaction(async (prisma) => {
      // Validate and create employment info if provided
      let employmentInfo = await prisma.guarantorEmploymentInfo.create({
        data: this.mapEmploymentData(data.guarantorEmployment)
      });
      // Validate guarantor exists
      const guarantor = await prisma.application.findFirst({
        where: { id: data.applicationId}, include:{guarantorInformation: true}
      });
      if (!guarantor) {
        throw new Error(`Guarantor not found`);
      }
      // Create main agreement
      const created = await prisma.guarantorAgreement.create({
        data: {
          status: data.status,
          agreementText: data.agreementText,
          signedByGuarantor: data.signedByGuarantor || false,
          guarantorSignature: data.guarantorSignature,
          guarantorSignedAt: data.guarantorSignedAt,
          applicationId: data.applicationId,
          guarantorId: guarantor.id,
          guarantorEmploymentId: employmentInfo?.id
        },
        include: {
          guarantor: true,
          guarantorEmployment: true,
          application: true
        }
      });

      if (created){
        await applicantService.updateApplicationStatus(data.applicationId, ApplicationStatus.GUARANTOR_REFERENCE)
      }
      return created
    });
  }

  private mapEmploymentData(data: GuarantorEmploymentInfo) {
    const baseData = {
      employmentType: data.employmentType,
      annualIncome: data.annualIncome,
    };

    switch (data.employmentType) {
      case EmploymentType.EMPLOYED:
        return {
          ...baseData,
          employerName: data.employerName,
          jobTitle: data.jobTitle,
          employmentStartDate: data.employmentStartDate,
          employerAddress: data.employerAddress,
          employerPhone: data.employerPhone,
          employerEmail: data.employerEmail
        };
      case EmploymentType.SELF_EMPLOYED:
        return {
          ...baseData,
          businessName: data.businessName,
          businessNature: data.businessNature,
          yearsInBusiness: data.yearsInBusiness,
          businessAddress: data.businessAddress,
          accountantName: data.accountantName,
          accountantContact: data.accountantContact,
          utrNumber: data.utrNumber
        };
      case EmploymentType.FREELANCE:
        return {
          ...baseData,
          freelanceType: data.freelanceType,
          yearsFreelancing: data.yearsFreelancing,
          monthlyIncome: data.monthlyIncome,
          portfolioWebsite: data.portfolioWebsite,
          majorClients: data.majorClients
        };
      case EmploymentType.DIRECTOR:
        return {
          ...baseData,
          companyName: data.companyName,
          companyNumber: data.companyNumber,
          position: data.position,
          ownershipPercentage: data.ownershipPercentage,
          companyFounded: data.companyFounded,
          companyAddress: data.companyAddress
        };
      case EmploymentType.SOLE_PROPRIETOR:
        return {
          ...baseData,
          businessRegistrationNumber: data.businessRegistrationNumber
        };
      default:
        throw new Error(`Invalid employment type: ${data.employmentType}`);
    }
  }
}

export default new GuarantorService();
