import { prismaClient } from "..";
import ApplicationServices from "../webuser/services/applicantService";
import { EmploymentInformationIF } from "../webuser/schemas/types";
import { ApplicationSaveState, ApplicationStatus, GuarantorNominationStatus } from '@prisma/client';
import { IEmployeeReference } from '../validations/interfaces/references.interfaces';
import applicantService from "../webuser/services/applicantService";
import {
  joinReferenceNameParts,
  notifyReferenceDeclined,
} from "../utils/referenceNomination.utils";

class EmploymentService {
  // Upsert Employment Information
  upsertEmploymentInfo = async (data: EmploymentInformationIF, applicationId: string = null) => {
    const {
      userId,
      id,
      businessType,
      businessEmail,
      businessPhone,
      applicationId: _applicationId,
      ...rest
    } = data as EmploymentInformationIF & {
      businessType?: string;
      businessEmail?: string;
      businessPhone?: string;
      applicationId?: string;
    };

    const prismaData = {
      ...rest,
      ...(businessEmail && !rest.employerEmail ? { employerEmail: businessEmail } : {}),
      ...(businessPhone && !rest.employerPhone ? { employerPhone: businessPhone } : {}),
      ...(businessType && !rest.moreDetails
        ? { moreDetails: `Business type: ${businessType}` }
        : {}),
    };

    if (id) {
      // Check if the employment record exists
      const existingRecord = await this.getEmploymentInfoById(id);

      if (!existingRecord) {
        throw new Error(`Employment record with ID ${id} does not exist.`);
      }

      // Perform update if ID exists
      return await prismaClient.employmentInformation.update({
        where: { id },
        data: {
          ...prismaData,
          ...(prismaData.employerCompany ||
          prismaData.employerEmail ||
          prismaData.employerPhone
            ? {
                nominationStatus: "PENDING",
                nominationRespondedAt: null,
              }
            : {}),
          user: userId ? { connect: { id: userId } } : undefined,
        },
      });
    } else {
      const employmentInfo = await prismaClient.employmentInformation.create({
        data: {
          ...prismaData,
          nominationStatus: "PENDING",
          nominationRespondedAt: null,
          user: userId ? { connect: { id: userId } } : undefined,
        },
      });
      if (employmentInfo) {
        await ApplicationServices.updateLastStepStop(applicationId, ApplicationSaveState.EMPLOYMENT)
        await ApplicationServices.updateCompletedStep(applicationId, ApplicationSaveState.EMPLOYMENT)

      }
      return employmentInfo
    }
  };

  // Get Employment Information by userId
  getEmploymentInfoByUserId = async (userId: string) => {
    return await prismaClient.employmentInformation.findMany({
      where: { userId },
    });
  };

  // Get Employment Information by ID
  getEmploymentInfoById = async (id: string) => {
    return await prismaClient.employmentInformation.findUnique({
      where: { id },
    });
  };

  // Delete Employment Information by ID
  deleteEmploymentInfoById = async (id: string) => {
    return await prismaClient.employmentInformation.delete({
      where: { id },
    });
  };

