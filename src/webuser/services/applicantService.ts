import { prismaClient } from "../..";
import { Prisma } from "@prisma/client";
import { ApplicationStatus, InvitedResponse, ApplicationSaveState, userRoles } from '@prisma/client';
import userServices from "../../services/user.services";
import EmergencyinfoServices from "../../services/emergencyinfo.services";
import GuarantorServices from "../../services/guarantor.services";
import RefereesServices from "../../services/referees.services";
import ResidentialinfoServices from "../../services/residentialinfo.services";
import EmploymentinfoServices from "../../services/employmentinfo.services";
import PersonaldetailsServices from "../../services/personaldetails.services";
import NextkinServices from "../../services/nextkin.services";
import LogsServices from '../../services/logs.services';
import { LogType } from "@prisma/client"
import {
  RefreeIF,
  NextOfKinIF,
  AdditionalInformationIF,
  ApplicantPersonalDetailsIF,
  GuarantorInformationIF,
  EmergencyContactIF,
  AppDocumentIF,
  ResidentialInformationIF,
  EmploymentInformationIF,
  DeclarationIF
} from "../schemas/types"
import { ApplicationInvite } from "../../landlord/validations/interfaces/applications";

import applicationServices from "../../services/application.services";


class ApplicantService {

  updateLastStepStop = async (applicationId: string, lastStep: ApplicationSaveState) => {
    await prismaClient.application.update({
      where: { id: applicationId },
      data: {
        lastStep
      },
    });
  }
  updateCompletedStep = async (applicationId: string, step: ApplicationSaveState) => {
    // Fetch the current application to get the existing completedSteps
    const application = await prismaClient.application.findUnique({
      where: { id: applicationId },
      select: { completedSteps: true },
    });

    // Check if the step already exists in the completedSteps array
    if (application?.completedSteps?.includes(step)) {
      console.log(`Step "${step}" already exists in completedSteps. Skipping update.`);
      return; // Exit the function if the step already exists
    }

    // Create a new array with the step added
    const updatedSteps = [...(application?.completedSteps || []), step];

    // Update the application with the new array
    await prismaClient.application.update({
      where: { id: applicationId },
      data: {
        completedSteps: {
          set: updatedSteps, // Replace the array with the updated array
        },
      },
    });

    console.log(`Step "${step}" added to completedSteps.`);
  };

  incrementStepCompleted = async (applicationId: string, newField: 'residentialInfo' | 'guarantorInformation' | 'emergencyInfo' | 'employmentInfo' | 'refereeInfo' | 'additionalInfo' | 'documents' | 'declaration') => {
    // Fetch the current application details with relevant relationships
    const application = await prismaClient.application.findUnique({
      where: { id: applicationId },
      include: {
        residentialInfo: true,
        guarantorInformation: true,
        applicationQuestions: true,
        emergencyInfo: true,
        employmentInfo: true,
        documents: true,
        referee: true,
        declaration: true
      },
    });

    if (!application) {
      throw new Error(`Application with ID ${applicationId} not found`);
    }

    // Initialize the step increment to the current stepCompleted value
    let stepIncrement = application.stepCompleted ?? 1;

    // Check if the new field is connected and increment accordingly
    switch (newField) {
      case 'residentialInfo':
        if (application.hasOwnProperty('residentialInfo') && application.residentialInfo) {
          stepIncrement += 1;
        }
        break;
      case 'declaration':
        if (application.hasOwnProperty('declaration') && application.declaration) {
          stepIncrement += 1;
        }
        break;
      case 'additionalInfo':
        if (application.hasOwnProperty('applicationQuestions') && application.applicationQuestions) {
          stepIncrement += 1;
        }
        break;
      case 'guarantorInformation':
        if (application.hasOwnProperty('guarantorInformation') && application.guarantorInformation) {
          stepIncrement += 1;
        }
        break;
      case 'emergencyInfo':
        if (application.hasOwnProperty('emergencyInfo') && application.emergencyInfo) {
          stepIncrement += 1;
        }
        break;
      case 'employmentInfo':
        if (application.hasOwnProperty('employmentInfo') && application.employmentInfo) {
          stepIncrement += 1;
        }
        break;
      case 'refereeInfo':
        if (application.hasOwnProperty('referee') && application.referee) {
          stepIncrement += 1;
        }
        break;
      case 'documents':
        if (application.hasOwnProperty('documents') && application.documents.length == 0) {
          stepIncrement += 1;
        }
        break;
      default:
        throw new Error(`Invalid field: ${newField}`);
    }


    // Update the application with the incremented stepCompleted value if it changed
    if (stepIncrement !== application.stepCompleted) {
      await prismaClient.application.update({
        where: { id: applicationId },
        data: { stepCompleted: { increment: 1 } },
      });
    }
  };

