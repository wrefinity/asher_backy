import { prismaClient } from "../..";
import { ApplicationStatus } from '@prisma/client';
import {
  NextOfKinIF,
  ApplicantPersonalDetailsIF,
  GuarantorInformationIF,
  EmergencyContactIF,
  AppDocumentIF,
  ResidentialInformationIF,
  PrevAddressIF,
  EmploymentInformationIF
} from "../schemas/types"


class ApplicantService {


  createOrUpdatePersonalDetails = async (data: ApplicantPersonalDetailsIF, propertiesId: string, userId: string) => {
    const {
      title,
      firstName,
      middleName,
      lastName,
      dob,
      email,
      phoneNumber,
      maritalStatus,
      nextOfKin,
    } = data;

    const nextOfKinData: NextOfKinIF = {
      firstName: nextOfKin.firstName,
      lastName: nextOfKin.lastName,
      relationship: nextOfKin.relationship,
      email: nextOfKin.email,
      phoneNumber: nextOfKin.phoneNumber,
      middleName: nextOfKin.middleName || null,
    };

    // Ensure dob is a valid ISO-8601 DateTime string
    //  Ensure dob is a valid Date object
    // let dobDate: Date;
    // try {
    //   dobDate = parseISO(dob);
    //   if (isNaN(dobDate.getTime())) {
    //     throw new Error('Invalid date format for dob');
    //   }
    // } catch (error) {
    //   throw new Error('Invalid date format for dob');
    // }

    // Upsert nextOfKin first
    const upsertedNextOfKin = await prismaClient.nextOfKin.upsert({
      where: { id: nextOfKin.id || '' },
      update: {
        ...nextOfKinData,
      },
      create: {
        ...nextOfKinData,
      },
    });

    // Then upsert applicantPersonalDetails
    const personalDetailsData: ApplicantPersonalDetailsIF = {
      title,
      firstName,
      middleName: middleName || null,
      lastName,
      dob,
      phoneNumber,
      maritalStatus,
    };

    const upsertedPersonalDetails = await prismaClient.applicantPersonalDetails.upsert({
      where: { email },
      update: {
        ...personalDetailsData,
        nextOfKin: {
          connect: { id: upsertedNextOfKin.id },
        },
      },
      create: {
        ...personalDetailsData,
        email,
        nextOfKin: {
          connect: { id: upsertedNextOfKin.id },
        },
      },
      include: {
        nextOfKin: true,
      },
    });

    // Create application record
    await prismaClient.application.create({
      data: {
        propertiesId,
        userId,
        applicantPersonalDetailsId: upsertedPersonalDetails.id,
      },
    });

    return upsertedPersonalDetails;
  };

  createOrUpdateGuarantor = async (data: GuarantorInformationIF) => {
    const { id, applicationId, ...rest } = data;
    const guarantorInfo = await prismaClient.guarantorInformation.upsert({
      where: { id: id ?? '' },
      update: rest,
      create: { id, ...rest },
    });
    // Find the application associated with the guarantor
    await prismaClient.application.findUnique({
      where: { id: applicationId },
      include: { guarantorInformation: true }, // Include the current guarantor information
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
    const { id, applicationId, ...rest } = data;

    // Upsert the emergency contact information
    const emergencyInfo = await prismaClient.emergencyContact.upsert({
      where: { id: id ?? '' },
      update: rest,
      create: { id, ...rest },
    });

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
    return { ...docInfo, ...updatedApplication };
  }

  createOrUpdatePrevAddresses = async (prevAddressesInput: PrevAddressIF[]) => {
    const prevAddresses = await Promise.all(prevAddressesInput.map(async (input) => {
      const { id, ...rest } = input;
      return await prismaClient.prevAddress.upsert({
        where: { id: id ?? '' },
        update: rest,
        create: rest,
      });
    }));
    return prevAddresses;
  }

  createOrUpdateResidentialInformation = async (data: ResidentialInformationIF) => {
    const { id, prevAddresses, applicationId, ...rest } = data;

    let resInfo = null;
    if (prevAddresses && prevAddresses.length > 0) {
      // Create or update prevAddresses and collect their IDs
      const prevAddressesRes = await this.createOrUpdatePrevAddresses(prevAddresses);
      const prevAddressesConnect = prevAddressesRes.map((prevAddress) => ({
        id: prevAddress.id,
      }));

      // Upsert residentialInformation with prevAddresses connected
      resInfo = await prismaClient.residentialInformation.upsert({
        where: { id: id ?? '' },
        update: {
          ...rest,
          prevAddresses: {
            set: prevAddressesConnect,
          },
        },
        create: {
          ...rest,
          prevAddresses: {
            connect: prevAddressesConnect,
          },
        },
      });
    } else {
      // No prevAddresses provided, directly upsert residentialInformation
      resInfo = await prismaClient.residentialInformation.upsert({
        where: { id: id ?? '' },
        update: rest,
        create: rest,
      });
    }

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

  createOrUpdateEmploymentInformation = async (data: EmploymentInformationIF) => {
    const { id, applicationId, ...rest } = data;
    const empInfo = await prismaClient.employmentInformation.upsert({
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

  async updateApplicationStatus(applicationId: string) {
    return await prismaClient.application.update({
      where: { id: applicationId },
      data: {
        status: ApplicationStatus.COMPLETED,
      },
    });
  }

  async deleteApplicant(id: string) {
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

  checkApplicationCompleted = async (applicationId: string) => {
    // Check if the application completed
    return await prismaClient.application.findUnique({
      where: { id: applicationId, status: ApplicationStatus.COMPLETED },
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
}

export default new ApplicantService();
