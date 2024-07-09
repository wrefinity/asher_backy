
import { prismaClient } from "../..";

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
        residentialInformation: {
          create: data.residentialInformation
        },
        guarantorInformation: {
          create: data.guarantorInformation
        },
        emergencyContact: {
          create: data.emergencyContact
        },
        documents: {
          create: data.documents
        },
        employmentInformations: {
          create: data.employmentInformations
        },
        nextOfKin: {
          create: data.nextOfKin
        }
      },
      include: {
        residentialInformation: true,
        guarantorInformation: true,
        emergencyContact: true,
        documents: true,
        employmentInformations: true,
        nextOfKin: true
      }
    });

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