  createApplication = async (data: ApplicantPersonalDetailsIF, propertiesId: string, userId: string) => {
    const {
      title,
      firstName,
      invited,
      middleName,
      lastName,
      dob,
      email,
      applicationInviteId,
      phoneNumber,
      maritalStatus,
      nextOfKin,
      nationality,
      identificationType,
      issuingAuthority,
      expiryDate,
    } = data;
    const nextOfKinData: NextOfKinIF = {
      id: nextOfKin?.id,
      firstName: nextOfKin.firstName,
      lastName: nextOfKin.lastName,
      relationship: nextOfKin.relationship,
      email: nextOfKin.email,
      userId: userId,
      phoneNumber: nextOfKin.phoneNumber,
      middleName: nextOfKin.middleName || null,
    };

    let nextOfKinId: string;

    // If an existing nextOfKin ID is provided, use it
    if (nextOfKin.id) {
      // Check if the provided nextOfKin ID exists in the database
      const existingNextOfKin = await NextkinServices.getNextOfKinById(nextOfKin.id);

      if (!existingNextOfKin) {
        throw new Error("Next of Kin not found with the provided ID");
      }

      // Use the existing nextOfKin ID
      nextOfKinId = existingNextOfKin.id;
    } else {
      // Otherwise, create nextOfKin
      const upsertedNextOfKin = await NextkinServices.upsertNextOfKinInfo({
        ...nextOfKinData
      });
      nextOfKinId = upsertedNextOfKin.id;
    }

    // Prepare personal details data
    const personalDetailsData: ApplicantPersonalDetailsIF = {
      title,
      firstName,
      middleName: middleName || null,
      lastName,
      dob,
      phoneNumber,
      maritalStatus,
      nationality,
      identificationType,
      issuingAuthority,
      expiryDate
    };

    // Check if applicantPersonalDetails already exist by email
    const existingPersonalDetails = await PersonaldetailsServices.getApplicantPersonalDetailsByEmail(email);

    let upsertedPersonalDetails;
    if (!existingPersonalDetails) {
      // Create new record if not found
      upsertedPersonalDetails = await prismaClient.applicantPersonalDetails.create({
        data: {
          ...personalDetailsData,
          email,
          nextOfKin: { connect: { id: nextOfKinId } },
        },
      });
    }
    // Get the current date
    const currentDate = new Date();

    // Calculate the date three months ago (90 days)
    const threeMonthsAgo = new Date();
    threeMonthsAgo.setDate(currentDate.getDate() - 90);

    // Check if the user has an existing application for the same property within the last 3 months
    const recentApplication = await prismaClient.application.findFirst({
      where: {
        userId,
        propertiesId,
        createdAt: {
          gte: threeMonthsAgo, // Get applications made within the last 3 months
        },
      },
    });

    // If a recent application exists, prevent re-application
    if (recentApplication) {
      throw new Error("You have already applied for this property in the last 3 months. Please wait before reapplying.");
    }

    // Create application record
    const app = await prismaClient.application.create({
      data: {
        propertiesId,
        createdById: userId,
        invited,
        userId,
        applicationInviteId: applicationInviteId,
        lastStep: ApplicationSaveState.PERSONAL_KIN,
        completedSteps: [ApplicationSaveState.PERSONAL_KIN],
        applicantPersonalDetailsId: upsertedPersonalDetails?.id ?? existingPersonalDetails?.id,
      },
    });

    if (app) {
      // check if propertyId have been applied before by the user 
      const logcreated = await LogsServices.checkPropertyLogs(
        userId,
        LogType.APPLICATION,
        propertiesId,
        app?.id
      )
      if (!logcreated) {
        await LogsServices.createLog({
          propertyId: propertiesId,
          subjects: "Application Started",
          events: "Application in progress",
          createdById: userId,
          type: LogType.APPLICATION,
          applicationId: app?.id
        })
      }
    }
    return app;
  };

