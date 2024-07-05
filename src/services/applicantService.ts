
import { prismaClient } from "..";

class ApplicantService {

  async createApplicant(data: any) {
    // Create the applicant first
    const applicant = await prismaClient.applicant.create({
      data: {
        title: data.title,
        firstName: data.firstName,
        middleName: data.middleName,
        lastName: data.lastName,
        dob: new Date(data.dob),
        email: data.email,
        phoneNumber: data.phoneNumber,
        maritalStatus: data.maritalStatus,
        leaseStartDate: new Date(data.leaseStartDate),
        leaseEndDate: new Date(data.leaseEndDate),
        moveInDate: new Date(data.moveInDate),
        rentAmount: data.rentAmount,
        securityDeposit: data.securityDeposit,
        leaseTerm: data.leaseTerm,
        userId: data.userId,
      },
    });

    const applicantId = applicant.id;

    // Create related models and link them to the applicant
    if (data.residentialInformation && data.residentialInformation.length > 0) {
      await prismaClient.residentialInformation.createMany({
        data: data.residentialInformation.map((info: any) => ({
          ...info,
          applicantId,
        })),
      });
    }

    if (data.guarantorInformation && data.guarantorInformation.length > 0) {
      await prismaClient.guarantorInformation.createMany({
        data: data.guarantorInformation.map((info: any) => ({
          ...info,
          applicantId,
        })),
      });
    }

    if (data.emergencyContact && data.emergencyContact.length > 0) {
      await prismaClient.emergencyContact.createMany({
        data: data.emergencyContact.map((contact: any) => ({
          ...contact,
          applicantId,
        })),
      });
    }

    if (data.documents && data.documents.length > 0) {
      await prismaClient.document.createMany({
        data: data.documents.map((doc: any) => ({
          ...doc,
          applicantId,
        })),
      });
    }

    if (data.employmentInformations && data.employmentInformations.length > 0) {
      await prismaClient.employmentInformation.createMany({
        data: data.employmentInformations.map((info: any) => ({
          ...info,
          applicantId,
        })),
      });
    }

    if (data.nextOfKin && data.nextOfKin.length > 0) {
      await prismaClient.nextOfKin.createMany({
        data: data.nextOfKin.map((kin: any) => ({
          ...kin,
          applicantId,
        })),
      });
    }
    return applicant;
  }


  async getApplicant(id: number) {
    return await prismaClient.applicant.findUnique({
      where: { id },
      include: {
        residentialInformation: true,
        guarantorInformation: true,
        emergencyContact: true,
        documents: true,
        employmentInformations: true,
        nextOfKin: true,
      },
    });
  }

  async updateApplicant(id: number, data: any) {
    return await prismaClient.applicant.update({
      where: { id },
      data: {
        ...data,
        dob: new Date(data.dob),
        leaseStartDate: new Date(data.leaseStartDate),
        leaseEndDate: new Date(data.leaseEndDate),
        moveInDate: new Date(data.moveInDate),
      },
    });
  }

  async deleteApplicant(id: number) {
    return await prismaClient.applicant.delete({
      where: { id },
    });
  }
}

export default new ApplicantService();
