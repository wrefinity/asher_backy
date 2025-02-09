import { prismaClient } from "../..";
import { ApplicationStatus, userRoles } from '@prisma/client';
import userServices from "../../services/user.services";
import EmergencyinfoServices from "../../services/emergencyinfo.services";
import GuarantorServices from "../../services/guarantor.services";
import RefereesServices from "../../services/referees.services";
import ResidentialinfoServices from "../../services/residentialinfo.services";
import EmploymentinfoServices from "../../services/employmentinfo.services";
import PersonaldetailsServices from "../../services/personaldetails.services";
import NextkinServices from "../../services/nextkin.services";
import {
  RefreeIF,
  NextOfKinIF,
  ApplicantPersonalDetailsIF,
  GuarantorInformationIF,
  EmergencyContactIF,
  AppDocumentIF,
  ResidentialInformationIF,
  EmploymentInformationIF
} from "../schemas/types"


class ApplicantService {

  incrementStepCompleted = async (applicationId: string, newField: 'residentialInfo' | 'guarantorInformation' | 'emergencyInfo' | 'employmentInfo' | 'refereeInfo' |'documents') => {
    // Fetch the current application details with relevant relationships
    const application = await prismaClient.application.findUnique({
      where: { id: applicationId },
      include: {
        residentialInfo: true,
        guarantorInformation: true,
        emergencyInfo: true,
        employmentInfo: true,
        documents: true,
        referee: true
      },
    });

    if (!application) {
      throw new Error(`Application with ID ${applicationId} not found`);
    }

    // Initialize the step increment to the current stepCompleted value
    let stepIncrement = application.stepCompleted ?? 1;

    // Check if the new field is not connected and increment accordingly
    switch (newField) {
      case 'residentialInfo':
        if (!application.residentialInfo) stepIncrement += 1;
        break;
      case 'guarantorInformation':
        if (!application.guarantorInformation) stepIncrement += 1;
        break;
      case 'emergencyInfo':
        if (!application.emergencyInfo) stepIncrement += 1;
        break;
      case 'employmentInfo':
        if (!application.employmentInfo) stepIncrement += 1;
        break;
      case 'refereeInfo':
        if (!application.referee) stepIncrement += 1;
        break;
      case 'documents':
        if (application.documents.length <= 1) stepIncrement += 1;
        break;
      default:
        throw new Error(`Invalid field: ${newField}`);
    }

    // Update the application with the incremented stepCompleted value if it changed
    if (stepIncrement !== application.stepCompleted) {
      await prismaClient.application.update({
        where: { id: applicationId },
        data: { stepCompleted: stepIncrement },
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
      invited,
      nationality,
      identificationType,
      issuingAuthority,
      expiryDate
    };

    // Check if applicantPersonalDetails already exist by email
    const existingPersonalDetails = await PersonaldetailsServices.getApplicantPersonalDetailsByEmail(email );

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
        userId,
        applicantPersonalDetailsId: upsertedPersonalDetails?.id ?? existingPersonalDetails?.id,
      },
    });
    return app;
  };

  createOrUpdateGuarantor = async (data: GuarantorInformationIF) => {
    const { id, applicationId, userId, ...rest } = data;
    const guarantorInfo = await GuarantorServices.upsertGuarantorInfo({...rest, id, userId});
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
    await this.incrementStepCompleted(applicationId, "guarantorInformation");
    return { ...guarantorInfo, ...updatedApplication };
  }

  createOrUpdateEmergencyContact = async (data: EmergencyContactIF) => {
    const { applicationId, id, userId, ...rest } = data;

    // Upsert the emergency contact information
    const emergencyInfo = await EmergencyinfoServices.upsertEmergencyContact({...rest, id, userId});

    // Update the application with the new or updated emergency contact information
    const updatedApplication = await prismaClient.application.update({
      where: { id: applicationId },
      data: {
        emergencyInfo: {
          connect: { id: emergencyInfo.id },
        },
      },
    });
    await this.incrementStepCompleted(applicationId, "emergencyInfo");
    return { ...emergencyInfo, ...updatedApplication };
  }
  createOrUpdateReferees = async (data: RefreeIF) => {
    const { id, applicationId, ...rest } = data;

    // Upsert the emergency contact information
    const refereesInfo = await RefereesServices.upsertRefereeInfo({ ...rest, id });

    // Update the application with the new or updated referee information
    const updatedApplication = await prismaClient.application.update({
      where: { id: applicationId },
      data: {
        referee: {
          connect: { id: refereesInfo.id },
        },
      },
    });
    await this.incrementStepCompleted(applicationId, "refereeInfo");
    return { ...refereesInfo, ...updatedApplication };
  }

  createOrUpdateApplicationDoc = async (data: AppDocumentIF) => {
    const { id, applicationId, ...rest } = data;
    const docInfo = await prismaClient.document.upsert({
      where: { id: id ?? '' },
      update: {
        ...rest,
        application: {
          connect: { id: applicationId },
        },
      },
      create: {
        ...rest,
        application: {
          connect: { id: applicationId },
        },
      },
    });

    // Update the application with the new or updated document info
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
      }
    });
    await this.incrementStepCompleted(applicationId, "documents");
    return { ...docInfo, ...updatedApplication };
  }


  createOrUpdateResidentialInformation = async (data: ResidentialInformationIF) => {
    const { userId, applicationId, ...rest } = data;
    // Upsert residentialInformation with prevAddresses connected
    let resInfo = await ResidentialinfoServices.upsertResidentialInformation({...rest, userId});
    
    // Update the application with the new or updated residential info
    const updatedApplication = await prismaClient.application.update({
      where: { id: applicationId },
      data: {
        residentialInfo: {
          connect: { id: resInfo.id },
        },
      },
    });
    await this.incrementStepCompleted(applicationId, "residentialInfo");
    return { ...resInfo, ...updatedApplication };
  }

  createOrUpdateEmploymentInformation = async (data: EmploymentInformationIF) => {
    const { id, applicationId, userId, ...rest } = data;
    const empInfo = await EmploymentinfoServices.upsertEmploymentInfo({...rest, id, userId});
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
    await this.incrementStepCompleted(applicationId, "employmentInfo");
    return { ...empInfo, ...updatedApplication };

  }

  deleteApplicant = async (id: string) => {
    return await prismaClient.application.update({
      where: { id },
      data: {
        isDeleted: true
      }
    });
  }
  getPendingApplicationsForLandlord = async (landlordId: string) => {
    return await prismaClient.application.findMany({
      where: {
        status: ApplicationStatus.PENDING,
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
      },
    });
  }
  getCompletedApplications = async (landlordId: string) => {
    return await prismaClient.application.findMany({
      where: {
        status: ApplicationStatus.COMPLETED,
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
      },
    });
  }

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
    return await prismaClient.application.findUnique({
      where: { id: applicationId, status: ApplicationStatus.COMPLETED },
    });
  }

  getApplicationBasedOnStatus = async (userId: string, status: ApplicationStatus) => {

    return await prismaClient.application.findMany({
      where: {
        userId: userId,
        status,
        isDeleted: false,
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
      },
    });
  }

  // statistics
  countApplicationStatsForLandlord = async (landlordId: string) => {
    const pendingCount = await prismaClient.application.count({
      where: {
        status: ApplicationStatus.PENDING,
        isDeleted: false,
        properties: {
          landlordId: landlordId,
          isDeleted: false,
        },
      },
    });

    const approvedCount = await prismaClient.application.count({
      where: {
        status: ApplicationStatus.ACCEPTED,
        isDeleted: false,
        properties: {
          landlordId: landlordId,
          isDeleted: false,
        },
      },
    });

    const completedCount = await prismaClient.application.count({
      where: {
        status: ApplicationStatus.COMPLETED,
        isDeleted: false,
        properties: {
          landlordId: landlordId,
          isDeleted: false,
        },
      },
    });

    return {
      pending: pendingCount,
      approved: approvedCount,
      completed: completedCount,
    };
  }

  approveApplication = async (tenantData: any) => {
    return await userServices.createUser({ ...tenantData, role: userRoles.TENANT });
  }
}

export default new ApplicantService();