  createOrUpdateGuarantor = async (data: GuarantorInformationIF) => {
    const { id, applicationId, userId, ...rest } = data;
    const guarantorInfo = await GuarantorServices.upsertGuarantorInfo({ ...rest, id, userId }, applicationId);
    // Find the application associated with the guarantor
    await prismaClient.application.findUnique({
      where: { id: applicationId },
      include: { guarantorInformation: true },
    });

    // Update the application with the new or updated guarantor information
    const updatedApplication = await prismaClient.application.update({
      where: { id: applicationId },
      data: {
        guarantorInformation: {
          connect: { id: guarantorInfo.id },
        },
      },
    });
    return { ...guarantorInfo, ...updatedApplication };
  }

  createOrUpdateEmergencyContact = async (data: EmergencyContactIF) => {
    const { applicationId, id, userId, ...rest } = data;

    // Upsert the emergency contact information
    const emergencyInfo = await EmergencyinfoServices.upsertEmergencyContact({ ...rest, id, userId }, applicationId);

    // Update the application with the new or updated emergency contact information
    const updatedApplication = await prismaClient.application.update({
      where: { id: applicationId },
      data: {
        emergencyInfo: {
          connect: { id: emergencyInfo.id },
        },
      },
    });
    return { ...emergencyInfo, ...updatedApplication };
  }
  createOrUpdateReferees = async (data: RefreeIF) => {
    const { id, applicationId, ...rest } = data;

    // Upsert the emergency contact information
    const refereesInfo = await RefereesServices.upsertRefereeInfo({ ...rest, id }, applicationId);
    console.log(refereesInfo)
    // Update the application with the new or updated referee information
    const updatedApplication = await prismaClient.application.update({
      where: { id: applicationId },
      data: {
        referee: {
          connect: { id: refereesInfo.id },
        },
      },
    });
    return { ...refereesInfo, ...updatedApplication };
  }

  createOrUpdateApplicationDoc = async (data: AppDocumentIF) => {
    const { id, applicationId, documentUrl, ...rest } = data;

    if (!documentUrl) {
      throw new Error("documentUrl is required");
    }

    let docInfo = null;
    if (id) {
      docInfo = await prismaClient.document.update({
        where: { id },
        data: {
          ...rest,
          documentUrl,
          application: {
            connect: { id: applicationId },
          },
        },
      });
    } else {
      docInfo = await prismaClient.document.create({
        data: {
          ...rest,
          documentUrl,
          application: {
            connect: { id: applicationId },
          },
        },
      });

      // Update progress
      await this.incrementStepCompleted(applicationId, "documents");
      await this.updateLastStepStop(applicationId, ApplicationSaveState.DOCUMENT_UPLOAD);
      await this.updateCompletedStep(applicationId, ApplicationSaveState.DOCUMENT_UPLOAD);
    }

    // Update application with the new document
    const updatedApplication = await prismaClient.application.update({
      where: { id: applicationId },
      data: {
        documents: {
          connect: { id: docInfo.id },
        },
      },
      include: {
        documents: true,
        guarantorInformation: true,
        personalDetails: true,
      },
    });

    return { ...docInfo, ...updatedApplication };
  };


