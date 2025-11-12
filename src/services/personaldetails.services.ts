import { prismaClient } from "..";
import { ApplicantPersonalDetailsIF } from "../webuser/schemas/types";
import { Prisma } from "@prisma/client/default";
class ApplicantPersonalDetailsService {
  // Upsert Applicant Personal Details
  upsertApplicantPersonalDetails = async (data: ApplicantPersonalDetailsIF) => {
    const { id, userId, nextOfKin, ...rest } = data;
  
    const inputData: Prisma.applicantPersonalDetailsCreateInput = {
      ...rest,
      user: userId ? { connect: { id: userId as string } } : null, // Handle user relation
      email: data.email || "", // Fallback for optional email
      nextOfKin: nextOfKin
        ? { connect: { id: nextOfKin.id as string } } // Handle nextOfKin relation
        : undefined,
    };
  
    if (id) {
      // Check if record exists
      const existingRecord = await this.getApplicantPersonalDetailsById(id);
  
      if (!existingRecord) {
        throw new Error(`Applicant Personal Details with ID ${id} does not exist.`);
      }
  
      // Update record
      return await prismaClient.applicantPersonalDetails.update({
        where: { id },
        data: inputData as Prisma.applicantPersonalDetailsUpdateInput, // Ensure typing
      });
    } else {
      // Create new record
      return await prismaClient.applicantPersonalDetails.create({
        data: inputData,
      });
    }
  };
  
  

  // Get Applicant Personal Details by ID
  getApplicantPersonalDetailsById = async (id: string) => {
    return await prismaClient.applicantPersonalDetails.findUnique({
      where: { id },
    });
  };

  // Get Applicant Personal Details by email
  getApplicantPersonalDetailsByEmail = async (email: string) => {
    return await prismaClient.applicantPersonalDetails.findFirst({
      where: { email },
    });
  };

  // Get Applicant Personal Details by userId
  getApplicantPersonalDetailsByUserId = async (userId: string) => {
    return await prismaClient.applicantPersonalDetails.findMany({
      where: {
        userId: userId,
      },
    });
  };


  // Delete Applicant Personal Details by ID
  deleteApplicantPersonalDetailsById = async (id: string) => {
    return await prismaClient.applicantPersonalDetails.delete({
      where: { id },
    });
  };

  // Get Next of Kin for Applicant Personal Details
  getNextOfKinForApplicant = async (applicantId: string) => {
    return await prismaClient.nextOfKin.findMany({
      where: { applicantPersonalDetailsId: applicantId },
    });
  };
}

export default new ApplicantPersonalDetailsService();
