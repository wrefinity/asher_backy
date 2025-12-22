import { prismaClient } from "../..";
import { AgreementDocument, AgreementStatus, InvitedStatus, Prisma, YesNo } from "@prisma/client";
import { ApplicationStatus, InvitedResponse, ApplicationSaveState, LogType } from '@prisma/client';
import EmergencyinfoServices from "../../services/emergencyinfo.services";
import GuarantorServices from "../../services/guarantor.services";
import RefereesServices from "../../services/referees.services";
import ResidentialinfoServices from "../../services/residentialinfo.services";
import EmploymentinfoServices from "../../services/employmentinfo.services";
import PersonaldetailsServices from "../../services/personaldetails.services";
import NextkinServices from "../../services/nextkin.services";
import LogsServices from '../../services/logs.services';
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
import logsServices from "../../services/logs.services";

class ApplicantService {


  private userInclusion = {
    select: {
      id: true,
      email: true,
      profile: true
    }
  }
  private propsIncusion = {
    images: true,
    videos: true,
    virtualTours: true,
    propertyDocument: true,
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
    }
  }
  private applicationInclusion = {
    user: this.userInclusion,
    residentialInfo: {
      include: {
        prevAddresses: true,
        user: true,
      },
    },
    emergencyInfo: true,
    rooms: true,
    units: true,
    employmentInfo: true,
    documents: true,
    properties: {
      include: this.propsIncusion
    },
    personalDetails: {
      include: {
        nextOfKin: true,
      },
    },
    guarantorInformation: true,
    applicationQuestions: true,
    declaration: true,
    agreementDocument: true,
    referenceForm: {
      include: {
        tenancyReferenceHistory: true,
        conduct: true,
        externalLandlord: true
      }
    },
    guarantorAgreement: {
      include: {
        documents: true,
      }
    },
    employeeReference: true,
    referee: true,
    Log: true,
    applicationInvites: true
    // agreementDocumentUrl: true,
  }

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
  updateApplicationStatusStep = async (
    applicationId: string,
    status: ApplicationStatus
  ) => {
    try {
      // 1. Verify application exists
      const application = await prismaClient.application.findUnique({
        where: { id: applicationId },
        select: { statuesCompleted: true }
      });

      if (!application) {
        throw new Error(`Application with ID ${applicationId} not found`);
      }

      // 2. Check for existing status
      if (application.statuesCompleted?.includes(status)) {
        console.log(`Status "${status}" already exists. Skipping update.`);
        return;
      }

      // 3. Prepare updated array
      const updatedStatuses = [
        ...(application.statuesCompleted || []),
        status
      ];

      // update application
      const applicationExist = await prismaClient.application.update({
        where: { id: applicationId },
        data: {
          statuesCompleted: updatedStatuses,
          status,
        }
      });

      console.log(`Successfully added status "${status}" to application ${applicationId}`);
      if (!applicationExist?.applicationInviteId) {
        throw new Error('update the invites id on the application ');
      }
      return await this.getInvitedById(applicationExist?.applicationInviteId);

    } catch (error) {
      console.error(`Error updating application status: ${error.message}`);
      throw new Error('Failed to update application status');
    }
  };

  createApplication = async (data: ApplicantPersonalDetailsIF, ids: any, userId: string) => {
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

    const { propertyId: propertiesId, unitId, roomId } = ids
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
        createdAt: {
          gte: threeMonthsAgo, // Get applications made within the last 3 months
        },
      },
    });

    // If a recent application exists, prevent re-application
    // if (recentApplication) {
    //   throw new Error("You have already applied for this property in the last 3 months. Please wait before reapplying.");
    // }

    // Create application record
    const app = await prismaClient.application.create({
      data: {
        createdById: userId,
        invited,
        userId,
        propertiesId: propertiesId || undefined,
        roomId: roomId || undefined,           // Only include if room exists
        unitId: unitId || undefined,           // Only include if unit exists
        applicationInviteId: applicationInviteId,
        lastStep: ApplicationSaveState.PERSONAL_KIN,
        completedSteps: [ApplicationSaveState.PERSONAL_KIN],
        applicantPersonalDetailsId: upsertedPersonalDetails?.id ?? existingPersonalDetails?.id,
      },
    });

    if (app && data.applicationInviteId) {
      // Only update invites if applicationInviteId exists
      await this.updateInvites(data.applicationInviteId, {
        response: InvitedResponse.APPLICATION_STARTED
      });

      const logcreated = await LogsServices.checkPropertyLogs(
        userId,
        LogType.APPLICATION,
        propertiesId,
        app.id
      );

      if (!logcreated) {
        await LogsServices.createLog({
          propertyId: propertiesId,
          subjects: "Application Started",
          events: "Application in progress",
          createdById: userId,
          type: LogType.APPLICATION,
          applicationId: app.id
        });
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
      docInfo = await prismaClient.propertyDocument.update({
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
      docInfo = await prismaClient.propertyDocument.create({
        data: {
          ...rest,
          documentUrl,
          application: {
            connect: { id: applicationId },
          },
        },
      });

      // Update progress
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
      include: this.applicationInclusion,
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
        await this.updateLastStepStop(applicationId, ApplicationSaveState.DECLARATION);
        await this.updateCompletedStep(applicationId, ApplicationSaveState.DECLARATION);
      }

      // await this.updateApplicationStatus(applicationId, ApplicationStatus.SUBMITTED)
      // update application invite to submitted
      // const application = await this.getApplicationById(applicationId)
      // await applicationServices.updateInviteResponse(application.applicationInviteId, InvitedResponse.SUBMITTED)
      return declared;
    }
    return
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
      include: this.applicationInclusion,
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
      include: this.applicationInclusion,
    });
  }

  checkApplicationExistance = async (applicationId: string) => {
    // Check if the application exists
    return await prismaClient.application.findUnique({
      where: { id: applicationId },
      include: this.applicationInclusion
    });
  }
  updateApplicationStatus = async (applicationId: string, status: ApplicationStatus) => {
    const updated = await prismaClient.application.update({
      where: { id: applicationId },
      data: { status }
    });
    if (updated && status === ApplicationStatus.COMPLETED) {
      // update application invite to submitted
      this.updateInvites(updated.applicationInviteId, { response: InvitedResponse.SUBMITTED })
    }
    return updated;
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
      include: this.applicationInclusion,
    });
  }

  // statistics
  countApplicationStatsForLandlord = async (landlordId: string) => {
    return {
      pending: await this.getInvitesApplicationCountForLandlordWithStatus(landlordId, InvitedResponse.PENDING),
      approved: await this.getInvitesApplicationCountForLandlordWithStatus(landlordId, InvitedResponse.APPROVED),
      completed: await this.getInvitesApplicationCountForLandlordWithStatus(landlordId, InvitedResponse.SUBMITTED),
      total: await this.getInvitesApplicationCountForLandlordWithStatus(landlordId),
      enquiries: await logsServices.getLogCounts(landlordId, LogType.FEEDBACK),
    };
  };


  getInvitedById = async (id: string) => {
    if (!id) {
      throw new Error("Invalid application invite ID");
    }

    return await prismaClient.applicationInvites.findFirst({
      where: { id },
      include: {
        enquires: true,
        units: true,
        rooms: true,
        propertyListing: true,
        userInvited: this.userInclusion,
        properties: {
          include: this.propsIncusion,
        }
      },
    });
  }

  getInvitesApplicationCountForLandlordWithStatus = async (
    landlordId: string,
    response?: InvitedResponse
  ) => {
    return await prismaClient.applicationInvites.count({
      where: {
        ...(response && { response }),
        isDeleted: false,
        properties: {
          landlordId: landlordId,
          isDeleted: false,
        },
      },
    });
  };

  async getInvite(filters: { userInvitedId?: string; response?: InvitedResponse[] }, includeApplication = true) {
    const whereClause: Prisma.applicationInvitesWhereInput = {};

    if (filters.userInvitedId) {
      whereClause.userInvitedId = filters.userInvitedId;
    }

    if (!includeApplication) {
      whereClause.application = null;
    }

    if (filters.response) {
      whereClause.response = {
        in: filters.response
      };
    }

    return await prismaClient.applicationInvites.findMany({
      where: whereClause,
      include: {
        enquires: true,
        units: true,
        rooms: true,
        propertyListing: true,
        userInvited: this.userInclusion,
        properties: {
          include: this.propsIncusion,
        },
        // Conditionally include application based on parameter
        ...(includeApplication && {
          application: {
            include: this.applicationInclusion
          }
        })
      },
    });
  }

  async updateInvites(id, updateData: ApplicationInvite) {
    return await applicationServices.updateInvite(id, updateData);
  }

  async upsertAgreementDocument(
    value: {
      templateId: string;
      templateVersion: number;
      documentUrl?: string | string[];
      processedContent?: string;
      variables: any;
      applicationId: string;
      metadata?: any;
    },
    userId: string,
    agreementId?: string
  ) {
    // Process document URLs - ensure we always have an array
    const documentUrls = this.processDocumentUrls(value.documentUrl);

    // Check template existence
    const templateExists = await prismaClient.docuTemplate.findUnique({
      where: { id: value.templateId }
    });
    if (!templateExists) throw new Error('Template not found');

    // Verify application exists
    const application = await prismaClient.application.findUnique({
      where: { id: value.applicationId }
    });
    if (!application) throw new Error(`Application ${value.applicationId} not found`);

    // Get existing document URLs if updating
    const existingDoc = agreementId ? await prismaClient.agreementDocument.findUnique({
      where: { id: agreementId }
    }) : null;

    // Prepare data with proper type handling
    const baseData: Prisma.AgreementDocumentCreateInput | Prisma.AgreementDocumentUpdateInput = {
      templateVersion: value.templateVersion,
      documentUrl: { set: documentUrls },
      processedContent: value.processedContent,
      variables: value.variables,
      metadata: value.metadata,
      updatedAt: new Date()
    };

    return await prismaClient.agreementDocument.upsert({
      where: { id: agreementId || '' },
      create: {
        ...baseData as Prisma.AgreementDocumentCreateInput,
        documentTemplate: { connect: { id: value.templateId } },
        application: { connect: { id: value.applicationId } },
        createdBy: userId,
        sentAt: new Date()
      },
      update: {
        ...baseData as Prisma.AgreementDocumentUpdateInput,
        documentTemplate: { connect: { id: value.templateId } }
      },
      include: {
        documentTemplate: true,
        application: true
      }
    });
  }

  async signTenantAgreementDocument(
    value: {
      documentUrl?: string | string[];
      processedContent: string;
      metadata: any;
    },
    userId: string,
    agreementId: string
  ): Promise<AgreementDocument> {
    const documentUrls = this.processDocumentUrls(value.documentUrl);

    const currentAgreement = await prismaClient.agreementDocument.findUnique({
      where: { id: agreementId }
    });

    if (!currentAgreement) {
      throw new Error('Agreement not found');
    }

    const updateData: Prisma.AgreementDocumentUpdateInput = {
      signedByTenantAt: new Date(),
      processedContent: value.processedContent,
      // documentUrl: { set: documentUrls },
      documentUrl: { set: this.mergeDocumentUrls(documentUrls, currentAgreement.documentUrl) },
      metadata: {
        ...(value.metadata as object),
        tenantSignature: {
          signedAt: new Date(),
          ipAddress: value.metadata?.ipAddress,
          userAgent: value.metadata?.userAgent,
          signature: value.metadata?.signature
        }
      },
      agreementStatus: await this.getUpdatedAgreementStatus(agreementId, 'TENANT')
    };

    return await prismaClient.agreementDocument.update({
      where: { id: agreementId },
      data: updateData,
      include: {
        application: true,
        documentTemplate: true
      }
    });
  }
  async signAgreementDocumentLandlord(
    value: {
      documentUrl?: string | string[];
      processedContent: string;
      metadata: any;
    },
    userId: string,
    agreementId: string
  ): Promise<AgreementDocument> {
    const documentUrls = this.processDocumentUrls(value.documentUrl);

    const currentAgreement = await prismaClient.agreementDocument.findUnique({
      where: { id: agreementId }
    });

    if (!currentAgreement) {
      throw new Error('Agreement not found');
    }

    const updateData: Prisma.AgreementDocumentUpdateInput = {
      signedByLandlordAt: new Date(),
      processedContent: value.processedContent,
      documentUrl: { set: this.mergeDocumentUrls(documentUrls, currentAgreement.documentUrl) },
      metadata: {
        ...(value.metadata as object),
        landlordSignature: {
          signedAt: new Date(),
          ipAddress: value.metadata.ipAddress,
          userAgent: value.metadata.userAgent,
          signature: value.metadata.signature
        }
      },
      agreementStatus: await this.getUpdatedAgreementStatus(agreementId, 'LANDLORD')
    };

    return await prismaClient.agreementDocument.update({
      where: { id: agreementId },
      data: updateData,
      include: {
        application: true,
        documentTemplate: true
      }
    });
  }

  // Helper methods with proper typing
  private processDocumentUrls(urls?: string | string[]): string[] {
    if (!urls) return [];
    return Array.isArray(urls) ? urls : [urls];
  }

  private mergeDocumentUrls(newUrls: string[], existingUrls: string[]): string[] {
    return [...new Set([...newUrls, ...existingUrls])];
  }
  private async getUpdatedAgreementStatus(agreementId: string, signedBy: 'TENANT' | 'LANDLORD') {
    const agreement = await prismaClient.agreementDocument.findUnique({
      where: { id: agreementId },
      select: { signedByTenantAt: true, signedByLandlordAt: true }
    });
    if (!agreement) return AgreementStatus.PENDING;

    if (signedBy === 'TENANT' && agreement.signedByLandlordAt) return 'COMPLETED';
    if (signedBy === 'LANDLORD' && agreement.signedByTenantAt) return 'COMPLETED';
    return signedBy === 'TENANT' ? AgreementStatus.SIGNED_BY_TENANT : AgreementStatus.SIGNED_BY_LANDLORD;
  }
  getAgreementById = async (applicationId: string) => {
    return await prismaClient.agreementDocument.findUnique({
      where: { id: applicationId },
      include: {
        application: {
          include: {
            properties: true,
            user: this.userInclusion
          }
        }
      }
    });
  }

  copyApplicationDataToTenant = async (applicationId: string) => {
    const application = await prismaClient.application.findUnique({
      where: { id: applicationId },
      include: {
        user: true,
        personalDetails: {
          include: {
            nextOfKin: true
          }
        },
        residentialInfo: {
          include: {
            prevAddresses: true
          }
        },
        emergencyInfo: true,
        employmentInfo: true,
        guarantorInformation: true,
        applicationQuestions: true,
        declaration: true,
        referee: true,
        properties: true,
        units: true,
        rooms: true,
        tenant: true,
      }
    });

    if (!application) {
      throw new Error('Application not found');
    }
    console.log(application)

    if (!application.tenant) {
      throw new Error('No tenant found for this application');
    }


    // Prepare JSON data
    const applicationData = {
      personalInfo: application.personalDetails,
      nextOfKinInfo: application.personalDetails?.nextOfKin,
      employmentInfo: application.employmentInfo,
      guarantorInfo: application.guarantorInformation,
      emergencyContactInfo: application.emergencyInfo,
      residentialInfo: application.residentialInfo,
      applicationQuestions: application.applicationQuestions,
      declarationInfo: application.declaration,
      refereeInfo: application.referee,
      applicationMetadata: {
        applicationId: application.id,
        appliedAt: application.createdAt,
        status: application.status
      }
    };

    // Update tenant with application data
    const updatedTenant = await prismaClient.tenants.update({
      where: { id: application.tenant.id },
      data: {
        personalInfo: applicationData.personalInfo,
        nextOfKinInfo: applicationData.nextOfKinInfo,
        employmentInfo: applicationData.employmentInfo,
        guarantorInfo: applicationData.guarantorInfo,
        emergencyContactInfo: applicationData.emergencyContactInfo,
        residentialInfo: applicationData.residentialInfo,
        applicationQuestions: applicationData.applicationQuestions,
        declarationInfo: applicationData.declarationInfo
      }
    });

    return updatedTenant;
  }

  // Get tenant with application data
  getTenantWithApplicationData = async (tenantId: string) => {
    return await prismaClient.tenants.findUnique({
      where: { id: tenantId },
      select: {
        id: true,
        tenantId: true,
        tenantCode: true,
        applicationId: true,
        personalInfo: true,
        nextOfKinInfo: true,
        employmentInfo: true,
        guarantorInfo: true,
        emergencyContactInfo: true,
        residentialInfo: true,
        applicationQuestions: true,
        declarationInfo: true,
        leaseStartDate: true,
        leaseEndDate: true,
        user: {
          select: {
            id: true,
            email: true,
            profile: true,
          }
        },
        property: {
          select: {
            id: true,
            name: true,
            address: true,
            price: true,
            securityDeposit: true,
            currency: true,
            priceFrequency: true,
            rentalPeriod: true,
          }
        },
        landlord: {
          select: {
            id: true,
          }
        }
      }
    });
  }

  // Update specific tenant application data
  updateTenantApplicationData = async (tenantId: string, data: {
    personalInfo?: any;
    nextOfKinInfo?: any;
    employmentInfo?: any;
    guarantorInfo?: any;
    emergencyContactInfo?: any;
    // residentialInfo?: any;
    // applicationQuestions?: any;
    // declarationInfo?: any;
  }) => {
    return await prismaClient.tenants.update({
      where: { id: tenantId },
      data: {
        ...(data.personalInfo && { personalInfo: data.personalInfo }),
        ...(data.nextOfKinInfo && { nextOfKinInfo: data.nextOfKinInfo }),
        ...(data.employmentInfo && { employmentInfo: data.employmentInfo }),
        ...(data.guarantorInfo && { guarantorInfo: data.guarantorInfo }),
        ...(data.emergencyContactInfo && { emergencyContactInfo: data.emergencyContactInfo }),
        //   ...(data.residentialInfo && { residentialInfo: data.residentialInfo }),
        //   ...(data.applicationQuestions && { applicationQuestions: data.applicationQuestions }),
        //   ...(data.declarationInfo && { declarationInfo: data.declarationInfo })
      }
    });
  }

  // Get application data for a user's last approved application
  getLastApplicationDataForUser = async (userId: string) => {

    const lastApplication = await prismaClient.application.findFirst({
      where: {
        userId: userId,

        status: {
          in: [ApplicationStatus.COMPLETED, ApplicationStatus.TENANT_CREATED, ApplicationStatus.APPROVED]
        },
      },
      orderBy: {
        createdAt: 'desc'
      },
      include: {
        personalDetails: {
          include: {
            nextOfKin: true
          }
        },
        residentialInfo: {
          include: {
            prevAddresses: true
          }
        },
        emergencyInfo: true,
        employmentInfo: true,
        guarantorInformation: true,
        applicationQuestions: true,
        declaration: true,
        referee: true,
        properties: true,
        units: true,
        rooms: true
      }
    });

    if (!lastApplication) {
      return null;
    }

    return {
      personalInfo: lastApplication.personalDetails,
      nextOfKinInfo: lastApplication.personalDetails?.nextOfKin,
      employmentInfo: lastApplication.employmentInfo,
      guarantorInfo: lastApplication.guarantorInformation,
      emergencyContactInfo: lastApplication.emergencyInfo,
      residentialInfo: lastApplication.residentialInfo,
      applicationQuestions: lastApplication.applicationQuestions,
      declarationInfo: lastApplication.declaration,
      refereeInfo: lastApplication.referee,
      propertyInfo: {
        property: lastApplication.properties,
        unit: lastApplication.units,
        room: lastApplication.rooms
      }
    };
  }
  async createApplicationFromLast(userId: string, inviteId: string, applicationFee: YesNo = YesNo.NO) {
    // Step 1: Get the last completed application
    const lastApplication = await prismaClient.application.findFirst({
      where: {
        userId,
        status: {
          in: [
            ApplicationStatus.COMPLETED,
            ApplicationStatus.TENANT_CREATED,
            ApplicationStatus.APPROVED
          ],
        },
        isDeleted: false,
      },
      orderBy: { createdAt: 'desc' },
      include: {
        personalDetails: { include: { nextOfKin: true } },
        residentialInfo: { include: { prevAddresses: true } },
        emergencyInfo: true,
        employmentInfo: true,
        guarantorInformation: true,
        referee: true,
        applicationQuestions: true,
        declaration: true,
      },
    });

    if (!lastApplication) {
      throw new Error('No completed or approved application found for this user.');
    }

    // Step 2: Clone each related record (deep copy to allow editing per application)
    const newPersonal = await prismaClient.applicantPersonalDetails.create({
      data: {
        title: lastApplication.personalDetails.title,
        firstName: lastApplication.personalDetails.firstName,
        middleName: lastApplication.personalDetails.middleName,
        lastName: lastApplication.personalDetails.lastName,
        dob: lastApplication.personalDetails.dob,
        email: lastApplication.personalDetails.email,
        phoneNumber: lastApplication.personalDetails.phoneNumber,
        maritalStatus: lastApplication.personalDetails.maritalStatus,
        nationality: lastApplication.personalDetails.nationality,
        identificationType: lastApplication.personalDetails.identificationType,
        identificationNo: lastApplication.personalDetails.identificationNo,
        issuingAuthority: lastApplication.personalDetails.issuingAuthority,
        expiryDate: lastApplication.personalDetails.expiryDate,
        userId,
      },
    });


    if (lastApplication.personalDetails.nextOfKin) {
      await prismaClient.nextOfKin.create({
        data: {
          lastName: lastApplication.personalDetails.nextOfKin.lastName,
          firstName: lastApplication.personalDetails.nextOfKin.firstName,
          middleName: lastApplication.personalDetails.nextOfKin.middleName,
          relationship: lastApplication.personalDetails.nextOfKin.relationship,
          email: lastApplication.personalDetails.nextOfKin.email,
          phoneNumber: lastApplication.personalDetails.nextOfKin.phoneNumber,
          userId,
          applicantPersonalDetailsId: newPersonal.id,
        },
      });
    }

    let newResidential = null;
    if (lastApplication.residentialInfo) {
      newResidential = await prismaClient.residentialInformation.create({
        data: {
          address: lastApplication.residentialInfo.address,
          addressStatus: lastApplication.residentialInfo.addressStatus,
          city: lastApplication.residentialInfo.city,
          state: lastApplication.residentialInfo.state,
          country: lastApplication.residentialInfo.country,
          zipCode: lastApplication.residentialInfo.zipCode,
          lengthOfResidence: lastApplication.residentialInfo.lengthOfResidence,
          reasonForLeaving: lastApplication.residentialInfo.reasonForLeaving,
          landlordOrAgencyPhoneNumber: lastApplication.residentialInfo.landlordOrAgencyPhoneNumber,
          landlordOrAgencyEmail: lastApplication.residentialInfo.landlordOrAgencyEmail,
          landlordOrAgencyName: lastApplication.residentialInfo.landlordOrAgencyName,
          userId,
          prevAddresses: {
            create: lastApplication.residentialInfo.prevAddresses.map((prev) => ({
              address: prev.address,
              lengthOfResidence: prev.lengthOfResidence,
            })),
          },
        },
      });
    }

    const newEmergency = lastApplication.emergencyInfo
      ? await prismaClient.emergencyContact.create({
        data: {
          fullname: lastApplication.emergencyInfo.fullname,
          phoneNumber: lastApplication.emergencyInfo.phoneNumber,
          email: lastApplication.emergencyInfo.email,
          address: lastApplication.emergencyInfo.address,
          userId,
        },
      })
      : null;

    const newEmployment = lastApplication.employmentInfo
      ? await prismaClient.employmentInformation.create({
        data: {
          ...lastApplication.employmentInfo,
          id: undefined,
          userId,
        },
      })
      : null;

    const newGuarantor = lastApplication.guarantorInformation
      ? await prismaClient.guarantorInformation.create({
        data: {
          ...lastApplication.guarantorInformation,
          id: undefined,
          userId,
        },
      })
      : null;

    const newReferee = lastApplication.referee
      ? await prismaClient.referees.create({
        data: {
          ...lastApplication.referee,
          id: undefined,
          userId,
        },
      })
      : null;

    // Step 3: Create new application record
    // For existing tenants, application should be created as COMPLETED since all info already exists
    const statuesCompleted: ApplicationStatus[] = [
      ApplicationStatus.SUBMITTED,
      ApplicationStatus.APPROVED,
      ApplicationStatus.COMPLETED
    ];
    const completedSteps: ApplicationSaveState[] = [
      ApplicationSaveState.PERSONAL_KIN,
      ApplicationSaveState.RESIDENTIAL_ADDRESS,
      ApplicationSaveState.EMPLOYMENT,
      ApplicationSaveState.ADDITIONAL_INFO,
      ApplicationSaveState.REFEREE,
      ApplicationSaveState.DOCUMENT_UPLOAD,
      ApplicationSaveState.GUARANTOR_INFO,
      ApplicationSaveState.DECLARATION
    ];

    const newApplication = await prismaClient.application.create({
      data: {
        userId,
        applicantPersonalDetailsId: newPersonal.id,
        residentialId: newResidential?.id || null,
        emergencyContactId: newEmergency?.id || null,
        employmentInformationId: newEmployment?.id || null,
        guarantorInformationId: newGuarantor?.id || null,
        refereeId: newReferee?.id || null,
        status: ApplicationStatus.COMPLETED,
        lastStep: ApplicationSaveState.DECLARATION,
        statuesCompleted: statuesCompleted,
        completedSteps: completedSteps,
        invited: InvitedStatus.NO,
        stepCompleted: 8,
        createdById: userId,
        applicationInviteId: inviteId ?? null,
      },
      include: { personalDetails: true },
    });

    // Step 4: Copy applicationQuestions and declaration (if any)
    if (lastApplication.applicationQuestions.length > 0) {
      await prismaClient.applicationQuestions.createMany({
        data: lastApplication.applicationQuestions.map((q) => ({
          havePet: q.havePet,
          youSmoke: q.youSmoke,
          requireParking: q.requireParking,
          haveOutstandingDebts: q.haveOutstandingDebts,
          additionalInformation: q.additionalInformation,
          additionalOccupants: q.additionalOccupants,
          applicantId: newApplication.id,
        })),
      });
    }

    if (lastApplication.declaration.length > 0) {
      await prismaClient.declaration.createMany({
        data: lastApplication.declaration.map((d) => ({
          declaration: d.declaration,
          additionalNotes: d.additionalNotes,
          date: new Date(),
          signature: d.signature,
          applicantId: newApplication.id,
        })),
      });
    }

    // Step 5: Link the application invite if provided
    if (inviteId) {
      await prismaClient.applicationInvites.update({
        where: { id: inviteId },
        data: {
          response: InvitedResponse.APPROVED,
          applicationFee,
          responseStepsCompleted: {
            push: [
              InvitedResponse.APPLY,
              InvitedResponse.APPLICATION_STARTED,
              InvitedResponse.SUBMITTED,
              InvitedResponse.APPROVED,
            ],
          },
          application: {
            connect: { id: newApplication.id },
          },
        },
      });
    }

    if (inviteId) {
      await prismaClient.applicationInvites.update({
        where: { id: inviteId },
        data: { application: { connect: { id: newApplication.id } },   response: InvitedResponse.APPROVED},
      });
    }

    return {
      message: 'New application created successfully from last application data.',
      applicationId: newApplication.id,
      application: newApplication,
    };
  }

  // Attach last application data to tenant
  attachLastApplicationDataToTenant = async (tenantId: string) => {
    const tenant = await prismaClient.tenants.findUnique({
      where: { id: tenantId },
      include: { user: true }
    });

    if (!tenant) {
      throw new Error('Tenant not found');
    }

    const lastApplicationData = await this.getLastApplicationDataForUser(tenant.userId);

    if (!lastApplicationData) {
      throw new Error('No approved application found for this user');
    }

    return await prismaClient.tenants.update({
      where: { id: tenantId },
      data: {
        personalInfo: lastApplicationData.personalInfo,
        nextOfKinInfo: lastApplicationData.nextOfKinInfo,
        employmentInfo: lastApplicationData.employmentInfo,
        guarantorInfo: lastApplicationData.guarantorInfo,
        emergencyContactInfo: lastApplicationData.emergencyContactInfo,
        residentialInfo: lastApplicationData.residentialInfo,
        applicationQuestions: lastApplicationData.applicationQuestions,
        declarationInfo: lastApplicationData.declarationInfo
      }
    });
  }
}

export default new ApplicantService();