  createOrUpdateResidentialInformation = async (data: ResidentialInformationIF) => {
    const { userId, applicationId, ...rest } = data;
    // Upsert residentialInformation with prevAddresses connected
    let resInfo = await ResidentialinfoServices.upsertResidentialInformation({ ...rest, userId }, applicationId);

    // Update the application with the new or updated residential info
    const updatedApplication = await prismaClient.application.update({
      where: { id: applicationId },
      data: {
        residentialInfo: {
          connect: { id: resInfo.id },
        },
      },
    });
    return { ...resInfo, ...updatedApplication };
  }
  createOrUpdateDeclaration = async (data: DeclarationIF) => {
    const { userId, id, applicationId, ...rest } = data;
    if (id) {
      // Check if the residentialInformation exists
      const existingRecord = await prismaClient.declaration.findFirst({
        where: { id }
      });

      if (!existingRecord) {
        throw new Error(`declaration with ID ${id} does not exist.`);
      }

      // Perform update if ID exists
      return await prismaClient.declaration.update({
        where: { id },
        data: {
          ...rest
        },
      });
    } else {
      // Perform create if ID does not exist
      const declared = await prismaClient.declaration.create({
        data: {
          ...rest,
          application: applicationId
            ? { connect: { id: applicationId } }
            : undefined,
        },
      });
      if (declared) {
        await this.incrementStepCompleted(applicationId, "declaration");
        await this.updateLastStepStop(applicationId, ApplicationSaveState.DECLARATION);
        await this.updateCompletedStep(applicationId, ApplicationSaveState.DECLARATION);
      }

      await this.updateApplicationStatus(applicationId, ApplicationStatus.SUBMITTED)
      return declared;
    }
    return;
  }

  createOrUpdateEmploymentInformation = async (data: EmploymentInformationIF) => {
    const { id, applicationId, userId, ...rest } = data;
    const empInfo = await EmploymentinfoServices.upsertEmploymentInfo({ ...rest, id, userId }, applicationId);
    if (!empInfo) {
      throw new Error(`Failed to create or update EmploymentInformation`);
    }
    // Update the application with the new or employemnt infor
    const updatedApplication = await prismaClient.application.update({
      where: { id: applicationId },
      data: {
        employmentInfo: {
          connect: { id: empInfo.id },
        },
      },
    });
    return { ...empInfo, ...updatedApplication };
  }


  createOrUpdateAdditionalInformation = async (data: AdditionalInformationIF) => {
    const { id, applicationId, ...rest } = data;

    // Check if an ID is provided
    if (id) {
      return await prismaClient.applicationQuestions.update({
        where: { id },
        data: rest,
      });
    } else {
      // Create a new record since no ID was provided
      const newRecord = await prismaClient.applicationQuestions.create({
        data: {
          application: { connect: { id: applicationId } },
          ...rest,
        },
      });
      if (newRecord) {
        await this.updateLastStepStop(applicationId, ApplicationSaveState.ADDITIONAL_INFO)
        await this.updateCompletedStep(applicationId, ApplicationSaveState.ADDITIONAL_INFO)
        await this.incrementStepCompleted(applicationId, "additionalInfo")
      }
      return newRecord;
    }
  }


  deleteApplicant = async (id: string) => {
    return await prismaClient.application.update({
      where: { id },
      data: {
        isDeleted: true
      }
    });
  }
  getApplicationsForLandlordWithStatus = async (
    landlordId: string,
    status?: ApplicationStatus // Make status optional
  ) => {
    return await prismaClient.application.findMany({
      where: {
        ...(status && { status }),
        isDeleted: false,
        properties: {
          landlordId: landlordId,
          isDeleted: false,
        },
      },
      include: {
        user: true,
        residentialInfo: true,
        emergencyInfo: true,
        employmentInfo: true,
        documents: true,
        properties: true,
        personalDetails: true,
        guarantorInformation: true,
        applicationQuestions: true,
        declaration: true
      },
    });
  };