  // employee reference information
  // =====================================
  respondToNomination = async (
    applicationId: string,
    response: Extract<GuarantorNominationStatus, "ACCEPTED" | "DECLINED">
  ) => {
    const application = await prismaClient.application.findUnique({
      where: { id: applicationId },
      include: {
        employmentInfo: true,
        personalDetails: true,
        user: true,
        createdBy: true,
        properties: true,
      },
    });

    if (!application?.employmentInfo) {
      throw new Error("No employer reference nomination found for this application");
    }

    const employment = application.employmentInfo;

    if (employment.nominationStatus === "ACCEPTED" && response === "ACCEPTED") {
      return { application, employment, alreadyAccepted: true };
    }

    if (employment.nominationStatus === "DECLINED") {
      throw new Error("This employer reference nomination has already been declined");
    }

    const tenantName = joinReferenceNameParts(
      application.personalDetails?.title,
      application.personalDetails?.firstName,
      application.personalDetails?.middleName,
      application.personalDetails?.lastName
    );
    const employerLabel =
      joinReferenceNameParts(employment.employerCompany) || "The nominated employer";
    const propertyLabel =
      joinReferenceNameParts(
        application.properties?.address,
        application.properties?.city,
        application.properties?.country
      ) || "the property";

    if (response === "ACCEPTED") {
      const updated = await prismaClient.employmentInformation.update({
        where: { id: employment.id },
        data: {
          nominationStatus: "ACCEPTED",
          nominationRespondedAt: new Date(),
        },
      });
      return { application, employment: updated, alreadyAccepted: false };
    }

    await prismaClient.$transaction(async (tx) => {
      await tx.employmentInformation.update({
        where: { id: employment.id },
        data: {
          nominationStatus: "DECLINED",
          nominationRespondedAt: new Date(),
        },
      });

      const completedSteps = (application.completedSteps || []).filter(
        (step) => step !== ApplicationSaveState.EMPLOYMENT
      );

      await tx.application.update({
        where: { id: applicationId },
        data: {
          employmentVerificationStatus: null,
          lastStep: ApplicationSaveState.EMPLOYMENT,
          completedSteps: { set: completedSteps },
        },
      });
    });

    const message = `${employerLabel} has declined to provide an employment reference for ${tenantName}'s application (${propertyLabel}). The tenant will need to provide another employer contact.`;

    await notifyReferenceDeclined({
      tenantUserId: application.userId,
      landlordUserId: application.createdById,
      tenantEmail: application.user?.email,
      propertyLandlordEmail: application.createdBy?.email,
      title: "Employer reference declined",
      message,
      tenantEmailSubject: "Employer declined your reference request",
      tenantEmailBody: `<p>${message}</p><p>Please sign in to your application and update your employment details if required.</p>`,
    });

    const updated = await prismaClient.employmentInformation.findUnique({
      where: { id: employment.id },
    });

    return { application, employment: updated, declined: true };
  };

  async createEmployeeReference(data: Omit<IEmployeeReference, 'id'>, applicationId: string) {
    try {

      // Check if reference form already exists for this application
      const existingForm = await prismaClient.employeeReferenceForm.findFirst({
        where: { applicationId },
        include: {
          application: true
        }
      });
      if (existingForm) {
        throw Error("Employment reference completed")
      }

      const application = await prismaClient.application.findFirst({
        where: { id: applicationId },
        include: { employmentInfo: true },
      });

      if (!application?.employmentInfo) {
        throw new Error("Employment information not found for this application");
      }

      if (application.employmentInfo.nominationStatus !== "ACCEPTED") {
        throw new Error(
          "You must accept the employer reference nomination before completing this form"
        );
      }

      const created = await prismaClient.employeeReferenceForm.create({
        data: {
          ...data,
          application: {
            connect: { id: applicationId }
          }
        }
      });

      if (created) {
        await applicantService.updateApplicationStatus(applicationId, ApplicationStatus.EMPLOYEE_REFERENCE)
      }
      return created
    } catch (error) {
      throw new Error(`Error creating employee reference: ${error}`);
    }
  }

  async updateEmployeeReference(id: string, data: Partial<IEmployeeReference>) {
    try {
      return await prismaClient.employeeReferenceForm.update({
        where: { id },
        data
      });
    } catch (error) {
      throw new Error(`Error updating employee reference: ${error}`);
    }
  }

  async getEmployeeReferenceById(id: string) {
    try {
      return await prismaClient.employeeReferenceForm.findUnique({
        where: { id }
      });
    } catch (error) {
      throw new Error(`Error fetching employee reference: ${error}`);
    }
  }

  async getAllEmployeeReferences() {
    try {
      return await prismaClient.employeeReferenceForm.findMany();
    } catch (error) {
      throw new Error(`Error fetching all employee references: ${error}`);
    }
  }
}

export default new EmploymentService();
