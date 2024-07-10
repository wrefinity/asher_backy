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
    }
    const personalDetailsData: ApplicantPersonalDetailsIF = {
      title,
      firstName,
      middleName: middleName || null,
      lastName,
      dob,
      phoneNumber,
      maritalStatus,
    }

    // Perform upsert for applicantPersonalDetails and include nextOfKin
    const upsertedPersonalDetails = await prismaClient.applicantPersonalDetails.upsert({
      where: { email },
      update: {
        ...personalDetailsData,
        nextOfKin: {
          upsert: {
            where: { id: nextOfKin.id || undefined },
            update: {
              ...nextOfKinData
            },
            create: {
              ...nextOfKinData
            },
          },
        },
      },
      create: {
        title,
        firstName,
        middleName: middleName || null,
        lastName,
        dob,
        email,
        phoneNumber,
        maritalStatus,
        nextOfKin: {
          create: {
            ...nextOfKinData
          },
        },
      },
      include: {
        nextOfKin: true,
      },
    });

    await prismaClient.application.create({
      data: {
        propertiesId,
        userId,
        applicantPersonalDetailsId: upsertedPersonalDetails.id,
      },
    });
    return upsertedPersonalDetails;
  }

  async createOrUpdateGuarantor(data: GuarantorInformationIF) {
    const { id, ...rest } = data;
    const guarantorInfo = await prismaClient.guarantorInformation.upsert({
      where: { id: id ?? '' },
      update: rest,
      create: { id, ...rest },
    });
    // Find the application associated with the guarantor
    await prismaClient.application.findUnique({
      where: { id: rest.applicationId },
      include: { guarantorInformation: true }, // Include the current guarantor information
    });

    // Update the application with the new or updated guarantor information
    const updatedApplication = await prismaClient.application.update({
      where: { id: rest.applicationId },
      data: {
        guarantorInformation: {
          connect: { id: guarantorInfo.id },
        },
      },
    });
    return {...guarantorInfo, ...updatedApplication};
  }

  async createOrUpdateEmergencyContact(data: EmergencyContactIF) {
    const { id, ...rest } = data;
    const emergencyInfo = await prismaClient.emergencyContact.upsert({
      where: { id: id ?? '' },
      update: rest,
      create: { id, ...rest },
    });
    // Update the application with the new or updated guarantor information
    const updatedApplication = await prismaClient.application.update({
      where: { id: rest.applicationId },
      data: {
        emergencyContact: {
          connect: { id: emergencyInfo.id },
        },
      },
    });
    return {...emergencyInfo, ...updatedApplication};
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
      include:{
        documents: true,
        guarantorInformation: true,
        emergencyContact: true,
        personalDetails: true,
      }
    });
    return {...docInfo, ...updatedApplication};
  }

  async createOrUpdatePrevAddresses(prevAddressesInput: PrevAddressIF[]) {
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

  async createOrUpdateResidentialInformation(data: ResidentialInformationIF) {
    const { id, prevAddresses, ...rest } = data;

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
      where: { id: rest.applicationId },
      data: {
        documents: {
          connect: { id: resInfo.id },
        },
      },
      include:{
        residentialInformation: true,
      }
    });
    return {...resInfo, ...updatedApplication};
  }

  async createOrUpdateEmploymentInformation(data: EmploymentInformationIF) {
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

     // Update the application with the new or updated residential info
     const updatedApplication = await prismaClient.application.update({
      where: { id: applicationId },
      data: {
        documents: {
          connect: { id: empInfo.id },
        },
      },
      include:{
        employmentInformations:true
      }
    });
    return {...empInfo, ...updatedApplication};

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
      data:{
        isDeleted:true
      }
    });
  }

  async getApplicationById(applicationId: string) {
    return await prismaClient.application.findUnique({
      where: { id: applicationId },
      include: {
        user: true,
        residentialInformation: {
          include: {
            prevAddresses: true,
            user: true,
          },
        },
        guarantorInformation: true,
        emergencyContact: true,
        documents: true,
        employmentInformations: true,
        properties: true,
        personalDetails: {
          include: {
            nextOfKin: true,
          },
        },
      },
    });
  }
}

export default new ApplicantService();