  getApplicationCountForLandlordWithStatus = async (
    landlordId: string,
    status?: ApplicationStatus // Make status optional
  ) => {
    return await prismaClient.application.count({
      where: {
        ...(status && { status }),
        isDeleted: false,
        properties: {
          landlordId: landlordId,
          isDeleted: false,
        },
      },
    });
  };




  getApplicationById = async (applicationId: string) => {
    return await prismaClient.application.findUnique({
      where: { id: applicationId },
      include: {
        user: true,
        residentialInfo: {
          include: {
            prevAddresses: true,
            user: true,
          },
        },
        guarantorInformation: true,
        emergencyInfo: true,
        documents: true,
        employmentInfo: true,
        properties: true,
        referee: true,
        Log: true,
        declaration: true,
        applicationQuestions: true,
        personalDetails: {
          include: {
            nextOfKin: true,
          },
        },
      },
    });
  }

  checkApplicationExistance = async (applicationId: string) => {
    // Check if the application exists
    return await prismaClient.application.findUnique({
      where: { id: applicationId },
    });
  }
  updateApplicationStatus = async (applicationId: string, status: ApplicationStatus) => {
    return await prismaClient.application.update({
      where: { id: applicationId },
      data: { status }
    });
  }

  checkApplicationCompleted = async (applicationId: string) => {
    // Check if the application completed
    return await prismaClient.application.findFirst({
      where: { id: applicationId, status: ApplicationStatus.COMPLETED },
    });
  }

  getApplicationBasedOnStatus = async (userId: string, status: ApplicationStatus | ApplicationStatus[]) => {

    return await prismaClient.application.findMany({
      where: {
        userId: userId,
        status: Array.isArray(status) ? { in: status } : status,
        isDeleted: false,
      },
      include: {
        user: true,
        residentialInfo: {
          include: {
            prevAddresses: true,
            user: true,
          },
        },
        guarantorInformation: true,
        emergencyInfo: true,
        documents: true,
        employmentInfo: true,
        properties: true,
        referee: true,
        Log: true,
        declaration: true,
        applicationQuestions: true,
        personalDetails: {
          include: {
            nextOfKin: true,
          },
        },
      },
    });
  }

  // statistics
  countApplicationStatsForLandlord = async (landlordId: string) => {
    return {
      pending: await this.getApplicationCountForLandlordWithStatus(landlordId, ApplicationStatus.PENDING),
      approved: await this.getApplicationCountForLandlordWithStatus(landlordId, ApplicationStatus.ACCEPTED),
      completed: await this.getApplicationCountForLandlordWithStatus(landlordId, ApplicationStatus.COMPLETED),
      total: await this.getApplicationCountForLandlordWithStatus(landlordId),
    };
  };

  approveApplication = async (tenantData: any) => {
    return await userServices.createUser({ ...tenantData, role: userRoles.TENANT });
  }

  getInvitedById = async (id: string) =>{
    return await prismaClient.applicationInvites.findUnique({
      where: { id },
      include: {
        properties: {
          include: {
            landlord: {
              include: { 
                user: {
                  select: {
                    id: true,
                    email: true,
                    profile: true
                  },
                },
              }  
            }
          }
        }
      }
    });
  }

  async getInvite(filters: { userInvitedId?: string; response?: InvitedResponse }) {
    const whereClause = Object.entries(filters).reduce(
        (acc, [key, value]) => (value ? { ...acc, [key]: value } : acc),
        {} as Prisma.applicationInvitesWhereInput
    );

    return await prismaClient.applicationInvites.findMany({
        where: whereClause,
        include: {
            properties: {
                include: {
                    landlord: {
                        include: {
                            user: {
                                select: {
                                    id: true,
                                    email: true,
                                    profile: true,
                                },
                            },
                        },
                    },
                },
            },
        },
    });
}

  async updateInvites(id, updateData:ApplicationInvite) {
    return await applicationServices.updateInvite(id, updateData);
  } 
}

export default new ApplicantService();